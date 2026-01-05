// Achievements / Badges system with tiers and XP rewards

const ACHIEVEMENTS_KEY = 'vocabloop_achievements';
const ACHIEVEMENT_PROGRESS_KEY = 'vocabloop_achievement_progress';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type AchievementCategory = 'streak' | 'cards' | 'reviews' | 'games' | 'mastery' | 'special';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  requirement: number;
  tier: AchievementTier;
  xpReward: number;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
  seen: boolean;
}

export interface AchievementProgress {
  totalReviews: number;
  totalCardsCreated: number;
  totalCardsLearned: number;
  longestStreak: number;
  currentStreak: number;
  verbStreak: number;
  perfectSessions: number;
  gamesPlayed: number;
  quizzesPerfect: number;
  matchingGamesWon: number;
  typingChallengesWon: number;
  speedRoundsCompleted: number;
  xpEarned: number;
  cardsReviewedInOneDay: number;
  dailyGoalsCompleted: number;
}

// All available achievements
export const ACHIEVEMENTS: Achievement[] = [
  // Streak achievements
  { id: 'streak_3', name: 'Getting Started', description: 'Maintain a 3-day streak', icon: '🔥', category: 'streak', requirement: 3, tier: 'bronze', xpReward: 25 },
  { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥', category: 'streak', requirement: 7, tier: 'silver', xpReward: 50 },
  { id: 'streak_14', name: 'Fortnight Fighter', description: 'Maintain a 14-day streak', icon: '🔥', category: 'streak', requirement: 14, tier: 'silver', xpReward: 75 },
  { id: 'streak_30', name: 'Monthly Master', description: 'Maintain a 30-day streak', icon: '🏆', category: 'streak', requirement: 30, tier: 'gold', xpReward: 150 },
  { id: 'streak_100', name: 'Century Streak', description: 'Maintain a 100-day streak', icon: '💯', category: 'streak', requirement: 100, tier: 'platinum', xpReward: 500 },
  { id: 'streak_365', name: 'Year of Learning', description: 'Maintain a 365-day streak', icon: '👑', category: 'streak', requirement: 365, tier: 'platinum', xpReward: 1000 },

  // Card creation achievements
  { id: 'cards_10', name: 'Card Creator', description: 'Create 10 cards', icon: '📝', category: 'cards', requirement: 10, tier: 'bronze', xpReward: 20 },
  { id: 'cards_50', name: 'Deck Builder', description: 'Create 50 cards', icon: '📚', category: 'cards', requirement: 50, tier: 'silver', xpReward: 50 },
  { id: 'cards_100', name: 'Vocabulary Vault', description: 'Create 100 cards', icon: '🗃️', category: 'cards', requirement: 100, tier: 'gold', xpReward: 100 },
  { id: 'cards_250', name: 'Word Collector', description: 'Create 250 cards', icon: '📖', category: 'cards', requirement: 250, tier: 'gold', xpReward: 200 },
  { id: 'cards_500', name: 'Lexicon Legend', description: 'Create 500 cards', icon: '🏛️', category: 'cards', requirement: 500, tier: 'platinum', xpReward: 400 },

  // Review achievements
  { id: 'reviews_50', name: 'First Steps', description: 'Complete 50 reviews', icon: '👣', category: 'reviews', requirement: 50, tier: 'bronze', xpReward: 25 },
  { id: 'reviews_100', name: 'Dedicated Learner', description: 'Complete 100 reviews', icon: '📈', category: 'reviews', requirement: 100, tier: 'bronze', xpReward: 40 },
  { id: 'reviews_500', name: 'Review Machine', description: 'Complete 500 reviews', icon: '⚡', category: 'reviews', requirement: 500, tier: 'silver', xpReward: 100 },
  { id: 'reviews_1000', name: 'Thousand Club', description: 'Complete 1,000 reviews', icon: '🌟', category: 'reviews', requirement: 1000, tier: 'gold', xpReward: 200 },
  { id: 'reviews_5000', name: 'Review Legend', description: 'Complete 5,000 reviews', icon: '💎', category: 'reviews', requirement: 5000, tier: 'platinum', xpReward: 500 },

  // Mastery achievements
  { id: 'learned_25', name: 'Quick Learner', description: 'Learn 25 cards (3+ reviews)', icon: '🎓', category: 'mastery', requirement: 25, tier: 'bronze', xpReward: 30 },
  { id: 'learned_50', name: 'Knowledge Seeker', description: 'Learn 50 cards', icon: '🧠', category: 'mastery', requirement: 50, tier: 'silver', xpReward: 60 },
  { id: 'learned_100', name: 'Scholar', description: 'Learn 100 cards', icon: '🎯', category: 'mastery', requirement: 100, tier: 'silver', xpReward: 100 },
  { id: 'learned_250', name: 'Expert', description: 'Learn 250 cards', icon: '📚', category: 'mastery', requirement: 250, tier: 'gold', xpReward: 200 },
  { id: 'learned_500', name: 'Polyglot Progress', description: 'Learn 500 cards', icon: '🌍', category: 'mastery', requirement: 500, tier: 'platinum', xpReward: 500 },

  // Game achievements
  { id: 'games_10', name: 'Game On', description: 'Play 10 mini-games', icon: '🎮', category: 'games', requirement: 10, tier: 'bronze', xpReward: 25 },
  { id: 'games_50', name: 'Game Enthusiast', description: 'Play 50 mini-games', icon: '🕹️', category: 'games', requirement: 50, tier: 'silver', xpReward: 75 },
  { id: 'games_100', name: 'Game Master', description: 'Play 100 mini-games', icon: '🏅', category: 'games', requirement: 100, tier: 'gold', xpReward: 150 },
  { id: 'quiz_perfect_5', name: 'Quiz Whiz', description: 'Get 5 perfect quiz scores', icon: '💯', category: 'games', requirement: 5, tier: 'silver', xpReward: 50 },
  { id: 'quiz_perfect_25', name: 'Quiz Master', description: 'Get 25 perfect quiz scores', icon: '🏆', category: 'games', requirement: 25, tier: 'gold', xpReward: 150 },
  { id: 'matching_10', name: 'Match Maker', description: 'Win 10 matching games', icon: '🎯', category: 'games', requirement: 10, tier: 'bronze', xpReward: 30 },
  { id: 'matching_50', name: 'Match Master', description: 'Win 50 matching games', icon: '🎯', category: 'games', requirement: 50, tier: 'gold', xpReward: 100 },
  { id: 'typing_10', name: 'Speed Typist', description: 'Complete 10 typing challenges', icon: '⌨️', category: 'games', requirement: 10, tier: 'bronze', xpReward: 30 },
  { id: 'typing_50', name: 'Typing Pro', description: 'Complete 50 typing challenges', icon: '⌨️', category: 'games', requirement: 50, tier: 'gold', xpReward: 100 },
  { id: 'speed_10', name: 'Quick Draw', description: 'Complete 10 speed rounds', icon: '⚡', category: 'games', requirement: 10, tier: 'bronze', xpReward: 30 },
  { id: 'speed_50', name: 'Lightning Fast', description: 'Complete 50 speed rounds', icon: '⚡', category: 'games', requirement: 50, tier: 'gold', xpReward: 100 },

  // Special achievements
  { id: 'first_review', name: 'First Review', description: 'Complete your first review', icon: '🎯', category: 'special', requirement: 1, tier: 'bronze', xpReward: 10 },
  { id: 'daily_goal', name: 'Goal Getter', description: 'Complete a daily goal', icon: '✅', category: 'special', requirement: 1, tier: 'bronze', xpReward: 15 },
  { id: 'daily_goal_10', name: 'Goal Crusher', description: 'Complete 10 daily goals', icon: '🎯', category: 'special', requirement: 10, tier: 'silver', xpReward: 50 },
  { id: 'daily_goal_30', name: 'Goal Legend', description: 'Complete 30 daily goals', icon: '🏆', category: 'special', requirement: 30, tier: 'gold', xpReward: 150 },
  { id: 'verb_streak_7', name: 'Verb Virtuoso', description: '7-day verb practice streak', icon: '🔤', category: 'special', requirement: 7, tier: 'silver', xpReward: 50 },
  { id: 'perfect_sessions_5', name: 'Perfectionist', description: 'Complete 5 perfect review sessions', icon: '✨', category: 'special', requirement: 5, tier: 'silver', xpReward: 50 },
  { id: 'perfect_sessions_25', name: 'Flawless', description: 'Complete 25 perfect review sessions', icon: '💎', category: 'special', requirement: 25, tier: 'gold', xpReward: 150 },
  { id: 'xp_1000', name: 'XP Hunter', description: 'Earn 1,000 total XP', icon: '⭐', category: 'special', requirement: 1000, tier: 'bronze', xpReward: 50 },
  { id: 'xp_5000', name: 'XP Collector', description: 'Earn 5,000 total XP', icon: '🌟', category: 'special', requirement: 5000, tier: 'silver', xpReward: 100 },
  { id: 'xp_10000', name: 'XP Champion', description: 'Earn 10,000 total XP', icon: '💫', category: 'special', requirement: 10000, tier: 'gold', xpReward: 200 },
  { id: 'daily_50', name: 'Marathon Session', description: 'Review 50 cards in one day', icon: '🏃', category: 'special', requirement: 50, tier: 'silver', xpReward: 75 },
  { id: 'daily_100', name: 'Ultra Marathon', description: 'Review 100 cards in one day', icon: '🏅', category: 'special', requirement: 100, tier: 'gold', xpReward: 150 },
];

// Get default progress
function getDefaultProgress(): AchievementProgress {
  return {
    totalReviews: 0,
    totalCardsCreated: 0,
    totalCardsLearned: 0,
    longestStreak: 0,
    currentStreak: 0,
    verbStreak: 0,
    perfectSessions: 0,
    gamesPlayed: 0,
    quizzesPerfect: 0,
    matchingGamesWon: 0,
    typingChallengesWon: 0,
    speedRoundsCompleted: 0,
    xpEarned: 0,
    cardsReviewedInOneDay: 0,
    dailyGoalsCompleted: 0,
  };
}

// Get unlocked achievements
export function getUnlockedAchievements(): UnlockedAchievement[] {
  const stored = localStorage.getItem(ACHIEVEMENTS_KEY);
  if (!stored) return [];
  try {
    const data = JSON.parse(stored);
    // Handle migration from old format
    if (Array.isArray(data)) {
      return data;
    } else if (data.unlockedIds) {
      // Migrate from old format
      return data.unlockedIds.map((id: string) => ({
        id,
        unlockedAt: Date.now(),
        seen: true,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

// Save unlocked achievements
function saveUnlockedAchievements(achievements: UnlockedAchievement[]): void {
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
}

// Get achievement progress
export function getAchievementProgress(): AchievementProgress {
  const stored = localStorage.getItem(ACHIEVEMENT_PROGRESS_KEY);
  if (!stored) {
    // Try to migrate from old format
    const oldData = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (oldData) {
      try {
        const parsed = JSON.parse(oldData);
        if (parsed.stats) {
          return {
            ...getDefaultProgress(),
            totalReviews: parsed.stats.totalReviews || 0,
            longestStreak: parsed.stats.maxStreak || 0,
            verbStreak: parsed.stats.maxVerbStreak || 0,
            dailyGoalsCompleted: parsed.stats.dailyGoalsCompleted || 0,
          };
        }
      } catch {
        // Ignore migration errors
      }
    }
    return getDefaultProgress();
  }
  try {
    return { ...getDefaultProgress(), ...JSON.parse(stored) };
  } catch {
    return getDefaultProgress();
  }
}

// Save achievement progress
export function saveAchievementProgress(progress: AchievementProgress): void {
  localStorage.setItem(ACHIEVEMENT_PROGRESS_KEY, JSON.stringify(progress));
}

// Check if achievement is unlocked
export function isAchievementUnlocked(achievementId: string): boolean {
  const unlocked = getUnlockedAchievements();
  return unlocked.some(a => a.id === achievementId);
}

// Unlock an achievement
function unlockAchievement(achievementId: string): UnlockedAchievement | null {
  if (isAchievementUnlocked(achievementId)) return null;

  const achievement: UnlockedAchievement = {
    id: achievementId,
    unlockedAt: Date.now(),
    seen: false,
  };

  const unlocked = getUnlockedAchievements();
  unlocked.push(achievement);
  saveUnlockedAchievements(unlocked);

  return achievement;
}

// Mark achievement as seen
export function markAchievementSeen(achievementId: string): void {
  const unlocked = getUnlockedAchievements();
  const index = unlocked.findIndex(a => a.id === achievementId);
  if (index !== -1) {
    unlocked[index].seen = true;
    saveUnlockedAchievements(unlocked);
  }
}

// Mark all achievements as seen
export function markAllAchievementsSeen(): void {
  const unlocked = getUnlockedAchievements();
  unlocked.forEach(a => a.seen = true);
  saveUnlockedAchievements(unlocked);
}

// Get unseen achievements
export function getUnseenAchievements(): Achievement[] {
  const unlocked = getUnlockedAchievements();
  const unseen = unlocked.filter(a => !a.seen);
  return unseen
    .map(u => ACHIEVEMENTS.find(a => a.id === u.id))
    .filter((a): a is Achievement => a !== undefined);
}

// Check and unlock achievements based on progress
export function checkAchievements(progress: AchievementProgress): Achievement[] {
  const newlyUnlocked: Achievement[] = [];

  const check = (id: string, value: number, requirement: number) => {
    if (value >= requirement && !isAchievementUnlocked(id)) {
      const unlocked = unlockAchievement(id);
      if (unlocked) {
        const achievement = ACHIEVEMENTS.find(a => a.id === id);
        if (achievement) newlyUnlocked.push(achievement);
      }
    }
  };

  // Streak achievements
  check('streak_3', progress.longestStreak, 3);
  check('streak_7', progress.longestStreak, 7);
  check('streak_14', progress.longestStreak, 14);
  check('streak_30', progress.longestStreak, 30);
  check('streak_100', progress.longestStreak, 100);
  check('streak_365', progress.longestStreak, 365);

  // Card creation achievements
  check('cards_10', progress.totalCardsCreated, 10);
  check('cards_50', progress.totalCardsCreated, 50);
  check('cards_100', progress.totalCardsCreated, 100);
  check('cards_250', progress.totalCardsCreated, 250);
  check('cards_500', progress.totalCardsCreated, 500);

  // Review achievements
  check('first_review', progress.totalReviews, 1);
  check('reviews_50', progress.totalReviews, 50);
  check('reviews_100', progress.totalReviews, 100);
  check('reviews_500', progress.totalReviews, 500);
  check('reviews_1000', progress.totalReviews, 1000);
  check('reviews_5000', progress.totalReviews, 5000);

  // Mastery achievements
  check('learned_25', progress.totalCardsLearned, 25);
  check('learned_50', progress.totalCardsLearned, 50);
  check('learned_100', progress.totalCardsLearned, 100);
  check('learned_250', progress.totalCardsLearned, 250);
  check('learned_500', progress.totalCardsLearned, 500);

  // Game achievements
  check('games_10', progress.gamesPlayed, 10);
  check('games_50', progress.gamesPlayed, 50);
  check('games_100', progress.gamesPlayed, 100);
  check('quiz_perfect_5', progress.quizzesPerfect, 5);
  check('quiz_perfect_25', progress.quizzesPerfect, 25);
  check('matching_10', progress.matchingGamesWon, 10);
  check('matching_50', progress.matchingGamesWon, 50);
  check('typing_10', progress.typingChallengesWon, 10);
  check('typing_50', progress.typingChallengesWon, 50);
  check('speed_10', progress.speedRoundsCompleted, 10);
  check('speed_50', progress.speedRoundsCompleted, 50);

  // Special achievements
  check('daily_goal', progress.dailyGoalsCompleted, 1);
  check('daily_goal_10', progress.dailyGoalsCompleted, 10);
  check('daily_goal_30', progress.dailyGoalsCompleted, 30);
  check('verb_streak_7', progress.verbStreak, 7);
  check('perfect_sessions_5', progress.perfectSessions, 5);
  check('perfect_sessions_25', progress.perfectSessions, 25);
  check('xp_1000', progress.xpEarned, 1000);
  check('xp_5000', progress.xpEarned, 5000);
  check('xp_10000', progress.xpEarned, 10000);
  check('daily_50', progress.cardsReviewedInOneDay, 50);
  check('daily_100', progress.cardsReviewedInOneDay, 100);

  return newlyUnlocked;
}

// Update progress and check for new achievements
export function updateAchievementProgress(
  updates: Partial<AchievementProgress>
): Achievement[] {
  const current = getAchievementProgress();
  const updated = { ...current };

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === 'number') {
      const k = key as keyof AchievementProgress;
      if (k === 'longestStreak' || k === 'currentStreak' || k === 'cardsReviewedInOneDay') {
        updated[k] = Math.max(updated[k], value);
      } else {
        updated[k] = (updated[k] || 0) + value;
      }
    }
  }

  if (updated.currentStreak > updated.longestStreak) {
    updated.longestStreak = updated.currentStreak;
  }

  saveAchievementProgress(updated);
  return checkAchievements(updated);
}

// Increment a single progress field
export function incrementAchievementProgress(
  field: keyof AchievementProgress,
  amount: number = 1
): Achievement[] {
  return updateAchievementProgress({ [field]: amount });
}

// Get achievement by ID
export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

// Get all achievements with unlock status
export function getAchievementsWithStatus(): (Achievement & { unlocked: boolean; unlockedAt?: number })[] {
  const unlocked = getUnlockedAchievements();
  const unlockedMap = new Map(unlocked.map(a => [a.id, a]));

  return ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id)?.unlockedAt,
  }));
}

// Get all achievements grouped by category
export function getAchievementsByCategory(): Record<AchievementCategory, (Achievement & { unlocked: boolean })[]> {
  const achievements = getAchievementsWithStatus();
  const grouped: Record<AchievementCategory, (Achievement & { unlocked: boolean })[]> = {
    streak: [],
    cards: [],
    reviews: [],
    mastery: [],
    games: [],
    special: [],
  };

  for (const achievement of achievements) {
    grouped[achievement.category].push(achievement);
  }

  return grouped;
}

// Get completion stats
export function getAchievementStats(): {
  total: number;
  unlocked: number;
  percentage: number;
  byTier: Record<AchievementTier, { total: number; unlocked: number }>;
  totalXpEarned: number;
} {
  const unlocked = getUnlockedAchievements();
  const unlockedIds = new Set(unlocked.map(a => a.id));

  const byTier: Record<AchievementTier, { total: number; unlocked: number }> = {
    bronze: { total: 0, unlocked: 0 },
    silver: { total: 0, unlocked: 0 },
    gold: { total: 0, unlocked: 0 },
    platinum: { total: 0, unlocked: 0 },
  };

  let totalXpEarned = 0;

  for (const achievement of ACHIEVEMENTS) {
    byTier[achievement.tier].total++;
    if (unlockedIds.has(achievement.id)) {
      byTier[achievement.tier].unlocked++;
      totalXpEarned += achievement.xpReward;
    }
  }

  return {
    total: ACHIEVEMENTS.length,
    unlocked: unlocked.length,
    percentage: Math.round((unlocked.length / ACHIEVEMENTS.length) * 100),
    byTier,
    totalXpEarned,
  };
}

// Get tier display info
export function getTierInfo(tier: AchievementTier): { color: string; bgLight: string; bgDark: string; label: string } {
  switch (tier) {
    case 'bronze':
      return { color: 'text-amber-700', bgLight: 'bg-amber-100', bgDark: 'bg-amber-900/30', label: 'Bronze' };
    case 'silver':
      return { color: 'text-gray-500', bgLight: 'bg-gray-200', bgDark: 'bg-gray-700', label: 'Silver' };
    case 'gold':
      return { color: 'text-yellow-600', bgLight: 'bg-yellow-100', bgDark: 'bg-yellow-900/30', label: 'Gold' };
    case 'platinum':
      return { color: 'text-cyan-500', bgLight: 'bg-cyan-100', bgDark: 'bg-cyan-900/30', label: 'Platinum' };
  }
}

// Get category display info
export function getCategoryInfo(category: AchievementCategory): { icon: string; label: string } {
  switch (category) {
    case 'streak': return { icon: '🔥', label: 'Streaks' };
    case 'cards': return { icon: '📚', label: 'Cards' };
    case 'reviews': return { icon: '📖', label: 'Reviews' };
    case 'mastery': return { icon: '🎓', label: 'Mastery' };
    case 'games': return { icon: '🎮', label: 'Games' };
    case 'special': return { icon: '⭐', label: 'Special' };
  }
}

// Legacy compatibility functions
export function getAchievementData() {
  const progress = getAchievementProgress();
  const unlocked = getUnlockedAchievements();
  return {
    unlockedIds: unlocked.map(a => a.id),
    stats: {
      totalReviews: progress.totalReviews,
      maxStreak: progress.longestStreak,
      maxVerbStreak: progress.verbStreak,
      dailyGoalsCompleted: progress.dailyGoalsCompleted,
    },
  };
}

export function getAchievements(): (Achievement & { unlockedAt?: number })[] {
  return getAchievementsWithStatus().map(a => ({
    ...a,
    unlockedAt: a.unlocked ? a.unlockedAt : undefined,
  }));
}

export function getLockedAchievements(): Achievement[] {
  return getAchievementsWithStatus().filter(a => !a.unlocked);
}
