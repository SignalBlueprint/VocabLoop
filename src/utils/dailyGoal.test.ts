import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDailyGoalTarget,
  setDailyGoalTarget,
  getDailyProgress,
  incrementDailyProgress,
  setDailyProgress,
  markCelebrationShown,
  shouldShowCelebration,
  getProgressPercentage,
  DEFAULT_DAILY_GOAL,
} from './dailyGoal';

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

describe('Daily Goal System', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getDailyGoalTarget', () => {
    it('should return default goal for new users', () => {
      expect(getDailyGoalTarget()).toBe(DEFAULT_DAILY_GOAL);
    });

    it('should return stored goal', () => {
      localStorageMock.setItem('vocabloop_daily_goal', '20');
      expect(getDailyGoalTarget()).toBe(20);
    });

    it('should return default for invalid stored value', () => {
      localStorageMock.setItem('vocabloop_daily_goal', 'invalid');
      expect(getDailyGoalTarget()).toBe(DEFAULT_DAILY_GOAL);
    });

    it('should return default for zero stored value', () => {
      localStorageMock.setItem('vocabloop_daily_goal', '0');
      expect(getDailyGoalTarget()).toBe(DEFAULT_DAILY_GOAL);
    });
  });

  describe('setDailyGoalTarget', () => {
    it('should save valid target', () => {
      setDailyGoalTarget(15);
      expect(getDailyGoalTarget()).toBe(15);
    });

    it('should not save target <= 0', () => {
      setDailyGoalTarget(10);
      setDailyGoalTarget(0);
      expect(getDailyGoalTarget()).toBe(10);

      setDailyGoalTarget(-5);
      expect(getDailyGoalTarget()).toBe(10);
    });

    it('should not save target > 100', () => {
      setDailyGoalTarget(10);
      setDailyGoalTarget(150);
      expect(getDailyGoalTarget()).toBe(10);
    });

    it('should save target at boundary (100)', () => {
      setDailyGoalTarget(100);
      expect(getDailyGoalTarget()).toBe(100);
    });
  });

  describe('getDailyProgress', () => {
    it('should return fresh progress for new day', () => {
      const progress = getDailyProgress();
      expect(progress.completed).toBe(0);
      expect(progress.celebrationShown).toBe(false);
    });

    it('should include current target', () => {
      setDailyGoalTarget(25);
      const progress = getDailyProgress();
      expect(progress.target).toBe(25);
    });

    it('should reset progress for new day', () => {
      // Simulate yesterday's data
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA');

      localStorageMock.setItem('vocabloop_daily_progress', JSON.stringify({
        target: 10,
        date: yesterdayStr,
        completed: 5,
        celebrationShown: true,
      }));

      const progress = getDailyProgress();
      expect(progress.completed).toBe(0);
      expect(progress.celebrationShown).toBe(false);
    });
  });

  describe('incrementDailyProgress', () => {
    it('should increment completed count', () => {
      incrementDailyProgress();
      expect(getDailyProgress().completed).toBe(1);

      incrementDailyProgress();
      expect(getDailyProgress().completed).toBe(2);
    });

    it('should return updated progress', () => {
      const result = incrementDailyProgress();
      expect(result.completed).toBe(1);
    });
  });

  describe('setDailyProgress', () => {
    it('should set completed count directly', () => {
      setDailyProgress(5);
      expect(getDailyProgress().completed).toBe(5);
    });

    it('should return updated progress', () => {
      const result = setDailyProgress(10);
      expect(result.completed).toBe(10);
    });
  });

  describe('markCelebrationShown', () => {
    it('should mark celebration as shown', () => {
      expect(getDailyProgress().celebrationShown).toBe(false);
      markCelebrationShown();
      expect(getDailyProgress().celebrationShown).toBe(true);
    });
  });

  describe('shouldShowCelebration', () => {
    it('should return false when goal not reached', () => {
      setDailyGoalTarget(10);
      setDailyProgress(5);
      expect(shouldShowCelebration()).toBe(false);
    });

    it('should return true when goal reached and not shown', () => {
      setDailyGoalTarget(10);
      setDailyProgress(10);
      expect(shouldShowCelebration()).toBe(true);
    });

    it('should return true when goal exceeded and not shown', () => {
      setDailyGoalTarget(10);
      setDailyProgress(15);
      expect(shouldShowCelebration()).toBe(true);
    });

    it('should return false when celebration already shown', () => {
      setDailyGoalTarget(10);
      setDailyProgress(10);
      markCelebrationShown();
      expect(shouldShowCelebration()).toBe(false);
    });
  });

  describe('getProgressPercentage', () => {
    it('should return 0 for no progress', () => {
      setDailyGoalTarget(10);
      expect(getProgressPercentage()).toBe(0);
    });

    it('should return correct percentage', () => {
      setDailyGoalTarget(10);
      setDailyProgress(5);
      expect(getProgressPercentage()).toBe(50);
    });

    it('should cap at 100%', () => {
      setDailyGoalTarget(10);
      setDailyProgress(15);
      expect(getProgressPercentage()).toBe(100);
    });

    it('should round to nearest integer', () => {
      setDailyGoalTarget(3);
      setDailyProgress(1);
      expect(getProgressPercentage()).toBe(33);
    });
  });

  describe('DEFAULT_DAILY_GOAL', () => {
    it('should be 10', () => {
      expect(DEFAULT_DAILY_GOAL).toBe(10);
    });
  });
});
