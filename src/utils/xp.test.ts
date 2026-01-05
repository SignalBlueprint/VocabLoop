import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTotalXP,
  addXP,
  getLevelFromXP,
  getCurrentLevel,
  getLevelProgress,
  getXPToNextLevel,
  awardReviewXP,
  formatXP,
  XP_REWARDS,
} from './xp';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('XP System', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getTotalXP', () => {
    it('should return 0 for new users', () => {
      expect(getTotalXP()).toBe(0);
    });

    it('should return stored XP', () => {
      localStorageMock.setItem('vocabloop_xp', JSON.stringify({ totalXP: 500, lastUpdated: Date.now() }));
      expect(getTotalXP()).toBe(500);
    });
  });

  describe('addXP', () => {
    it('should add XP to total', () => {
      const result = addXP(100);
      expect(result.newTotal).toBe(100);
    });

    it('should accumulate XP across calls', () => {
      addXP(100);
      const result = addXP(50);
      expect(result.newTotal).toBe(150);
    });

    it('should detect level up', () => {
      // Start at 0, add 100 to reach level 2
      const result = addXP(100);
      expect(result.leveledUp).toBe(true);
      expect(result.newLevel?.level).toBe(2);
    });

    it('should not detect level up within same level', () => {
      const result = addXP(50);
      expect(result.leveledUp).toBe(false);
      expect(result.newLevel).toBeUndefined();
    });
  });

  describe('getLevelFromXP', () => {
    it('should return level 1 for 0 XP', () => {
      const level = getLevelFromXP(0);
      expect(level.level).toBe(1);
      expect(level.title).toBe('Beginner');
    });

    it('should return level 2 for 100 XP', () => {
      const level = getLevelFromXP(100);
      expect(level.level).toBe(2);
      expect(level.title).toBe('Apprentice');
    });

    it('should return level 5 for 1000 XP', () => {
      const level = getLevelFromXP(1000);
      expect(level.level).toBe(5);
      expect(level.title).toBe('Linguist');
    });

    it('should return level 10 for max XP', () => {
      const level = getLevelFromXP(10000);
      expect(level.level).toBe(10);
      expect(level.title).toBe('Legend');
    });

    it('should handle XP values at exact boundaries', () => {
      expect(getLevelFromXP(99).level).toBe(1);
      expect(getLevelFromXP(100).level).toBe(2);
      expect(getLevelFromXP(299).level).toBe(2);
      expect(getLevelFromXP(300).level).toBe(3);
    });
  });

  describe('getCurrentLevel', () => {
    it('should return level based on stored XP', () => {
      localStorageMock.setItem('vocabloop_xp', JSON.stringify({ totalXP: 500, lastUpdated: Date.now() }));
      const level = getCurrentLevel();
      expect(level.level).toBe(3); // 300-600 is level 3
    });
  });

  describe('getLevelProgress', () => {
    it('should return 0% at level start', () => {
      localStorageMock.setItem('vocabloop_xp', JSON.stringify({ totalXP: 100, lastUpdated: Date.now() }));
      expect(getLevelProgress()).toBe(0);
    });

    it('should return 50% at level midpoint', () => {
      // Level 2 is 100-300 (200 XP range), midpoint is 200
      localStorageMock.setItem('vocabloop_xp', JSON.stringify({ totalXP: 200, lastUpdated: Date.now() }));
      expect(getLevelProgress()).toBe(50);
    });

    it('should return 100% at max level', () => {
      localStorageMock.setItem('vocabloop_xp', JSON.stringify({ totalXP: 15000, lastUpdated: Date.now() }));
      expect(getLevelProgress()).toBe(100);
    });
  });

  describe('getXPToNextLevel', () => {
    it('should return XP needed to reach next level', () => {
      localStorageMock.setItem('vocabloop_xp', JSON.stringify({ totalXP: 50, lastUpdated: Date.now() }));
      expect(getXPToNextLevel()).toBe(50); // Need 100 for level 2
    });

    it('should return 0 at max level', () => {
      localStorageMock.setItem('vocabloop_xp', JSON.stringify({ totalXP: 15000, lastUpdated: Date.now() }));
      expect(getXPToNextLevel()).toBe(0);
    });
  });

  describe('awardReviewXP', () => {
    it('should award 2 XP for "again" grade', () => {
      const result = awardReviewXP('again');
      expect(result.xpEarned).toBe(XP_REWARDS.REVIEW_FORGOT);
    });

    it('should award 5 XP for "hard" grade', () => {
      const result = awardReviewXP('hard');
      expect(result.xpEarned).toBe(XP_REWARDS.REVIEW_HARD);
    });

    it('should award 10 XP for "good" grade', () => {
      const result = awardReviewXP('good');
      expect(result.xpEarned).toBe(XP_REWARDS.REVIEW_CORRECT);
    });

    it('should award 10 XP for "easy" grade', () => {
      const result = awardReviewXP('easy');
      expect(result.xpEarned).toBe(XP_REWARDS.REVIEW_CORRECT);
    });

    it('should accumulate XP from reviews', () => {
      awardReviewXP('good'); // 10
      awardReviewXP('good'); // 10
      const result = awardReviewXP('easy'); // 10
      expect(result.newTotal).toBe(30);
    });
  });

  describe('formatXP', () => {
    it('should format small numbers without separator', () => {
      expect(formatXP(500)).toBe('500');
    });

    it('should format large numbers with thousand separator', () => {
      expect(formatXP(1500)).toBe('1,500');
      expect(formatXP(10000)).toBe('10,000');
      expect(formatXP(1000000)).toBe('1,000,000');
    });
  });

  describe('XP_REWARDS constants', () => {
    it('should have correct reward values', () => {
      expect(XP_REWARDS.REVIEW_CORRECT).toBe(10);
      expect(XP_REWARDS.REVIEW_HARD).toBe(5);
      expect(XP_REWARDS.REVIEW_FORGOT).toBe(2);
      expect(XP_REWARDS.PERFECT_SESSION).toBe(50);
      expect(XP_REWARDS.STREAK_BONUS).toBe(25);
      expect(XP_REWARDS.NEW_CARD).toBe(5);
      expect(XP_REWARDS.DAILY_GOAL).toBe(100);
    });
  });
});
