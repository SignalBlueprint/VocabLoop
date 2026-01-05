import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateSchedule,
  applySchedule,
  formatInterval,
  getIntervalPreviews,
  INITIAL_EASE,
} from './index';
import type { Card } from '../types';

// Helper to create a test card
function createTestCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test-1',
    type: 'BASIC',
    front: 'hola',
    back: 'hello',
    tags: [],
    ease: INITIAL_EASE,
    intervalDays: 0,
    reps: 0,
    dueAt: Date.now(),
    lapses: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('calculateSchedule', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('new cards (reps === 0)', () => {
    it('should reset on "again" grade', () => {
      const card = createTestCard();
      const result = calculateSchedule(card, 'again');

      expect(result.newReps).toBe(0);
      expect(result.newInterval).toBe(0);
      expect(result.newLapses).toBe(1);
      expect(result.newEase).toBe(INITIAL_EASE - 0.2);
    });

    it('should graduate with "hard" grade', () => {
      const card = createTestCard();
      const result = calculateSchedule(card, 'hard');

      expect(result.newReps).toBe(1);
      expect(result.newInterval).toBe(0);
      expect(result.newEase).toBe(INITIAL_EASE - 0.15);
    });

    it('should graduate with "good" grade - 1 day interval', () => {
      const card = createTestCard();
      const result = calculateSchedule(card, 'good');

      expect(result.newReps).toBe(1);
      expect(result.newInterval).toBe(1);
      expect(result.newEase).toBe(INITIAL_EASE);
    });

    it('should graduate with "easy" grade - 4 day interval', () => {
      const card = createTestCard();
      const result = calculateSchedule(card, 'easy');

      expect(result.newReps).toBe(1);
      expect(result.newInterval).toBe(4);
      expect(result.newEase).toBe(INITIAL_EASE + 0.15);
    });
  });

  describe('graduated cards (reps > 0)', () => {
    it('should reset reps on "again" grade', () => {
      const card = createTestCard({ reps: 5, intervalDays: 10 });
      const result = calculateSchedule(card, 'again');

      expect(result.newReps).toBe(0);
      expect(result.newInterval).toBe(0);
      expect(result.newLapses).toBe(1);
    });

    it('should increase interval slightly on "hard" grade', () => {
      const card = createTestCard({ reps: 3, intervalDays: 10 });
      const result = calculateSchedule(card, 'hard');

      expect(result.newReps).toBe(4);
      expect(result.newInterval).toBe(12); // 10 * 1.2 = 12
    });

    it('should increase interval by ease factor on "good" grade', () => {
      const card = createTestCard({ reps: 3, intervalDays: 10, ease: 2.5 });
      const result = calculateSchedule(card, 'good');

      expect(result.newReps).toBe(4);
      expect(result.newInterval).toBe(25); // 10 * 2.5 = 25
    });

    it('should increase interval significantly on "easy" grade', () => {
      const card = createTestCard({ reps: 3, intervalDays: 10, ease: 2.5 });
      const result = calculateSchedule(card, 'easy');

      expect(result.newReps).toBe(4);
      expect(result.newInterval).toBe(34); // 10 * 2.65 * 1.3 = 34.45, rounded to 34 (ease increased to 2.65)
    });
  });

  describe('ease factor adjustments', () => {
    it('should never go below minimum ease (1.3)', () => {
      const card = createTestCard({ ease: 1.3 });
      const result = calculateSchedule(card, 'again');

      expect(result.newEase).toBe(1.3);
    });

    it('should decrease ease on "again"', () => {
      const card = createTestCard({ ease: 2.5 });
      const result = calculateSchedule(card, 'again');

      expect(result.newEase).toBe(2.3);
    });

    it('should increase ease on "easy"', () => {
      const card = createTestCard({ ease: 2.5 });
      const result = calculateSchedule(card, 'easy');

      expect(result.newEase).toBe(2.65);
    });
  });

  describe('due date calculation', () => {
    it('should set due date correctly for 1 day interval', () => {
      const card = createTestCard();
      const result = calculateSchedule(card, 'good');

      const expectedDue = Date.now() + 1 * 24 * 60 * 60 * 1000;
      expect(result.newDueAt).toBe(expectedDue);
    });

    it('should set due date correctly for 4 day interval', () => {
      const card = createTestCard();
      const result = calculateSchedule(card, 'easy');

      const expectedDue = Date.now() + 4 * 24 * 60 * 60 * 1000;
      expect(result.newDueAt).toBe(expectedDue);
    });
  });

  describe('interval minimum of 1 day', () => {
    it('should never have interval less than 1 for graduated cards', () => {
      const card = createTestCard({ reps: 1, intervalDays: 1, ease: 1.3 });
      const result = calculateSchedule(card, 'hard');

      expect(result.newInterval).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('applySchedule', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should update card with schedule result', () => {
    const card = createTestCard();
    const result = calculateSchedule(card, 'good');
    const updated = applySchedule(card, result);

    expect(updated.ease).toBe(result.newEase);
    expect(updated.intervalDays).toBe(result.newInterval);
    expect(updated.dueAt).toBe(result.newDueAt);
    expect(updated.reps).toBe(result.newReps);
    expect(updated.lapses).toBe(result.newLapses);
    expect(updated.lastReviewedAt).toBe(Date.now());
    expect(updated.updatedAt).toBe(Date.now());
  });

  it('should preserve original card properties', () => {
    const card = createTestCard({
      front: 'perro',
      back: 'dog',
      tags: ['animals'],
      notes: 'my note',
    });
    const result = calculateSchedule(card, 'good');
    const updated = applySchedule(card, result);

    expect(updated.front).toBe('perro');
    expect(updated.back).toBe('dog');
    expect(updated.tags).toEqual(['animals']);
    expect(updated.notes).toBe('my note');
  });
});

describe('formatInterval', () => {
  it('should return "Now" for 0 days', () => {
    expect(formatInterval(0)).toBe('Now');
  });

  it('should return "1 day" for 1 day', () => {
    expect(formatInterval(1)).toBe('1 day');
  });

  it('should return "X days" for 2-29 days', () => {
    expect(formatInterval(2)).toBe('2 days');
    expect(formatInterval(15)).toBe('15 days');
    expect(formatInterval(29)).toBe('29 days');
  });

  it('should return months for 30-364 days', () => {
    expect(formatInterval(30)).toBe('1 month');
    expect(formatInterval(45)).toBe('2 months');
    expect(formatInterval(60)).toBe('2 months');
    expect(formatInterval(180)).toBe('6 months');
  });

  it('should return years for 365+ days', () => {
    expect(formatInterval(365)).toBe('1 year');
    expect(formatInterval(730)).toBe('2 years');
  });
});

describe('getIntervalPreviews', () => {
  it('should return previews for all grades', () => {
    const card = createTestCard();
    const previews = getIntervalPreviews(card);

    expect(previews.again).toBe('Now');
    expect(previews.hard).toBe('Now');
    expect(previews.good).toBe('1 day');
    expect(previews.easy).toBe('4 days');
  });

  it('should show larger intervals for graduated cards', () => {
    const card = createTestCard({ reps: 3, intervalDays: 10, ease: 2.5 });
    const previews = getIntervalPreviews(card);

    expect(previews.again).toBe('Now');
    expect(previews.hard).toBe('12 days');
    expect(previews.good).toBe('25 days');
    expect(previews.easy).toBe('1 month');
  });
});
