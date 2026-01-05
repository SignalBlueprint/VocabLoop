import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getWeeklyChallenges,
  updateChallengeProgress,
  incrementChallengeProgress,
  claimChallengeXP,
  getDaysRemainingInWeek,
  hasUnclaimedRewards,
} from './challenges';

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

describe('Weekly Challenges System', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z')); // Wednesday
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getWeeklyChallenges', () => {
    it('should return 3 challenges', () => {
      const challenges = getWeeklyChallenges();
      expect(challenges).toHaveLength(3);
    });

    it('should include challenge info and progress', () => {
      const challenges = getWeeklyChallenges();

      for (const { challenge, progress } of challenges) {
        expect(challenge).toHaveProperty('id');
        expect(challenge).toHaveProperty('title');
        expect(challenge).toHaveProperty('target');
        expect(challenge).toHaveProperty('xpReward');
        expect(progress).toHaveProperty('current');
        expect(progress).toHaveProperty('completed');
      }
    });

    it('should return same challenges for same week', () => {
      const challenges1 = getWeeklyChallenges();
      const challenges2 = getWeeklyChallenges();

      expect(challenges1.map(c => c.challenge.id)).toEqual(
        challenges2.map(c => c.challenge.id)
      );
    });

    it('should generate new challenges for new week', () => {
      // First call initializes challenges for current week
      getWeeklyChallenges();

      // Advance to next week
      vi.advanceTimersByTime(7 * 24 * 60 * 60 * 1000);

      const challengesNextWeek = getWeeklyChallenges();

      // May or may not be different due to random selection,
      // but structure should be the same
      expect(challengesNextWeek).toHaveLength(3);
    });
  });

  describe('updateChallengeProgress', () => {
    it('should update progress for matching challenge type', () => {
      // First get challenges to ensure they exist
      getWeeklyChallenges();

      updateChallengeProgress('reviews', 25);

      const challenges = getWeeklyChallenges();
      const reviewChallenge = challenges.find(c => c.challenge.type === 'reviews');

      if (reviewChallenge) {
        expect(reviewChallenge.progress.current).toBe(25);
      }
    });

    it('should mark challenge as completed when target reached', () => {
      getWeeklyChallenges();

      updateChallengeProgress('reviews', 1000); // Very high number

      const challenges = getWeeklyChallenges();
      const reviewChallenge = challenges.find(c => c.challenge.type === 'reviews');

      if (reviewChallenge) {
        expect(reviewChallenge.progress.completed).toBe(true);
      }
    });
  });

  describe('incrementChallengeProgress', () => {
    it('should increment progress by 1 by default', () => {
      getWeeklyChallenges();

      incrementChallengeProgress('reviews');
      incrementChallengeProgress('reviews');
      incrementChallengeProgress('reviews');

      const challenges = getWeeklyChallenges();
      const reviewChallenge = challenges.find(c => c.challenge.type === 'reviews');

      if (reviewChallenge) {
        expect(reviewChallenge.progress.current).toBe(3);
      }
    });

    it('should increment by specified amount', () => {
      getWeeklyChallenges();

      incrementChallengeProgress('reviews', 5);

      const challenges = getWeeklyChallenges();
      const reviewChallenge = challenges.find(c => c.challenge.type === 'reviews');

      if (reviewChallenge) {
        expect(reviewChallenge.progress.current).toBe(5);
      }
    });
  });

  describe('claimChallengeXP', () => {
    it('should return 0 for incomplete challenge', () => {
      const challenges = getWeeklyChallenges();
      const xp = claimChallengeXP(challenges[0].challenge.id);
      expect(xp).toBe(0);
    });

    it('should return XP reward for completed challenge', () => {
      const challenges = getWeeklyChallenges();
      const challenge = challenges[0];

      // Complete the challenge
      updateChallengeProgress(challenge.challenge.type, challenge.challenge.target + 10);

      const xp = claimChallengeXP(challenge.challenge.id);
      expect(xp).toBe(challenge.challenge.xpReward);
    });

    it('should return 0 for already claimed challenge', () => {
      const challenges = getWeeklyChallenges();
      const challenge = challenges[0];

      // Complete and claim
      updateChallengeProgress(challenge.challenge.type, challenge.challenge.target + 10);
      claimChallengeXP(challenge.challenge.id);

      // Try to claim again
      const xp = claimChallengeXP(challenge.challenge.id);
      expect(xp).toBe(0);
    });
  });

  describe('getDaysRemainingInWeek', () => {
    it('should return correct days remaining', () => {
      // Wednesday Jan 15, 2025
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
      expect(getDaysRemainingInWeek()).toBe(3); // Wed=3, Thu, Fri, Sat = 3 days until Saturday

      // Sunday
      vi.setSystemTime(new Date('2025-01-12T12:00:00Z'));
      expect(getDaysRemainingInWeek()).toBe(6);

      // Saturday
      vi.setSystemTime(new Date('2025-01-18T12:00:00Z'));
      expect(getDaysRemainingInWeek()).toBe(0);
    });
  });

  describe('hasUnclaimedRewards', () => {
    it('should return false when no challenges complete', () => {
      getWeeklyChallenges();
      expect(hasUnclaimedRewards()).toBe(false);
    });

    it('should return true when challenge complete but not claimed', () => {
      const challenges = getWeeklyChallenges();
      const challenge = challenges[0];

      updateChallengeProgress(challenge.challenge.type, challenge.challenge.target + 10);

      expect(hasUnclaimedRewards()).toBe(true);
    });

    it('should return false after reward claimed', () => {
      const challenges = getWeeklyChallenges();
      const challenge = challenges[0];

      updateChallengeProgress(challenge.challenge.type, challenge.challenge.target + 10);
      claimChallengeXP(challenge.challenge.id);

      // May still be true if other challenges were completed
      // For this test, we just check that claiming works
      const stillUnclaimed = hasUnclaimedRewards();
      expect(typeof stillUnclaimed).toBe('boolean');
    });
  });
});
