import type { Card, ReviewLog, SessionConfig, ReviewResult } from '../types';
import { getTagStats, extractAllTags } from './tagAnalytics';

/**
 * Default weights for card selection in smart sessions
 */
export const DEFAULT_WEIGHTS = {
  due: 60,
  weakTag: 25,
  new: 15,
};

/**
 * Weak tag threshold - tags below this success rate are considered weak
 */
export const WEAK_TAG_THRESHOLD = 70;

/**
 * Minimum cards required for a tag to be evaluated as weak
 */
export const WEAK_TAG_MIN_CARDS = 5;

/**
 * Strong tag threshold for confidence recovery
 */
export const STRONG_TAG_THRESHOLD = 85;

/**
 * Number of consecutive failures before triggering confidence recovery
 */
export const CONFIDENCE_RECOVERY_THRESHOLD = 2;

/**
 * Session state for tracking progress during a smart session
 */
export interface SessionState {
  config: SessionConfig;
  allCards: Card[];
  allReviews: ReviewLog[];
  reviewedInSession: Set<string>;
  sessionResults: ReviewResult[];
  consecutiveFailures: number;
  weakTags: string[];
  strongTags: string[];
}

/**
 * Identify weak tags based on success rate criteria.
 * A tag is weak if: successRate < 70% AND cardCount >= 5
 *
 * @param cards - All cards
 * @param reviews - All reviews (ideally last 30 days)
 * @returns Array of weak tag names, sorted by worst first
 */
export function identifyWeakTags(cards: Card[], reviews: ReviewLog[]): string[] {
  const allTags = extractAllTags(cards);
  const weakTags: Array<{ tag: string; successRate: number }> = [];

  for (const tag of allTags) {
    const stats = getTagStats(cards, reviews, tag);

    if (stats.cardCount >= WEAK_TAG_MIN_CARDS && stats.successRate < WEAK_TAG_THRESHOLD) {
      weakTags.push({ tag, successRate: stats.successRate });
    }
  }

  // Sort by lowest success rate first (worst performing)
  weakTags.sort((a, b) => a.successRate - b.successRate);

  return weakTags.map((t) => t.tag);
}

/**
 * Identify strong tags suitable for confidence recovery.
 * A tag is strong if: successRate >= 85% AND cardCount >= 3
 *
 * @param cards - All cards
 * @param reviews - All reviews
 * @returns Array of strong tag names
 */
export function identifyStrongTags(cards: Card[], reviews: ReviewLog[]): string[] {
  const allTags = extractAllTags(cards);
  const strongTags: Array<{ tag: string; successRate: number }> = [];

  for (const tag of allTags) {
    const stats = getTagStats(cards, reviews, tag);

    if (stats.cardCount >= 3 && stats.successRate >= STRONG_TAG_THRESHOLD) {
      strongTags.push({ tag, successRate: stats.successRate });
    }
  }

  // Sort by highest success rate first
  strongTags.sort((a, b) => b.successRate - a.successRate);

  return strongTags.map((t) => t.tag);
}

/**
 * Get cards that are currently due for review
 */
export function getDueCards(cards: Card[], now: number = Date.now()): Card[] {
  return cards.filter((c) => c.dueAt <= now);
}

/**
 * Get new cards that haven't been reviewed yet
 */
export function getNewCards(cards: Card[]): Card[] {
  return cards.filter((c) => c.reps === 0);
}

/**
 * Get cards from weak tags that aren't already reviewed in session
 */
export function getWeakTagCards(
  cards: Card[],
  weakTags: string[],
  reviewedIds: Set<string>
): Card[] {
  return cards.filter(
    (c) => c.tags.some((t) => weakTags.includes(t)) && !reviewedIds.has(c.id)
  );
}

/**
 * Get a confidence recovery card from strong tags.
 * Prefers well-learned cards (intervalDays >= 7).
 */
export function getConfidenceRecoveryCard(
  cards: Card[],
  strongTags: string[],
  reviewedIds: Set<string>
): Card | null {
  // Filter to cards from strong tags that haven't been reviewed
  const strongTagCards = cards.filter(
    (c) => c.tags.some((t) => strongTags.includes(t)) && !reviewedIds.has(c.id)
  );

  if (strongTagCards.length === 0) {
    // Fallback: any well-learned card
    const wellLearnedCards = cards.filter(
      (c) => c.intervalDays >= 14 && !reviewedIds.has(c.id)
    );
    if (wellLearnedCards.length > 0) {
      return wellLearnedCards[Math.floor(Math.random() * wellLearnedCards.length)];
    }
    return null;
  }

  // Prefer cards with intervalDays >= 7
  const wellLearned = strongTagCards.filter((c) => c.intervalDays >= 7);
  const pool = wellLearned.length > 0 ? wellLearned : strongTagCards;

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Weighted random selection from categories
 */
function weightedRandomSelect(
  weights: { type: 'due' | 'weakTag' | 'new'; weight: number; count: number }[]
): 'due' | 'weakTag' | 'new' | null {
  // Filter out categories with 0 cards
  const available = weights.filter((w) => w.count > 0);

  if (available.length === 0) {
    return null;
  }

  const totalWeight = available.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const w of available) {
    random -= w.weight;
    if (random <= 0) {
      return w.type;
    }
  }

  return available[available.length - 1].type;
}

/**
 * Select the next card for a smart session.
 *
 * @param state - Current session state
 * @returns The next card to review, or null if session complete
 */
export function selectNextCard(state: SessionState): Card | null {
  const {
    config,
    allCards,
    reviewedInSession,
    consecutiveFailures,
    weakTags,
    strongTags,
  } = state;

  // Check if session is complete
  if (reviewedInSession.size >= config.targetCards) {
    return null;
  }

  // Check for confidence recovery trigger
  if (
    consecutiveFailures >= CONFIDENCE_RECOVERY_THRESHOLD &&
    config.enableConfidenceRecovery !== false
  ) {
    const recoveryCard = getConfidenceRecoveryCard(allCards, strongTags, reviewedInSession);
    if (recoveryCard) {
      return recoveryCard;
    }
  }

  // Handle tag-focus mode
  if (config.mode === 'tag-focus' && config.tagFocus) {
    const tagCards = allCards.filter(
      (c) => c.tags.includes(config.tagFocus!) && !reviewedInSession.has(c.id)
    );
    if (tagCards.length > 0) {
      // Prioritize due cards within the tag
      const dueTagCards = tagCards.filter((c) => c.dueAt <= Date.now());
      const pool = dueTagCards.length > 0 ? dueTagCards : tagCards;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    return null;
  }

  // Handle due-only mode
  if (config.mode === 'due-only') {
    const dueCards = getDueCards(allCards).filter((c) => !reviewedInSession.has(c.id));
    if (dueCards.length > 0) {
      return dueCards[Math.floor(Math.random() * dueCards.length)];
    }
    return null;
  }

  // Smart mode: weighted selection
  const weights = config.weights || DEFAULT_WEIGHTS;

  const dueCards = getDueCards(allCards).filter((c) => !reviewedInSession.has(c.id));
  const weakTagCards = getWeakTagCards(allCards, weakTags, reviewedInSession);
  const newCards = getNewCards(allCards).filter((c) => !reviewedInSession.has(c.id));

  const category = weightedRandomSelect([
    { type: 'due', weight: weights.due, count: dueCards.length },
    { type: 'weakTag', weight: weights.weakTag, count: weakTagCards.length },
    { type: 'new', weight: weights.new, count: newCards.length },
  ]);

  if (!category) {
    return null;
  }

  let pool: Card[];
  switch (category) {
    case 'due':
      pool = dueCards;
      break;
    case 'weakTag':
      pool = weakTagCards;
      break;
    case 'new':
      pool = newCards;
      break;
    default:
      pool = [];
  }

  if (pool.length === 0) {
    // Fallback to any available card
    const anyAvailable = allCards.filter((c) => !reviewedInSession.has(c.id));
    if (anyAvailable.length === 0) return null;
    return anyAvailable[Math.floor(Math.random() * anyAvailable.length)];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Calculate the planned card mix for a session.
 * Returns the distribution of cards by category.
 *
 * @param dueCards - Available due cards
 * @param weakTagCards - Available weak tag cards
 * @param newCards - Available new cards
 * @param targetCount - Target number of cards for session
 * @param weights - Optional custom weights
 * @returns Object with counts per category
 */
export function calculateMix(
  dueCards: Card[],
  weakTagCards: Card[],
  newCards: Card[],
  targetCount: number,
  weights: { due: number; weakTag: number; new: number } = DEFAULT_WEIGHTS
): { due: number; weakTag: number; new: number } {
  const totalAvailable = dueCards.length + weakTagCards.length + newCards.length;

  if (totalAvailable === 0) {
    return { due: 0, weakTag: 0, new: 0 };
  }

  const actualTarget = Math.min(targetCount, totalAvailable);
  const totalWeight = weights.due + weights.weakTag + weights.new;

  // Calculate ideal distribution
  let dueCount = Math.round((weights.due / totalWeight) * actualTarget);
  let weakTagCount = Math.round((weights.weakTag / totalWeight) * actualTarget);
  let newCount = Math.round((weights.new / totalWeight) * actualTarget);

  // Clamp to available cards
  dueCount = Math.min(dueCount, dueCards.length);
  weakTagCount = Math.min(weakTagCount, weakTagCards.length);
  newCount = Math.min(newCount, newCards.length);

  // Redistribute remaining slots
  let remaining = actualTarget - dueCount - weakTagCount - newCount;

  while (remaining > 0) {
    // Try to add to categories with remaining capacity
    if (dueCount < dueCards.length) {
      dueCount++;
      remaining--;
    } else if (weakTagCount < weakTagCards.length) {
      weakTagCount++;
      remaining--;
    } else if (newCount < newCards.length) {
      newCount++;
      remaining--;
    } else {
      break; // No more capacity
    }
  }

  return { due: dueCount, weakTag: weakTagCount, new: newCount };
}

/**
 * Create a new session state for a smart session.
 */
export function createSessionState(
  config: SessionConfig,
  allCards: Card[],
  allReviews: ReviewLog[]
): SessionState {
  return {
    config,
    allCards,
    allReviews,
    reviewedInSession: new Set(),
    sessionResults: [],
    consecutiveFailures: 0,
    weakTags: identifyWeakTags(allCards, allReviews),
    strongTags: identifyStrongTags(allCards, allReviews),
  };
}

/**
 * Update session state after a review result.
 */
export function updateSessionState(
  state: SessionState,
  result: ReviewResult
): SessionState {
  const newState = { ...state };
  newState.reviewedInSession = new Set(state.reviewedInSession);
  newState.sessionResults = [...state.sessionResults, result];
  newState.reviewedInSession.add(result.cardId);

  // Update consecutive failures counter
  if (result.grade === 'again') {
    newState.consecutiveFailures = state.consecutiveFailures + 1;
  } else {
    newState.consecutiveFailures = 0;
  }

  return newState;
}

/**
 * Calculate session statistics.
 */
export function calculateSessionStats(results: ReviewResult[]): {
  totalReviewed: number;
  successCount: number;
  successRate: number;
  avgTimeMs: number;
  recoveryCardsUsed: number;
} {
  if (results.length === 0) {
    return {
      totalReviewed: 0,
      successCount: 0,
      successRate: 0,
      avgTimeMs: 0,
      recoveryCardsUsed: 0,
    };
  }

  const successCount = results.filter((r) => r.grade !== 'again').length;
  const totalTime = results.reduce((sum, r) => sum + r.timeMs, 0);
  const recoveryCardsUsed = results.filter((r) => r.wasRecoveryCard).length;

  return {
    totalReviewed: results.length,
    successCount,
    successRate: Math.round((successCount / results.length) * 100),
    avgTimeMs: Math.round(totalTime / results.length),
    recoveryCardsUsed,
  };
}

/**
 * Analyze tag performance within a session.
 */
export function analyzeSessionTagPerformance(
  results: ReviewResult[],
  cards: Card[]
): Array<{ tag: string; reviewed: number; successRate: number }> {
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const tagStats = new Map<string, { reviewed: number; successes: number }>();

  for (const result of results) {
    const card = cardMap.get(result.cardId);
    if (!card) continue;

    for (const tag of card.tags) {
      const stats = tagStats.get(tag) || { reviewed: 0, successes: 0 };
      stats.reviewed++;
      if (result.grade !== 'again') {
        stats.successes++;
      }
      tagStats.set(tag, stats);
    }
  }

  const analysis = Array.from(tagStats.entries()).map(([tag, stats]) => ({
    tag,
    reviewed: stats.reviewed,
    successRate: Math.round((stats.successes / stats.reviewed) * 100),
  }));

  // Sort by lowest success rate first
  analysis.sort((a, b) => a.successRate - b.successRate);

  return analysis;
}

/**
 * Generate insight messages based on session results.
 */
export function generateSessionInsights(
  results: ReviewResult[],
  cards: Card[],
  _weakTags: string[]
): string[] {
  const insights: string[] = [];
  const stats = calculateSessionStats(results);
  const tagPerformance = analyzeSessionTagPerformance(results, cards);

  // Performance summary
  if (stats.successRate >= 90) {
    insights.push('Excellent session! You scored ' + stats.successRate + '% success rate.');
  } else if (stats.successRate >= 70) {
    insights.push('Good session with ' + stats.successRate + '% success rate.');
  } else {
    insights.push('Challenging session - ' + stats.successRate + '% success rate. Keep practicing!');
  }

  // Tag struggles
  const struggledTags = tagPerformance.filter((t) => t.successRate < 60 && t.reviewed >= 3);
  for (const tag of struggledTags.slice(0, 2)) {
    insights.push('Struggled with "' + tag.tag + '" (' + tag.successRate + '% success) - more practice recommended.');
  }

  // Strong tags
  const strongPerformance = tagPerformance.filter((t) => t.successRate >= 90 && t.reviewed >= 3);
  if (strongPerformance.length > 0) {
    const strongTag = strongPerformance[0];
    insights.push('Strong performance on "' + strongTag.tag + '" (' + strongTag.successRate + '% success)!');
  }

  // Confidence recovery usage
  if (stats.recoveryCardsUsed > 0) {
    insights.push(stats.recoveryCardsUsed + ' confidence booster card(s) helped during tough moments.');
  }

  // Tomorrow prediction
  if (struggledTags.length > 0) {
    insights.push('Tomorrow\'s session will include more "' + struggledTags[0].tag + '" practice.');
  }

  return insights;
}
