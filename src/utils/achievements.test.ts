import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUnlockedAchievements,
  getAchievementProgress,
  isAchievementUnlocked,
  markAchievementSeen,
  markAllAchievementsSeen,
  getUnseenAchievements,
  checkAchievements,
  updateAchievementProgress,
  incrementAchievementProgress,
  getAchievement,
  getAchievementsWithStatus,
  getAchievementsByCategory,
  getAchievementStats,
  getTierInfo,
  getCategoryInfo,
  ACHIEVEMENTS,
  type AchievementProgress,
} from './achievements';

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

describe('Achievements System', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getUnlockedAchievements', () => {
    it('should return empty array for new users', () => {
      expect(getUnlockedAchievements()).toEqual([]);
    });

    it('should return stored achievements', () => {
      const achievements = [{ id: 'streak_3', unlockedAt: Date.now(), seen: true }];
      localStorageMock.setItem('vocabloop_achievements', JSON.stringify(achievements));

      const result = getUnlockedAchievements();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('streak_3');
    });
  });

  describe('getAchievementProgress', () => {
    it('should return default progress for new users', () => {
      const progress = getAchievementProgress();

      expect(progress.totalReviews).toBe(0);
      expect(progress.totalCardsCreated).toBe(0);
      expect(progress.longestStreak).toBe(0);
    });

    it('should return stored progress', () => {
      const stored: AchievementProgress = {
        totalReviews: 100,
        totalCardsCreated: 50,
        totalCardsLearned: 25,
        longestStreak: 7,
        currentStreak: 3,
        verbStreak: 2,
        perfectSessions: 5,
        gamesPlayed: 10,
        quizzesPerfect: 3,
        matchingGamesWon: 5,
        typingChallengesWon: 2,
        speedRoundsCompleted: 4,
        xpEarned: 500,
        cardsReviewedInOneDay: 20,
        dailyGoalsCompleted: 5,
      };
      localStorageMock.setItem('vocabloop_achievement_progress', JSON.stringify(stored));

      const progress = getAchievementProgress();
      expect(progress.totalReviews).toBe(100);
      expect(progress.longestStreak).toBe(7);
    });
  });

  describe('isAchievementUnlocked', () => {
    it('should return false for locked achievement', () => {
      expect(isAchievementUnlocked('streak_100')).toBe(false);
    });

    it('should return true for unlocked achievement', () => {
      const achievements = [{ id: 'streak_3', unlockedAt: Date.now(), seen: true }];
      localStorageMock.setItem('vocabloop_achievements', JSON.stringify(achievements));

      expect(isAchievementUnlocked('streak_3')).toBe(true);
    });
  });

  describe('markAchievementSeen', () => {
    it('should mark achievement as seen', () => {
      const achievements = [{ id: 'streak_3', unlockedAt: Date.now(), seen: false }];
      localStorageMock.setItem('vocabloop_achievements', JSON.stringify(achievements));

      markAchievementSeen('streak_3');

      const updated = getUnlockedAchievements();
      expect(updated[0].seen).toBe(true);
    });
  });

  describe('markAllAchievementsSeen', () => {
    it('should mark all achievements as seen', () => {
      const achievements = [
        { id: 'streak_3', unlockedAt: Date.now(), seen: false },
        { id: 'streak_7', unlockedAt: Date.now(), seen: false },
      ];
      localStorageMock.setItem('vocabloop_achievements', JSON.stringify(achievements));

      markAllAchievementsSeen();

      const updated = getUnlockedAchievements();
      expect(updated.every(a => a.seen)).toBe(true);
    });
  });

  describe('getUnseenAchievements', () => {
    it('should return only unseen achievements', () => {
      const achievements = [
        { id: 'streak_3', unlockedAt: Date.now(), seen: false },
        { id: 'streak_7', unlockedAt: Date.now(), seen: true },
      ];
      localStorageMock.setItem('vocabloop_achievements', JSON.stringify(achievements));

      const unseen = getUnseenAchievements();
      expect(unseen).toHaveLength(1);
      expect(unseen[0].id).toBe('streak_3');
    });
  });

  describe('checkAchievements', () => {
    it('should unlock streak achievements at correct thresholds', () => {
      const progress = getAchievementProgress();
      progress.longestStreak = 7;

      const newlyUnlocked = checkAchievements(progress);

      expect(newlyUnlocked.some(a => a.id === 'streak_3')).toBe(true);
      expect(newlyUnlocked.some(a => a.id === 'streak_7')).toBe(true);
    });

    it('should unlock review achievements', () => {
      const progress = getAchievementProgress();
      progress.totalReviews = 100;

      const newlyUnlocked = checkAchievements(progress);

      expect(newlyUnlocked.some(a => a.id === 'first_review')).toBe(true);
      expect(newlyUnlocked.some(a => a.id === 'reviews_50')).toBe(true);
      expect(newlyUnlocked.some(a => a.id === 'reviews_100')).toBe(true);
    });

    it('should not re-unlock already unlocked achievements', () => {
      const progress = getAchievementProgress();
      progress.longestStreak = 7;

      // First check
      checkAchievements(progress);

      // Second check
      const newlyUnlocked = checkAchievements(progress);

      expect(newlyUnlocked).toHaveLength(0);
    });
  });

  describe('updateAchievementProgress', () => {
    it('should update progress and check achievements', () => {
      const newlyUnlocked = updateAchievementProgress({ totalReviews: 50 });

      const progress = getAchievementProgress();
      expect(progress.totalReviews).toBe(50);
      expect(newlyUnlocked.some(a => a.id === 'first_review')).toBe(true);
    });

    it('should accumulate progress', () => {
      updateAchievementProgress({ totalReviews: 25 });
      updateAchievementProgress({ totalReviews: 25 });

      const progress = getAchievementProgress();
      expect(progress.totalReviews).toBe(50);
    });

    it('should use max for streak values', () => {
      updateAchievementProgress({ longestStreak: 5 });
      updateAchievementProgress({ longestStreak: 3 });

      const progress = getAchievementProgress();
      expect(progress.longestStreak).toBe(5);
    });
  });

  describe('incrementAchievementProgress', () => {
    it('should increment by 1 by default', () => {
      incrementAchievementProgress('totalReviews');
      incrementAchievementProgress('totalReviews');

      const progress = getAchievementProgress();
      expect(progress.totalReviews).toBe(2);
    });

    it('should increment by specified amount', () => {
      incrementAchievementProgress('gamesPlayed', 5);

      const progress = getAchievementProgress();
      expect(progress.gamesPlayed).toBe(5);
    });
  });

  describe('getAchievement', () => {
    it('should return achievement by ID', () => {
      const achievement = getAchievement('streak_7');

      expect(achievement).toBeDefined();
      expect(achievement?.name).toBe('Week Warrior');
    });

    it('should return undefined for invalid ID', () => {
      expect(getAchievement('invalid_id')).toBeUndefined();
    });
  });

  describe('getAchievementsWithStatus', () => {
    it('should include unlock status for all achievements', () => {
      const achievements = getAchievementsWithStatus();

      expect(achievements.length).toBe(ACHIEVEMENTS.length);
      expect(achievements[0]).toHaveProperty('unlocked');
    });

    it('should mark unlocked achievements correctly', () => {
      const unlocked = [{ id: 'streak_3', unlockedAt: Date.now(), seen: true }];
      localStorageMock.setItem('vocabloop_achievements', JSON.stringify(unlocked));

      const achievements = getAchievementsWithStatus();
      const streak3 = achievements.find(a => a.id === 'streak_3');

      expect(streak3?.unlocked).toBe(true);
      expect(streak3?.unlockedAt).toBeDefined();
    });
  });

  describe('getAchievementsByCategory', () => {
    it('should group achievements by category', () => {
      const grouped = getAchievementsByCategory();

      expect(grouped.streak).toBeDefined();
      expect(grouped.cards).toBeDefined();
      expect(grouped.reviews).toBeDefined();
      expect(grouped.games).toBeDefined();
      expect(grouped.mastery).toBeDefined();
      expect(grouped.special).toBeDefined();
    });

    it('should have correct achievements in each category', () => {
      const grouped = getAchievementsByCategory();

      expect(grouped.streak.some(a => a.id === 'streak_7')).toBe(true);
      expect(grouped.reviews.some(a => a.id === 'reviews_100')).toBe(true);
    });
  });

  describe('getAchievementStats', () => {
    it('should return correct stats for new user', () => {
      const stats = getAchievementStats();

      expect(stats.total).toBe(ACHIEVEMENTS.length);
      expect(stats.unlocked).toBe(0);
      expect(stats.percentage).toBe(0);
    });

    it('should calculate percentage correctly', () => {
      // Unlock some achievements
      const unlocked = [
        { id: 'streak_3', unlockedAt: Date.now(), seen: true },
        { id: 'first_review', unlockedAt: Date.now(), seen: true },
      ];
      localStorageMock.setItem('vocabloop_achievements', JSON.stringify(unlocked));

      const stats = getAchievementStats();

      expect(stats.unlocked).toBe(2);
      expect(stats.percentage).toBe(Math.round((2 / ACHIEVEMENTS.length) * 100));
    });

    it('should track by tier', () => {
      const stats = getAchievementStats();

      expect(stats.byTier.bronze.total).toBeGreaterThan(0);
      expect(stats.byTier.silver.total).toBeGreaterThan(0);
      expect(stats.byTier.gold.total).toBeGreaterThan(0);
      expect(stats.byTier.platinum.total).toBeGreaterThan(0);
    });
  });

  describe('getTierInfo', () => {
    it('should return correct info for each tier', () => {
      expect(getTierInfo('bronze').label).toBe('Bronze');
      expect(getTierInfo('silver').label).toBe('Silver');
      expect(getTierInfo('gold').label).toBe('Gold');
      expect(getTierInfo('platinum').label).toBe('Platinum');
    });

    it('should include color information', () => {
      const info = getTierInfo('gold');

      expect(info.color).toBeDefined();
      expect(info.bgLight).toBeDefined();
      expect(info.bgDark).toBeDefined();
    });
  });

  describe('getCategoryInfo', () => {
    it('should return correct info for each category', () => {
      expect(getCategoryInfo('streak').label).toBe('Streaks');
      expect(getCategoryInfo('cards').label).toBe('Cards');
      expect(getCategoryInfo('reviews').label).toBe('Reviews');
      expect(getCategoryInfo('games').label).toBe('Games');
      expect(getCategoryInfo('mastery').label).toBe('Mastery');
      expect(getCategoryInfo('special').label).toBe('Special');
    });

    it('should include icon', () => {
      const info = getCategoryInfo('streak');
      expect(info.icon).toBe('🔥');
    });
  });

  describe('ACHIEVEMENTS constant', () => {
    it('should have valid structure for all achievements', () => {
      for (const achievement of ACHIEVEMENTS) {
        expect(achievement.id).toBeDefined();
        expect(achievement.name).toBeDefined();
        expect(achievement.description).toBeDefined();
        expect(achievement.icon).toBeDefined();
        expect(achievement.category).toBeDefined();
        expect(achievement.requirement).toBeGreaterThan(0);
        expect(achievement.tier).toBeDefined();
        expect(achievement.xpReward).toBeGreaterThan(0);
      }
    });

    it('should have unique IDs', () => {
      const ids = ACHIEVEMENTS.map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });
});
