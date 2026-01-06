import { describe, it, expect } from 'vitest';
import {
  calculateRetention,
  generateRetentionCurve,
  generateProjection,
  getCurrentRetention,
} from './retention';
import type { ReviewLog } from '../types';

describe('calculateRetention', () => {
  it('returns 100% when days since review is 0', () => {
    expect(calculateRetention(7, 0)).toBe(100);
    expect(calculateRetention(1, 0)).toBe(100);
    expect(calculateRetention(30, 0)).toBe(100);
  });

  it('returns ~86.7% at t=S (one interval)', () => {
    // e^(-1) ≈ 0.368, so at t=S, retention ≈ 36.8%
    // Actually, the formula gives R = e^(-t/S) * 100
    // At t=S: R = e^(-1) * 100 ≈ 36.79%
    const retention = calculateRetention(7, 7);
    expect(retention).toBeCloseTo(36.79, 0);
  });

  it('decays faster with shorter intervals', () => {
    const shortInterval = calculateRetention(1, 2);
    const longInterval = calculateRetention(7, 2);
    expect(shortInterval).toBeLessThan(longInterval);
  });

  it('handles edge cases gracefully', () => {
    // Zero interval should use minimum of 1
    expect(calculateRetention(0, 1)).toBeCloseTo(36.79, 0);

    // Negative days should be treated as 0
    expect(calculateRetention(7, -5)).toBe(100);
  });

  it('clamps retention between 0 and 100', () => {
    // Very large time should approach 0
    const veryOld = calculateRetention(1, 100);
    expect(veryOld).toBeGreaterThanOrEqual(0);
    expect(veryOld).toBeLessThan(1);

    // Retention should never exceed 100
    const fresh = calculateRetention(30, 0);
    expect(fresh).toBeLessThanOrEqual(100);
  });

  it('produces realistic retention values', () => {
    // At half the interval, retention should be around 60%
    const halfInterval = calculateRetention(10, 5);
    expect(halfInterval).toBeGreaterThan(50);
    expect(halfInterval).toBeLessThan(70);

    // At 2x the interval, retention should be quite low
    const doubleInterval = calculateRetention(7, 14);
    expect(doubleInterval).toBeLessThan(20);
  });
});

describe('generateRetentionCurve', () => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const baseTime = new Date('2026-01-01').getTime();

  it('returns decay curve when no reviews exist', () => {
    const curve = generateRetentionCurve([], baseTime, baseTime + 7 * msPerDay);

    expect(curve.length).toBeGreaterThan(0);
    expect(curve[0].day).toBe(0);
    expect(curve[0].retention).toBe(100); // Starts at 100%
    expect(curve[0].isReview).toBe(false);

    // Should decay over time
    const lastPoint = curve[curve.length - 1];
    expect(lastPoint.retention).toBeLessThan(100);
  });

  it('marks reviews correctly with grades', () => {
    const reviews: ReviewLog[] = [
      {
        id: 'r1',
        cardId: 'card1',
        reviewedAt: baseTime + 1 * msPerDay + 1000, // Day 1
        grade: 'good',
        previousInterval: 1,
        newInterval: 3,
        previousDueAt: baseTime,
        newDueAt: baseTime + 3 * msPerDay,
      },
    ];

    const curve = generateRetentionCurve(reviews, baseTime, baseTime + 5 * msPerDay);

    // Find the review point
    const reviewPoint = curve.find((p) => p.isReview);
    expect(reviewPoint).toBeDefined();
    expect(reviewPoint?.grade).toBe('good');
    expect(reviewPoint?.retention).toBe(100); // Good grade = full reset
  });

  it('handles "again" grade with lower retention reset', () => {
    const reviews: ReviewLog[] = [
      {
        id: 'r1',
        cardId: 'card1',
        reviewedAt: baseTime + 1 * msPerDay + 1000,
        grade: 'again',
        previousInterval: 1,
        newInterval: 1,
        previousDueAt: baseTime,
        newDueAt: baseTime + 1 * msPerDay,
      },
    ];

    const curve = generateRetentionCurve(reviews, baseTime, baseTime + 3 * msPerDay);

    const reviewPoint = curve.find((p) => p.isReview);
    expect(reviewPoint?.retention).toBe(90); // Again = 90% reset
  });

  it('shows retention spike after each review', () => {
    const reviews: ReviewLog[] = [
      {
        id: 'r1',
        cardId: 'card1',
        reviewedAt: baseTime + 3 * msPerDay + 1000,
        grade: 'good',
        previousInterval: 1,
        newInterval: 3,
        previousDueAt: baseTime,
        newDueAt: baseTime + 3 * msPerDay,
      },
    ];

    const curve = generateRetentionCurve(reviews, baseTime, baseTime + 6 * msPerDay);

    // Before review (day 2), retention should be decayed
    const day2 = curve.find((p) => p.day === 2);
    expect(day2?.retention).toBeLessThan(100);

    // At review (day 3), retention spikes
    const day3 = curve.find((p) => p.day === 3);
    expect(day3?.retention).toBe(100);
    expect(day3?.isReview).toBe(true);

    // After review (day 4), should start decaying again from 100
    const day4 = curve.find((p) => p.day === 4);
    expect(day4?.retention).toBeLessThan(100);
    expect(day4?.retention).toBeGreaterThan(50); // But not decayed much yet
  });

  it('handles multiple reviews', () => {
    const reviews: ReviewLog[] = [
      {
        id: 'r1',
        cardId: 'card1',
        reviewedAt: baseTime + 1 * msPerDay + 1000,
        grade: 'good',
        previousInterval: 1,
        newInterval: 3,
        previousDueAt: baseTime,
        newDueAt: baseTime + 3 * msPerDay,
      },
      {
        id: 'r2',
        cardId: 'card1',
        reviewedAt: baseTime + 4 * msPerDay + 1000,
        grade: 'easy',
        previousInterval: 3,
        newInterval: 7,
        previousDueAt: baseTime + 3 * msPerDay,
        newDueAt: baseTime + 10 * msPerDay,
      },
    ];

    const curve = generateRetentionCurve(reviews, baseTime, baseTime + 8 * msPerDay);

    const reviewPoints = curve.filter((p) => p.isReview);
    expect(reviewPoints.length).toBe(2);
    expect(reviewPoints[0].grade).toBe('good');
    expect(reviewPoints[1].grade).toBe('easy');
  });
});

describe('generateProjection', () => {
  it('starts from current retention', () => {
    const projection = generateProjection(80, 7, 14);

    expect(projection[0].day).toBe(0);
    // First point should be close to starting retention
    expect(projection[0].retention).toBeCloseTo(80, -1);
  });

  it('decays over projection period', () => {
    const projection = generateProjection(100, 7, 14);

    const firstPoint = projection[0];
    const lastPoint = projection[projection.length - 1];

    expect(lastPoint.retention).toBeLessThan(firstPoint.retention);
  });

  it('uses interval for decay rate', () => {
    const shortInterval = generateProjection(100, 3, 7);
    const longInterval = generateProjection(100, 21, 7);

    // Short interval should decay faster
    const shortFinal = shortInterval[shortInterval.length - 1].retention;
    const longFinal = longInterval[longInterval.length - 1].retention;

    expect(shortFinal).toBeLessThan(longFinal);
  });

  it('returns correct number of days', () => {
    const projection = generateProjection(90, 7, 10);
    expect(projection.length).toBe(11); // 0 to 10 inclusive
  });
});

describe('getCurrentRetention', () => {
  const msPerDay = 24 * 60 * 60 * 1000;

  it('returns 100% for newly created cards', () => {
    expect(getCurrentRetention(7, undefined)).toBe(100);
  });

  it('returns high retention for recently reviewed cards', () => {
    const now = Date.now();
    const retention = getCurrentRetention(7, now - 1 * msPerDay, now);

    expect(retention).toBeGreaterThan(80);
  });

  it('returns lower retention for overdue cards', () => {
    const now = Date.now();
    const retention = getCurrentRetention(7, now - 14 * msPerDay, now);

    expect(retention).toBeLessThan(20);
  });

  it('accounts for interval length', () => {
    const now = Date.now();
    const shortInterval = getCurrentRetention(3, now - 5 * msPerDay, now);
    const longInterval = getCurrentRetention(21, now - 5 * msPerDay, now);

    expect(shortInterval).toBeLessThan(longInterval);
  });
});
