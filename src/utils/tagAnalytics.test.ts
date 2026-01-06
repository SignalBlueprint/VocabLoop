import { describe, it, expect } from 'vitest';
import {
  getTagStats,
  getCardsWithTag,
  compareTagMetric,
  extractAllTags,
  formatEase,
  formatInterval,
  formatSuccessRate,
  formatTimeToMastery,
} from './tagAnalytics';
import type { Card, ReviewLog } from '../types';

// Helper to create a card with specific properties
function createCard(overrides: Partial<Card> = {}): Card {
  const id = `card_${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    type: 'BASIC',
    front: 'test front',
    back: 'test back',
    tags: ['test'],
    ease: 2.5,
    intervalDays: 7,
    reps: 3,
    dueAt: Date.now(),
    lapses: 0,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    updatedAt: Date.now(),
    ...overrides,
  };
}

// Helper to create a review
function createReview(
  cardId: string,
  grade: 'again' | 'hard' | 'good' | 'easy',
  reviewedAt: number,
  newInterval: number
): ReviewLog {
  return {
    id: `review_${Math.random().toString(36).slice(2, 9)}`,
    cardId,
    reviewedAt,
    grade,
    previousInterval: 1,
    newInterval,
    previousDueAt: reviewedAt - 24 * 60 * 60 * 1000,
    newDueAt: reviewedAt + newInterval * 24 * 60 * 60 * 1000,
  };
}

describe('getCardsWithTag', () => {
  it('returns cards matching the tag', () => {
    const cards = [
      createCard({ tags: ['verbs', 'common'] }),
      createCard({ tags: ['nouns'] }),
      createCard({ tags: ['verbs'] }),
    ];

    const verbCards = getCardsWithTag(cards, 'verbs');
    expect(verbCards).toHaveLength(2);
  });

  it('returns empty array for non-existent tag', () => {
    const cards = [createCard({ tags: ['verbs'] })];
    expect(getCardsWithTag(cards, 'adjectives')).toHaveLength(0);
  });
});

describe('getTagStats', () => {
  it('returns zero stats for empty tag', () => {
    const cards = [createCard({ tags: ['other'] })];
    const stats = getTagStats(cards, [], 'verbs');

    expect(stats.tag).toBe('verbs');
    expect(stats.cardCount).toBe(0);
    expect(stats.avgEase).toBe(0);
    expect(stats.successRate).toBe(0);
  });

  it('calculates card count correctly', () => {
    const cards = [
      createCard({ tags: ['verbs'] }),
      createCard({ tags: ['verbs', 'common'] }),
      createCard({ tags: ['nouns'] }),
    ];

    const stats = getTagStats(cards, [], 'verbs');
    expect(stats.cardCount).toBe(2);
  });

  it('calculates average ease correctly', () => {
    const cards = [
      createCard({ tags: ['verbs'], ease: 2.0 }),
      createCard({ tags: ['verbs'], ease: 3.0 }),
    ];

    const stats = getTagStats(cards, [], 'verbs');
    expect(stats.avgEase).toBe(2.5);
  });

  it('calculates average interval correctly', () => {
    const cards = [
      createCard({ tags: ['verbs'], intervalDays: 10 }),
      createCard({ tags: ['verbs'], intervalDays: 20 }),
    ];

    const stats = getTagStats(cards, [], 'verbs');
    expect(stats.avgInterval).toBe(15);
  });

  it('calculates success rate from reviews', () => {
    const card1 = createCard({ tags: ['verbs'] });
    const card2 = createCard({ tags: ['verbs'] });
    const reviews = [
      createReview(card1.id, 'good', Date.now() - 86400000, 3),
      createReview(card1.id, 'good', Date.now() - 86400000 * 2, 1),
      createReview(card2.id, 'again', Date.now() - 86400000, 1),
      createReview(card2.id, 'good', Date.now() - 86400000 * 2, 3),
    ];

    const stats = getTagStats([card1, card2], reviews, 'verbs');
    expect(stats.successRate).toBe(75); // 3 good, 1 again = 75%
  });

  it('only counts reviews for cards with the tag', () => {
    const verbCard = createCard({ tags: ['verbs'] });
    const nounCard = createCard({ tags: ['nouns'] });
    const reviews = [
      createReview(verbCard.id, 'good', Date.now(), 3),
      createReview(nounCard.id, 'again', Date.now(), 1),
    ];

    const stats = getTagStats([verbCard, nounCard], reviews, 'verbs');
    expect(stats.successRate).toBe(100); // Only the verb card review counts
  });

  it('finds most forgotten cards', () => {
    const cards = [
      createCard({ tags: ['verbs'], lapses: 5 }),
      createCard({ tags: ['verbs'], lapses: 3 }),
      createCard({ tags: ['verbs'], lapses: 10 }),
      createCard({ tags: ['verbs'], lapses: 0 }),
    ];

    const stats = getTagStats(cards, [], 'verbs');
    expect(stats.mostForgotten).toHaveLength(3);
    expect(stats.mostForgotten[0].lapses).toBe(10);
    expect(stats.mostForgotten[1].lapses).toBe(5);
    expect(stats.mostForgotten[2].lapses).toBe(3);
  });

  it('excludes cards with 0 lapses from mostForgotten', () => {
    const cards = [
      createCard({ tags: ['verbs'], lapses: 0 }),
      createCard({ tags: ['verbs'], lapses: 0 }),
    ];

    const stats = getTagStats(cards, [], 'verbs');
    expect(stats.mostForgotten).toHaveLength(0);
  });

  it('counts mastered cards correctly', () => {
    const cards = [
      createCard({ tags: ['verbs'], intervalDays: 25 }),
      createCard({ tags: ['verbs'], intervalDays: 21 }),
      createCard({ tags: ['verbs'], intervalDays: 7 }),
    ];

    const stats = getTagStats(cards, [], 'verbs');
    expect(stats.masteredCount).toBe(2);
  });
});

describe('compareTagMetric', () => {
  const tag1: ReturnType<typeof getTagStats> = {
    tag: 'verbs',
    cardCount: 10,
    avgEase: 2.5,
    avgInterval: 14,
    successRate: 85,
    avgTimeToMastery: 30,
    masteredCount: 5,
    mostForgotten: [],
  };

  const tag2: ReturnType<typeof getTagStats> = {
    tag: 'nouns',
    cardCount: 20,
    avgEase: 2.2,
    avgInterval: 7,
    successRate: 70,
    avgTimeToMastery: 45,
    masteredCount: 3,
    mostForgotten: [],
  };

  it('returns 1 when tag1 has higher ease', () => {
    expect(compareTagMetric(tag1, tag2, 'avgEase')).toBe(1);
  });

  it('returns -1 when tag1 has lower ease', () => {
    expect(compareTagMetric(tag2, tag1, 'avgEase')).toBe(-1);
  });

  it('returns 0 for cardCount (neutral metric)', () => {
    expect(compareTagMetric(tag1, tag2, 'cardCount')).toBe(0);
  });

  it('returns 1 when tag1 has shorter time to mastery', () => {
    expect(compareTagMetric(tag1, tag2, 'avgTimeToMastery')).toBe(1);
  });

  it('returns 1 when tag1 has higher success rate', () => {
    expect(compareTagMetric(tag1, tag2, 'successRate')).toBe(1);
  });
});

describe('extractAllTags', () => {
  it('extracts unique tags', () => {
    const cards = [
      createCard({ tags: ['verbs', 'common'] }),
      createCard({ tags: ['nouns', 'common'] }),
      createCard({ tags: ['verbs'] }),
    ];

    const tags = extractAllTags(cards);
    expect(tags).toEqual(['common', 'nouns', 'verbs']);
  });

  it('returns empty array for cards with no tags', () => {
    const cards = [createCard({ tags: [] })];
    expect(extractAllTags(cards)).toEqual([]);
  });

  it('sorts tags alphabetically', () => {
    const cards = [
      createCard({ tags: ['zebra', 'apple', 'mango'] }),
    ];

    const tags = extractAllTags(cards);
    expect(tags).toEqual(['apple', 'mango', 'zebra']);
  });
});

describe('formatEase', () => {
  it('formats ease to 2 decimal places', () => {
    expect(formatEase(2.5)).toBe('2.50');
    expect(formatEase(2.123)).toBe('2.12');
    expect(formatEase(1.3)).toBe('1.30');
  });
});

describe('formatInterval', () => {
  it('formats new cards', () => {
    expect(formatInterval(0)).toBe('New');
  });

  it('formats days', () => {
    expect(formatInterval(1)).toBe('1 day');
    expect(formatInterval(7)).toBe('7 days');
  });

  it('formats months', () => {
    expect(formatInterval(60)).toBe('2.0 mo');
  });

  it('formats years', () => {
    expect(formatInterval(400)).toBe('1.1 yr');
  });
});

describe('formatSuccessRate', () => {
  it('formats as percentage', () => {
    expect(formatSuccessRate(85.5)).toBe('86%');
    expect(formatSuccessRate(100)).toBe('100%');
    expect(formatSuccessRate(0)).toBe('0%');
  });
});

describe('formatTimeToMastery', () => {
  it('returns N/A for 0', () => {
    expect(formatTimeToMastery(0)).toBe('N/A');
  });

  it('formats days', () => {
    expect(formatTimeToMastery(5)).toBe('5 days');
  });

  it('formats weeks', () => {
    expect(formatTimeToMastery(14)).toBe('2.0 wks');
  });

  it('formats months', () => {
    expect(formatTimeToMastery(90)).toBe('3.0 mo');
  });
});
