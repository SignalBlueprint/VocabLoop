import { describe, it, expect } from 'vitest';
import {
  getMasteryLevel,
  getMasteryInfo,
  getMasteryBreakdown,
  getMasteryStats,
} from './mastery';
import type { Card } from '../types';

// Helper to create a test card with specific SRS values
function createTestCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test-1',
    type: 'BASIC',
    front: 'hola',
    back: 'hello',
    tags: [],
    ease: 2.5,
    intervalDays: 0,
    reps: 0,
    dueAt: Date.now(),
    lapses: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('Mastery System', () => {
  describe('getMasteryLevel', () => {
    it('should return "new" for cards with 0 reps', () => {
      const card = createTestCard({ reps: 0 });
      expect(getMasteryLevel(card)).toBe('new');
    });

    it('should return "learning" for cards with 1 rep', () => {
      const card = createTestCard({ reps: 1 });
      expect(getMasteryLevel(card)).toBe('learning');
    });

    it('should return "learning" for cards with 2 reps', () => {
      const card = createTestCard({ reps: 2 });
      expect(getMasteryLevel(card)).toBe('learning');
    });

    it('should return "reviewing" for cards with 3-5 reps', () => {
      expect(getMasteryLevel(createTestCard({ reps: 3 }))).toBe('reviewing');
      expect(getMasteryLevel(createTestCard({ reps: 4 }))).toBe('reviewing');
      expect(getMasteryLevel(createTestCard({ reps: 5 }))).toBe('reviewing');
    });

    it('should return "reviewing" for cards with short intervals', () => {
      const card = createTestCard({ reps: 6, intervalDays: 5 });
      expect(getMasteryLevel(card)).toBe('reviewing');
    });

    it('should return "known" for cards with 6+ reps and 7+ day intervals', () => {
      const card = createTestCard({ reps: 6, intervalDays: 7 });
      expect(getMasteryLevel(card)).toBe('known');
    });

    it('should return "known" for cards not yet meeting mastery criteria', () => {
      const card = createTestCard({ reps: 8, intervalDays: 14, ease: 2.3 });
      expect(getMasteryLevel(card)).toBe('known');
    });

    it('should return "mastered" for fully mastered cards', () => {
      const card = createTestCard({
        reps: 10,
        intervalDays: 21,
        ease: 2.5,
        lapses: 0,
      });
      expect(getMasteryLevel(card)).toBe('mastered');
    });

    it('should not return "mastered" if ease is too low', () => {
      const card = createTestCard({
        reps: 10,
        intervalDays: 21,
        ease: 2.0,
        lapses: 0,
      });
      expect(getMasteryLevel(card)).toBe('known');
    });

    it('should not return "mastered" if too many lapses', () => {
      const card = createTestCard({
        reps: 10,
        intervalDays: 21,
        ease: 2.5,
        lapses: 5,
      });
      expect(getMasteryLevel(card)).toBe('known');
    });

    it('should not return "mastered" if interval is too short', () => {
      const card = createTestCard({
        reps: 10,
        intervalDays: 14,
        ease: 2.5,
        lapses: 0,
      });
      expect(getMasteryLevel(card)).toBe('known');
    });
  });

  describe('getMasteryInfo', () => {
    it('should return correct info for "new" cards', () => {
      const card = createTestCard({ reps: 0 });
      const info = getMasteryInfo(card);

      expect(info.level).toBe('new');
      expect(info.label).toBe('New');
      expect(info.progress).toBe(0);
    });

    it('should return correct info for "learning" cards', () => {
      const card = createTestCard({ reps: 1 });
      const info = getMasteryInfo(card);

      expect(info.level).toBe('learning');
      expect(info.label).toBe('Learning');
      expect(info.progress).toBeGreaterThan(0);
    });

    it('should return correct progress for "learning" cards', () => {
      // 1 rep = 1/3 = ~33%
      const card = createTestCard({ reps: 1 });
      const info = getMasteryInfo(card);
      expect(info.progress).toBeCloseTo(33.33, 0);
    });

    it('should return correct info for "mastered" cards', () => {
      const card = createTestCard({
        reps: 10,
        intervalDays: 21,
        ease: 2.5,
        lapses: 0,
      });
      const info = getMasteryInfo(card);

      expect(info.level).toBe('mastered');
      expect(info.label).toBe('Mastered');
      expect(info.progress).toBe(100);
    });

    it('should include color information', () => {
      const card = createTestCard({ reps: 5, intervalDays: 7 });
      const info = getMasteryInfo(card);

      expect(info.color).toBeDefined();
      expect(info.bgColor).toBeDefined();
      expect(info.darkColor).toBeDefined();
      expect(info.darkBgColor).toBeDefined();
    });
  });

  describe('getMasteryBreakdown', () => {
    it('should return all zeroes for empty array', () => {
      const breakdown = getMasteryBreakdown([]);

      expect(breakdown.new).toBe(0);
      expect(breakdown.learning).toBe(0);
      expect(breakdown.reviewing).toBe(0);
      expect(breakdown.known).toBe(0);
      expect(breakdown.mastered).toBe(0);
    });

    it('should correctly count cards by mastery level', () => {
      const cards = [
        createTestCard({ id: '1', reps: 0 }), // new
        createTestCard({ id: '2', reps: 0 }), // new
        createTestCard({ id: '3', reps: 1 }), // learning
        createTestCard({ id: '4', reps: 4 }), // reviewing
        createTestCard({ id: '5', reps: 6, intervalDays: 7 }), // known
        createTestCard({ id: '6', reps: 10, intervalDays: 21, ease: 2.5, lapses: 0 }), // mastered
      ];

      const breakdown = getMasteryBreakdown(cards);

      expect(breakdown.new).toBe(2);
      expect(breakdown.learning).toBe(1);
      expect(breakdown.reviewing).toBe(1);
      expect(breakdown.known).toBe(1);
      expect(breakdown.mastered).toBe(1);
    });
  });

  describe('getMasteryStats', () => {
    it('should calculate percent known correctly', () => {
      const cards = [
        createTestCard({ id: '1', reps: 0 }), // new
        createTestCard({ id: '2', reps: 0 }), // new
        createTestCard({ id: '3', reps: 6, intervalDays: 7 }), // known
        createTestCard({ id: '4', reps: 10, intervalDays: 21, ease: 2.5, lapses: 0 }), // mastered
      ];

      const stats = getMasteryStats(cards);

      // 2 known + mastered out of 4 = 50%
      expect(stats.percentKnown).toBe(50);
    });

    it('should calculate percent mastered correctly', () => {
      const cards = [
        createTestCard({ id: '1', reps: 0 }), // new
        createTestCard({ id: '2', reps: 6, intervalDays: 7 }), // known
        createTestCard({ id: '3', reps: 10, intervalDays: 21, ease: 2.5, lapses: 0 }), // mastered
        createTestCard({ id: '4', reps: 10, intervalDays: 21, ease: 2.5, lapses: 0 }), // mastered
      ];

      const stats = getMasteryStats(cards);

      // 2 mastered out of 4 = 50%
      expect(stats.percentMastered).toBe(50);
    });

    it('should handle empty array without division by zero', () => {
      const stats = getMasteryStats([]);

      expect(stats.percentKnown).toBe(0);
      expect(stats.percentMastered).toBe(0);
    });

    it('should include breakdown in stats', () => {
      const cards = [createTestCard({ reps: 0 })];
      const stats = getMasteryStats(cards);

      expect(stats.breakdown).toBeDefined();
      expect(stats.breakdown.new).toBe(1);
    });
  });
});
