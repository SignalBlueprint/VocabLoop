import { describe, it, expect } from 'vitest';
import {
  analyzeReviewsByHour,
  findOptimalHours,
  formatHour,
  generateInsightMessage,
  hasSufficientData,
  getHeatmapColor,
} from './hourlyAnalytics';
import type { ReviewLog } from '../types';

// Helper to create a review at a specific hour
function createReview(hour: number, grade: 'again' | 'hard' | 'good' | 'easy'): ReviewLog {
  const date = new Date('2026-01-01');
  date.setHours(hour, 0, 0, 0);

  return {
    id: `review_${Math.random()}`,
    cardId: 'card_1',
    reviewedAt: date.getTime(),
    grade,
    previousInterval: 1,
    newInterval: grade === 'again' ? 1 : 3,
    previousDueAt: date.getTime() - 86400000,
    newDueAt: date.getTime() + 86400000 * 3,
  };
}

describe('analyzeReviewsByHour', () => {
  it('returns 24 hourly stats objects', () => {
    const stats = analyzeReviewsByHour([]);
    expect(stats).toHaveLength(24);
    expect(stats[0].hour).toBe(0);
    expect(stats[23].hour).toBe(23);
  });

  it('counts reviews correctly by hour', () => {
    const reviews = [
      createReview(8, 'good'),
      createReview(8, 'good'),
      createReview(8, 'again'),
      createReview(14, 'easy'),
    ];

    const stats = analyzeReviewsByHour(reviews);

    expect(stats[8].totalReviews).toBe(3);
    expect(stats[8].successCount).toBe(2); // 2 good, 1 again
    expect(stats[14].totalReviews).toBe(1);
    expect(stats[14].successCount).toBe(1);
  });

  it('calculates success rate correctly', () => {
    const reviews = [
      createReview(9, 'good'),
      createReview(9, 'good'),
      createReview(9, 'again'),
      createReview(9, 'again'),
    ];

    const stats = analyzeReviewsByHour(reviews);

    expect(stats[9].successRate).toBe(50); // 2/4 = 50%
  });

  it('treats hard and easy as successes', () => {
    const reviews = [
      createReview(10, 'hard'),
      createReview(10, 'easy'),
      createReview(10, 'again'),
    ];

    const stats = analyzeReviewsByHour(reviews);

    expect(stats[10].successCount).toBe(2); // hard and easy count as success
    expect(stats[10].successRate).toBeCloseTo(66.67, 0);
  });

  it('returns 0% for hours with no reviews', () => {
    const reviews = [createReview(8, 'good')];
    const stats = analyzeReviewsByHour(reviews);

    expect(stats[5].totalReviews).toBe(0);
    expect(stats[5].successRate).toBe(0);
  });
});

describe('findOptimalHours', () => {
  it('returns empty arrays when no sufficient data', () => {
    const stats = analyzeReviewsByHour([
      createReview(8, 'good'),
      createReview(8, 'good'),
    ]);

    const { best, worst } = findOptimalHours(stats);

    expect(best).toHaveLength(0);
    expect(worst).toHaveLength(0);
  });

  it('finds best and worst hours', () => {
    // Create reviews with clear best/worst hours
    const reviews: ReviewLog[] = [];

    // Hour 8: 10 reviews, 90% success (9 good, 1 again)
    for (let i = 0; i < 9; i++) reviews.push(createReview(8, 'good'));
    reviews.push(createReview(8, 'again'));

    // Hour 14: 10 reviews, 50% success (5 good, 5 again)
    for (let i = 0; i < 5; i++) reviews.push(createReview(14, 'good'));
    for (let i = 0; i < 5; i++) reviews.push(createReview(14, 'again'));

    // Hour 20: 10 reviews, 70% success
    for (let i = 0; i < 7; i++) reviews.push(createReview(20, 'good'));
    for (let i = 0; i < 3; i++) reviews.push(createReview(20, 'again'));

    const stats = analyzeReviewsByHour(reviews);
    const { best, worst } = findOptimalHours(stats);

    expect(best).toContain(8); // 90% should be in best
    expect(worst).toContain(14); // 50% should be in worst
  });

  it('only considers hours with >= 5 reviews', () => {
    const reviews: ReviewLog[] = [];

    // Hour 8: 4 reviews (insufficient)
    for (let i = 0; i < 4; i++) reviews.push(createReview(8, 'good'));

    // Hour 9: 5 reviews (sufficient)
    for (let i = 0; i < 5; i++) reviews.push(createReview(9, 'good'));

    const stats = analyzeReviewsByHour(reviews);
    const { best } = findOptimalHours(stats);

    expect(best).not.toContain(8);
    expect(best).toContain(9);
  });
});

describe('formatHour', () => {
  it('formats midnight correctly', () => {
    expect(formatHour(0)).toBe('12am');
  });

  it('formats noon correctly', () => {
    expect(formatHour(12)).toBe('12pm');
  });

  it('formats morning hours', () => {
    expect(formatHour(8)).toBe('8am');
    expect(formatHour(11)).toBe('11am');
  });

  it('formats afternoon hours', () => {
    expect(formatHour(14)).toBe('2pm');
    expect(formatHour(23)).toBe('11pm');
  });
});

describe('generateInsightMessage', () => {
  it('returns empty string with insufficient data', () => {
    const stats = analyzeReviewsByHour([]);
    const message = generateInsightMessage(stats);
    expect(message).toBe('');
  });

  it('returns consistency message when difference is small', () => {
    const reviews: ReviewLog[] = [];

    // All hours with similar success rates (80%)
    for (let hour = 8; hour <= 20; hour++) {
      for (let i = 0; i < 8; i++) reviews.push(createReview(hour, 'good'));
      for (let i = 0; i < 2; i++) reviews.push(createReview(hour, 'again'));
    }

    const stats = analyzeReviewsByHour(reviews);
    const message = generateInsightMessage(stats);

    expect(message).toContain('consistent');
  });

  it('generates insight when there is a clear difference', () => {
    const reviews: ReviewLog[] = [];

    // Morning (8-10): 90% success
    for (let hour = 8; hour <= 10; hour++) {
      for (let i = 0; i < 9; i++) reviews.push(createReview(hour, 'good'));
      reviews.push(createReview(hour, 'again'));
    }

    // Evening (20-22): 50% success
    for (let hour = 20; hour <= 22; hour++) {
      for (let i = 0; i < 5; i++) reviews.push(createReview(hour, 'good'));
      for (let i = 0; i < 5; i++) reviews.push(createReview(hour, 'again'));
    }

    const stats = analyzeReviewsByHour(reviews);
    const message = generateInsightMessage(stats);

    expect(message).toContain('%');
    expect(message).toContain('better');
  });
});

describe('hasSufficientData', () => {
  it('returns false for fewer than 50 reviews', () => {
    const reviews = Array.from({ length: 49 }, () => createReview(8, 'good'));
    expect(hasSufficientData(reviews)).toBe(false);
  });

  it('returns true for 50 or more reviews', () => {
    const reviews = Array.from({ length: 50 }, () => createReview(8, 'good'));
    expect(hasSufficientData(reviews)).toBe(true);
  });
});

describe('getHeatmapColor', () => {
  it('returns gray for insufficient data', () => {
    const color = getHeatmapColor(80, 4);
    expect(color.bg).toContain('gray');
  });

  it('returns red for low success rates', () => {
    const color = getHeatmapColor(40, 10);
    expect(color.bg).toContain('red');
  });

  it('returns green for high success rates', () => {
    const color = getHeatmapColor(95, 10);
    expect(color.bg).toContain('green');
  });

  it('returns yellow/orange for medium success rates', () => {
    const color = getHeatmapColor(70, 10);
    expect(color.bg).toMatch(/orange|yellow/);
  });
});
