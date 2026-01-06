import type { Card, ReviewLog } from '../types';

/**
 * Statistics for a single tag
 */
export interface TagStats {
  tag: string;
  cardCount: number;
  avgEase: number;              // Average ease factor (1.3-2.5+)
  avgInterval: number;          // Average interval in days
  successRate: number;          // 0-100 percentage
  avgTimeToMastery: number;     // Average days from creation to interval >= 21
  masteredCount: number;        // Cards with interval >= 21 days
  mostForgotten: Card[];        // Top 3 cards by lapses
}

/**
 * Get cards that have a specific tag
 */
export function getCardsWithTag(cards: Card[], tag: string): Card[] {
  return cards.filter((card) => card.tags.includes(tag));
}

/**
 * Calculate comprehensive statistics for a tag.
 *
 * @param cards - All cards
 * @param reviews - All reviews
 * @param tag - Tag to analyze
 * @returns TagStats object with all metrics
 */
export function getTagStats(
  cards: Card[],
  reviews: ReviewLog[],
  tag: string
): TagStats {
  const tagCards = getCardsWithTag(cards, tag);

  if (tagCards.length === 0) {
    return {
      tag,
      cardCount: 0,
      avgEase: 0,
      avgInterval: 0,
      successRate: 0,
      avgTimeToMastery: 0,
      masteredCount: 0,
      mostForgotten: [],
    };
  }

  // Create set of card IDs for efficient lookup
  const tagCardIds = new Set(tagCards.map((c) => c.id));

  // Filter reviews to only those for cards with this tag
  const tagReviews = reviews.filter((r) => tagCardIds.has(r.cardId));

  // Calculate average ease
  const totalEase = tagCards.reduce((sum, card) => sum + card.ease, 0);
  const avgEase = totalEase / tagCards.length;

  // Calculate average interval
  const totalInterval = tagCards.reduce((sum, card) => sum + card.intervalDays, 0);
  const avgInterval = totalInterval / tagCards.length;

  // Calculate success rate from reviews
  let successRate = 0;
  if (tagReviews.length > 0) {
    const successCount = tagReviews.filter((r) => r.grade !== 'again').length;
    successRate = (successCount / tagReviews.length) * 100;
  }

  // Calculate average time to mastery (interval >= 21 days)
  // Only consider cards that have reached mastery
  const masteryThreshold = 21;
  const masteredCards = tagCards.filter((c) => c.intervalDays >= masteryThreshold);
  const masteredCount = masteredCards.length;

  let avgTimeToMastery = 0;
  if (masteredCards.length > 0) {
    // For each mastered card, find when it first reached interval >= 21
    const timesToMastery: number[] = [];

    for (const card of masteredCards) {
      const cardReviews = reviews
        .filter((r) => r.cardId === card.id)
        .sort((a, b) => a.reviewedAt - b.reviewedAt);

      // Find first review where newInterval >= 21
      const masteryReview = cardReviews.find((r) => r.newInterval >= masteryThreshold);
      if (masteryReview) {
        const daysSinceCreation =
          (masteryReview.reviewedAt - card.createdAt) / (24 * 60 * 60 * 1000);
        timesToMastery.push(daysSinceCreation);
      } else {
        // Card is mastered but we don't have the review that pushed it there
        // Estimate based on current state
        const daysSinceCreation =
          (Date.now() - card.createdAt) / (24 * 60 * 60 * 1000);
        timesToMastery.push(daysSinceCreation);
      }
    }

    if (timesToMastery.length > 0) {
      avgTimeToMastery =
        timesToMastery.reduce((sum, t) => sum + t, 0) / timesToMastery.length;
    }
  }

  // Find most forgotten cards (top 3 by lapses)
  const sortedByLapses = [...tagCards].sort((a, b) => b.lapses - a.lapses);
  const mostForgotten = sortedByLapses.slice(0, 3).filter((c) => c.lapses > 0);

  return {
    tag,
    cardCount: tagCards.length,
    avgEase: Math.round(avgEase * 100) / 100,
    avgInterval: Math.round(avgInterval * 10) / 10,
    successRate: Math.round(successRate * 10) / 10,
    avgTimeToMastery: Math.round(avgTimeToMastery),
    masteredCount,
    mostForgotten,
  };
}

/**
 * Compare two tag stats and determine which is better for each metric.
 * Returns 1 if tag1 is better, -1 if tag2 is better, 0 if equal.
 */
export function compareTagMetric(
  tag1: TagStats,
  tag2: TagStats,
  metric: keyof Omit<TagStats, 'tag' | 'mostForgotten'>
): 1 | 0 | -1 {
  const val1 = tag1[metric] as number;
  const val2 = tag2[metric] as number;

  // Higher is better for these metrics
  const higherIsBetter = ['avgEase', 'avgInterval', 'successRate', 'masteredCount'];

  // Lower is better for these metrics
  const lowerIsBetter = ['avgTimeToMastery'];

  // Neutral metrics (comparison doesn't indicate better/worse)
  const neutral = ['cardCount'];

  if (neutral.includes(metric)) {
    return 0;
  }

  if (higherIsBetter.includes(metric)) {
    if (val1 > val2) return 1;
    if (val1 < val2) return -1;
    return 0;
  }

  if (lowerIsBetter.includes(metric)) {
    // Only compare if both have values > 0
    if (val1 === 0 && val2 === 0) return 0;
    if (val1 === 0) return -1; // No data is worse
    if (val2 === 0) return 1;
    if (val1 < val2) return 1;
    if (val1 > val2) return -1;
    return 0;
  }

  return 0;
}

/**
 * Extract all unique tags from cards, sorted alphabetically.
 */
export function extractAllTags(cards: Card[]): string[] {
  const tagSet = new Set<string>();
  for (const card of cards) {
    for (const tag of card.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}

/**
 * Format ease factor for display.
 */
export function formatEase(ease: number): string {
  return ease.toFixed(2);
}

/**
 * Format interval for display.
 */
export function formatInterval(days: number): string {
  if (days === 0) return 'New';
  if (days < 1) return '<1d';
  if (days === 1) return '1 day';
  if (days < 30) return `${Math.round(days)} days`;
  const months = days / 30;
  if (months < 12) return `${months.toFixed(1)} mo`;
  const years = days / 365;
  return `${years.toFixed(1)} yr`;
}

/**
 * Format success rate for display.
 */
export function formatSuccessRate(rate: number): string {
  return `${Math.round(rate)}%`;
}

/**
 * Format time to mastery for display.
 */
export function formatTimeToMastery(days: number): string {
  if (days === 0) return 'N/A';
  if (days < 7) return `${Math.round(days)} days`;
  const weeks = days / 7;
  if (weeks < 8) return `${weeks.toFixed(1)} wks`;
  const months = days / 30;
  return `${months.toFixed(1)} mo`;
}
