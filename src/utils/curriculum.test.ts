import { describe, it, expect } from 'vitest';
import type { Card, ReviewLog, SessionConfig } from '../types';
import {
  identifyWeakTags,
  identifyStrongTags,
  getDueCards,
  getNewCards,
  getWeakTagCards,
  getConfidenceRecoveryCard,
  selectNextCard,
  calculateMix,
  createSessionState,
  updateSessionState,
  calculateSessionStats,
  analyzeSessionTagPerformance,
  generateSessionInsights,
  CONFIDENCE_RECOVERY_THRESHOLD,
} from './curriculum';

// Helper to create test cards
function createCard(overrides: Partial<Card> = {}): Card {
  return {
    id: overrides.id || 'card-' + Math.random().toString(36).substr(2, 9),
    type: 'BASIC',
    front: 'test',
    back: 'test',
    tags: overrides.tags || [],
    ease: overrides.ease || 2.5,
    intervalDays: overrides.intervalDays || 1,
    reps: overrides.reps || 0,
    dueAt: overrides.dueAt || Date.now() - 1000, // Due by default
    lapses: overrides.lapses || 0,
    createdAt: overrides.createdAt || Date.now() - 86400000,
    updatedAt: overrides.updatedAt || Date.now(),
    ...overrides,
  };
}

// Helper to create test reviews
function createReview(overrides: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: overrides.id || 'review-' + Math.random().toString(36).substr(2, 9),
    cardId: overrides.cardId || 'card-1',
    reviewedAt: overrides.reviewedAt || Date.now() - 86400000,
    grade: overrides.grade || 'good',
    previousInterval: 1,
    newInterval: 3,
    previousDueAt: Date.now() - 86400000,
    newDueAt: Date.now() + 86400000 * 3,
    ...overrides,
  };
}

describe('identifyWeakTags', () => {
  it('returns empty array when no cards', () => {
    expect(identifyWeakTags([], [])).toEqual([]);
  });

  it('returns empty array when no weak tags meet criteria', () => {
    const cards = [
      createCard({ id: 'c1', tags: ['food'] }),
      createCard({ id: 'c2', tags: ['food'] }),
      createCard({ id: 'c3', tags: ['food'] }),
      createCard({ id: 'c4', tags: ['food'] }),
      createCard({ id: 'c5', tags: ['food'] }),
    ];
    // 90% success rate (9 good, 1 again)
    const reviews = [
      ...Array(9).fill(null).map((_, i) => createReview({ cardId: `c${(i % 5) + 1}`, grade: 'good' })),
      createReview({ cardId: 'c1', grade: 'again' }),
    ];

    expect(identifyWeakTags(cards, reviews)).toEqual([]);
  });

  it('identifies weak tags below threshold', () => {
    const cards = [
      createCard({ id: 'c1', tags: ['verbs'] }),
      createCard({ id: 'c2', tags: ['verbs'] }),
      createCard({ id: 'c3', tags: ['verbs'] }),
      createCard({ id: 'c4', tags: ['verbs'] }),
      createCard({ id: 'c5', tags: ['verbs'] }),
    ];
    // 50% success rate (5 good, 5 again)
    const reviews = [
      ...Array(5).fill(null).map((_, i) => createReview({ cardId: `c${(i % 5) + 1}`, grade: 'good' })),
      ...Array(5).fill(null).map((_, i) => createReview({ cardId: `c${(i % 5) + 1}`, grade: 'again' })),
    ];

    const weak = identifyWeakTags(cards, reviews);
    expect(weak).toContain('verbs');
  });

  it('ignores tags with fewer than minimum cards', () => {
    const cards = [
      createCard({ id: 'c1', tags: ['tiny'] }),
      createCard({ id: 'c2', tags: ['tiny'] }),
      createCard({ id: 'c3', tags: ['tiny'] }), // Only 3 cards
    ];
    // 33% success rate
    const reviews = [
      createReview({ cardId: 'c1', grade: 'good' }),
      createReview({ cardId: 'c2', grade: 'again' }),
      createReview({ cardId: 'c3', grade: 'again' }),
    ];

    const weak = identifyWeakTags(cards, reviews);
    expect(weak).not.toContain('tiny');
  });

  it('sorts weak tags by lowest success rate first', () => {
    const cards = [
      // Tag 'worst' - 5 cards, will have 20% success
      ...Array(5).fill(null).map((_, i) => createCard({ id: `worst-${i}`, tags: ['worst'] })),
      // Tag 'bad' - 5 cards, will have 40% success
      ...Array(5).fill(null).map((_, i) => createCard({ id: `bad-${i}`, tags: ['bad'] })),
    ];

    const reviews = [
      // worst: 1 success, 4 fails = 20%
      createReview({ cardId: 'worst-0', grade: 'good' }),
      ...Array(4).fill(null).map((_, i) => createReview({ cardId: `worst-${i + 1}`, grade: 'again' })),
      // bad: 2 successes, 3 fails = 40%
      createReview({ cardId: 'bad-0', grade: 'good' }),
      createReview({ cardId: 'bad-1', grade: 'good' }),
      ...Array(3).fill(null).map((_, i) => createReview({ cardId: `bad-${i + 2}`, grade: 'again' })),
    ];

    const weak = identifyWeakTags(cards, reviews);
    expect(weak[0]).toBe('worst');
    expect(weak[1]).toBe('bad');
  });
});

describe('identifyStrongTags', () => {
  it('identifies tags with high success rate', () => {
    const cards = [
      createCard({ id: 'c1', tags: ['strong'] }),
      createCard({ id: 'c2', tags: ['strong'] }),
      createCard({ id: 'c3', tags: ['strong'] }),
    ];
    // 90% success rate
    const reviews = [
      ...Array(9).fill(null).map((_, i) => createReview({ cardId: `c${(i % 3) + 1}`, grade: 'good' })),
      createReview({ cardId: 'c1', grade: 'again' }),
    ];

    const strong = identifyStrongTags(cards, reviews);
    expect(strong).toContain('strong');
  });

  it('excludes tags below threshold', () => {
    const cards = [
      createCard({ id: 'c1', tags: ['medium'] }),
      createCard({ id: 'c2', tags: ['medium'] }),
      createCard({ id: 'c3', tags: ['medium'] }),
    ];
    // 75% success rate
    const reviews = [
      ...Array(3).fill(null).map((_, i) => createReview({ cardId: `c${(i % 3) + 1}`, grade: 'good' })),
      createReview({ cardId: 'c1', grade: 'again' }),
    ];

    const strong = identifyStrongTags(cards, reviews);
    expect(strong).not.toContain('medium');
  });
});

describe('getDueCards', () => {
  it('returns cards past due date', () => {
    const now = Date.now();
    const cards = [
      createCard({ id: 'due1', dueAt: now - 1000 }),
      createCard({ id: 'due2', dueAt: now - 86400000 }),
      createCard({ id: 'notDue', dueAt: now + 86400000 }),
    ];

    const due = getDueCards(cards, now);
    expect(due.length).toBe(2);
    expect(due.map((c) => c.id)).toContain('due1');
    expect(due.map((c) => c.id)).toContain('due2');
    expect(due.map((c) => c.id)).not.toContain('notDue');
  });
});

describe('getNewCards', () => {
  it('returns cards with 0 reps', () => {
    const cards = [
      createCard({ id: 'new1', reps: 0 }),
      createCard({ id: 'new2', reps: 0 }),
      createCard({ id: 'learned', reps: 3 }),
    ];

    const newCards = getNewCards(cards);
    expect(newCards.length).toBe(2);
    expect(newCards.map((c) => c.id)).not.toContain('learned');
  });
});

describe('getWeakTagCards', () => {
  it('returns cards from weak tags not yet reviewed', () => {
    const cards = [
      createCard({ id: 'c1', tags: ['weak'] }),
      createCard({ id: 'c2', tags: ['weak'] }),
      createCard({ id: 'c3', tags: ['strong'] }),
    ];

    const reviewed = new Set(['c1']);
    const weakCards = getWeakTagCards(cards, ['weak'], reviewed);

    expect(weakCards.length).toBe(1);
    expect(weakCards[0].id).toBe('c2');
  });
});

describe('getConfidenceRecoveryCard', () => {
  it('returns card from strong tag', () => {
    const cards = [
      createCard({ id: 'strong1', tags: ['strong'], intervalDays: 14 }),
      createCard({ id: 'weak1', tags: ['weak'], intervalDays: 1 }),
    ];

    const card = getConfidenceRecoveryCard(cards, ['strong'], new Set());
    expect(card?.id).toBe('strong1');
  });

  it('prefers well-learned cards', () => {
    const cards = [
      createCard({ id: 'wellLearned', tags: ['strong'], intervalDays: 21 }),
      createCard({ id: 'lessLearned', tags: ['strong'], intervalDays: 3 }),
    ];

    const card = getConfidenceRecoveryCard(cards, ['strong'], new Set());
    expect(card?.id).toBe('wellLearned');
  });

  it('falls back to any well-learned card if no strong tag cards', () => {
    const cards = [
      createCard({ id: 'wellLearned', tags: ['other'], intervalDays: 21 }),
    ];

    const card = getConfidenceRecoveryCard(cards, ['strong'], new Set());
    expect(card?.id).toBe('wellLearned');
  });

  it('returns null if no suitable cards', () => {
    const cards = [
      createCard({ id: 'weak', tags: ['weak'], intervalDays: 1 }),
    ];

    const card = getConfidenceRecoveryCard(cards, ['strong'], new Set());
    expect(card).toBeNull();
  });
});

describe('calculateMix', () => {
  it('distributes cards according to weights', () => {
    const dueCards = Array(20).fill(null).map((_, i) => createCard({ id: `due-${i}` }));
    const weakTagCards = Array(20).fill(null).map((_, i) => createCard({ id: `weak-${i}` }));
    const newCards = Array(20).fill(null).map((_, i) => createCard({ id: `new-${i}` }));

    const mix = calculateMix(dueCards, weakTagCards, newCards, 20);

    // Default weights: 60/25/15
    expect(mix.due).toBe(12); // 60% of 20
    expect(mix.weakTag).toBe(5); // 25% of 20
    expect(mix.new).toBe(3); // 15% of 20
  });

  it('clamps to available cards', () => {
    const dueCards = Array(5).fill(null).map((_, i) => createCard({ id: `due-${i}` }));
    const weakTagCards: Card[] = [];
    const newCards = Array(2).fill(null).map((_, i) => createCard({ id: `new-${i}` }));

    const mix = calculateMix(dueCards, weakTagCards, newCards, 20);

    expect(mix.due).toBe(5); // Only 5 available
    expect(mix.weakTag).toBe(0); // None available
    expect(mix.new).toBe(2); // Only 2 available
  });

  it('redistributes to fill target when possible', () => {
    const dueCards = Array(20).fill(null).map((_, i) => createCard({ id: `due-${i}` }));
    const weakTagCards: Card[] = [];
    const newCards: Card[] = [];

    const mix = calculateMix(dueCards, weakTagCards, newCards, 10);

    expect(mix.due).toBe(10); // All slots filled by due
    expect(mix.weakTag).toBe(0);
    expect(mix.new).toBe(0);
  });

  it('returns zeros when no cards available', () => {
    const mix = calculateMix([], [], [], 20);
    expect(mix).toEqual({ due: 0, weakTag: 0, new: 0 });
  });
});

describe('selectNextCard', () => {
  it('returns null when session target reached', () => {
    const config: SessionConfig = { mode: 'smart', targetCards: 2 };
    const state = createSessionState(config, [createCard()], []);
    state.reviewedInSession.add('card1');
    state.reviewedInSession.add('card2');

    const card = selectNextCard(state);
    expect(card).toBeNull();
  });

  it('returns confidence recovery card after consecutive failures', () => {
    const strongCard = createCard({ id: 'strong', tags: ['strong'], intervalDays: 21 });
    const weakCard = createCard({ id: 'weak', tags: ['weak'], intervalDays: 1 });
    const cards = [strongCard, weakCard];

    // Create reviews that make 'strong' actually strong
    const reviews = Array(10).fill(null).map(() =>
      createReview({ cardId: 'strong', grade: 'good' })
    );

    const config: SessionConfig = { mode: 'smart', targetCards: 10, enableConfidenceRecovery: true };
    const state = createSessionState(config, cards, reviews);
    state.consecutiveFailures = CONFIDENCE_RECOVERY_THRESHOLD;

    // Should select the strong card for recovery
    const card = selectNextCard(state);
    expect(card?.id).toBe('strong');
  });

  it('handles due-only mode', () => {
    const dueCard = createCard({ id: 'due', dueAt: Date.now() - 1000 });
    const notDueCard = createCard({ id: 'notDue', dueAt: Date.now() + 86400000 });
    const cards = [dueCard, notDueCard];

    const config: SessionConfig = { mode: 'due-only', targetCards: 10 };
    const state = createSessionState(config, cards, []);

    const card = selectNextCard(state);
    expect(card?.id).toBe('due');
  });

  it('handles tag-focus mode', () => {
    const targetCard = createCard({ id: 'target', tags: ['focus'] });
    const otherCard = createCard({ id: 'other', tags: ['other'] });
    const cards = [targetCard, otherCard];

    const config: SessionConfig = { mode: 'tag-focus', targetCards: 10, tagFocus: 'focus' };
    const state = createSessionState(config, cards, []);

    const card = selectNextCard(state);
    expect(card?.id).toBe('target');
  });

  it('returns null when no cards available', () => {
    const config: SessionConfig = { mode: 'smart', targetCards: 10 };
    const state = createSessionState(config, [], []);

    const card = selectNextCard(state);
    expect(card).toBeNull();
  });
});

describe('updateSessionState', () => {
  it('tracks reviewed cards', () => {
    const config: SessionConfig = { mode: 'smart', targetCards: 10 };
    const state = createSessionState(config, [], []);

    const updated = updateSessionState(state, {
      cardId: 'card1',
      grade: 'good',
      timeMs: 2000,
    });

    expect(updated.reviewedInSession.has('card1')).toBe(true);
    expect(updated.sessionResults.length).toBe(1);
  });

  it('increments consecutive failures on again', () => {
    const config: SessionConfig = { mode: 'smart', targetCards: 10 };
    const state = createSessionState(config, [], []);

    const updated = updateSessionState(state, {
      cardId: 'card1',
      grade: 'again',
      timeMs: 2000,
    });

    expect(updated.consecutiveFailures).toBe(1);
  });

  it('resets consecutive failures on success', () => {
    const config: SessionConfig = { mode: 'smart', targetCards: 10 };
    const state = createSessionState(config, [], []);
    state.consecutiveFailures = 3;

    const updated = updateSessionState(state, {
      cardId: 'card1',
      grade: 'good',
      timeMs: 2000,
    });

    expect(updated.consecutiveFailures).toBe(0);
  });
});

describe('calculateSessionStats', () => {
  it('calculates correct stats', () => {
    const results = [
      { cardId: 'c1', grade: 'good' as const, timeMs: 2000 },
      { cardId: 'c2', grade: 'good' as const, timeMs: 3000 },
      { cardId: 'c3', grade: 'again' as const, timeMs: 5000 },
      { cardId: 'c4', grade: 'easy' as const, timeMs: 1000, wasRecoveryCard: true },
    ];

    const stats = calculateSessionStats(results);

    expect(stats.totalReviewed).toBe(4);
    expect(stats.successCount).toBe(3);
    expect(stats.successRate).toBe(75);
    expect(stats.avgTimeMs).toBe(2750);
    expect(stats.recoveryCardsUsed).toBe(1);
  });

  it('handles empty results', () => {
    const stats = calculateSessionStats([]);

    expect(stats.totalReviewed).toBe(0);
    expect(stats.successRate).toBe(0);
  });
});

describe('analyzeSessionTagPerformance', () => {
  it('calculates per-tag success rates', () => {
    const cards = [
      createCard({ id: 'c1', tags: ['verbs'] }),
      createCard({ id: 'c2', tags: ['verbs'] }),
      createCard({ id: 'c3', tags: ['food'] }),
    ];

    const results = [
      { cardId: 'c1', grade: 'good' as const, timeMs: 2000 },
      { cardId: 'c2', grade: 'again' as const, timeMs: 3000 },
      { cardId: 'c3', grade: 'good' as const, timeMs: 2000 },
    ];

    const analysis = analyzeSessionTagPerformance(results, cards);

    const verbsStats = analysis.find((a) => a.tag === 'verbs');
    expect(verbsStats?.reviewed).toBe(2);
    expect(verbsStats?.successRate).toBe(50);

    const foodStats = analysis.find((a) => a.tag === 'food');
    expect(foodStats?.reviewed).toBe(1);
    expect(foodStats?.successRate).toBe(100);
  });

  it('sorts by lowest success rate first', () => {
    const cards = [
      createCard({ id: 'c1', tags: ['worst'] }),
      createCard({ id: 'c2', tags: ['best'] }),
    ];

    const results = [
      { cardId: 'c1', grade: 'again' as const, timeMs: 2000 },
      { cardId: 'c2', grade: 'good' as const, timeMs: 2000 },
    ];

    const analysis = analyzeSessionTagPerformance(results, cards);

    expect(analysis[0].tag).toBe('worst');
    expect(analysis[1].tag).toBe('best');
  });
});

describe('generateSessionInsights', () => {
  it('generates appropriate insights for good performance', () => {
    const cards = [
      createCard({ id: 'c1', tags: ['verbs'] }),
      createCard({ id: 'c2', tags: ['verbs'] }),
    ];

    const results = [
      { cardId: 'c1', grade: 'good' as const, timeMs: 2000 },
      { cardId: 'c2', grade: 'good' as const, timeMs: 2000 },
    ];

    const insights = generateSessionInsights(results, cards, []);

    expect(insights.some((i) => i.includes('100%'))).toBe(true);
  });

  it('identifies struggled tags', () => {
    const cards = [
      createCard({ id: 'c1', tags: ['hard'] }),
      createCard({ id: 'c2', tags: ['hard'] }),
      createCard({ id: 'c3', tags: ['hard'] }),
    ];

    const results = [
      { cardId: 'c1', grade: 'again' as const, timeMs: 2000 },
      { cardId: 'c2', grade: 'again' as const, timeMs: 2000 },
      { cardId: 'c3', grade: 'good' as const, timeMs: 2000 },
    ];

    const insights = generateSessionInsights(results, cards, ['hard']);

    expect(insights.some((i) => i.includes('hard'))).toBe(true);
  });

  it('mentions recovery cards when used', () => {
    const cards = [createCard({ id: 'c1', tags: [] })];
    const results = [
      { cardId: 'c1', grade: 'good' as const, timeMs: 2000, wasRecoveryCard: true },
    ];

    const insights = generateSessionInsights(results, cards, []);

    expect(insights.some((i) => i.includes('booster'))).toBe(true);
  });
});
