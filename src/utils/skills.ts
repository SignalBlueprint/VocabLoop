/**
 * Skill Tree System
 *
 * Gamification through skills, badges, and progression.
 */

import type { Card, ReviewLog } from '../types';

// ============================================
// Types
// ============================================

export interface SkillCategory {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  icon: string;
  color: string;
  skills: Skill[];
}

export interface Skill {
  id: string;
  name: string;
  badgeName: string;
  description: string;
  requirement: SkillRequirement;
  tier: 1 | 2 | 3 | 4 | 5;
  xp: number;
}

export interface SkillRequirement {
  type: 'words_learned' | 'streak' | 'accuracy' | 'speed' | 'mastery' |
        'games' | 'matches' | 'wins' | 'conversations' | 'pronunciation';
  target: number;
  condition?: {
    minReviews?: number;
    avgTimeMs?: number;
    minAccuracy?: number;
  };
}

export interface SkillProgress {
  skillId: string;
  categoryId: string;
  currentValue: number;
  targetValue: number;
  unlockedAt: number | null;
}

export interface UserSkillState {
  skills: SkillProgress[];
  featuredBadges: string[];
  totalXP: number;
  lastCheckedAt: number;
}

// ============================================
// Skill Definitions
// ============================================

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: 'vocabulario',
    name: 'Vocabulary',
    nameEs: 'Vocabulario',
    description: 'Building word knowledge',
    icon: '📚',
    color: '#10b981',
    skills: [
      {
        id: 'word-collector',
        name: 'Word Collector',
        badgeName: 'Collector',
        description: 'Learn 50 words',
        requirement: { type: 'words_learned', target: 50 },
        tier: 1,
        xp: 100,
      },
      {
        id: 'vocabulary-builder',
        name: 'Vocabulary Builder',
        badgeName: 'Builder',
        description: 'Learn 200 words',
        requirement: { type: 'words_learned', target: 200 },
        tier: 2,
        xp: 250,
      },
      {
        id: 'word-hoarder',
        name: 'Word Hoarder',
        badgeName: 'Hoarder',
        description: 'Learn 500 words',
        requirement: { type: 'words_learned', target: 500 },
        tier: 3,
        xp: 500,
      },
      {
        id: 'lexicon-master',
        name: 'Lexicon Master',
        badgeName: 'Lexicon',
        description: 'Learn 1000 words',
        requirement: { type: 'words_learned', target: 1000 },
        tier: 4,
        xp: 1000,
      },
      {
        id: 'dictionary',
        name: 'Dictionary',
        badgeName: 'Dictionary',
        description: 'Learn 2500 words',
        requirement: { type: 'words_learned', target: 2500 },
        tier: 5,
        xp: 2500,
      },
    ],
  },
  {
    id: 'consistencia',
    name: 'Consistency',
    nameEs: 'Consistencia',
    description: 'Daily practice habits',
    icon: '📅',
    color: '#3b82f6',
    skills: [
      {
        id: 'getting-started',
        name: 'Getting Started',
        badgeName: 'Starter',
        description: 'Maintain a 3-day streak',
        requirement: { type: 'streak', target: 3 },
        tier: 1,
        xp: 100,
      },
      {
        id: 'week-warrior',
        name: 'Week Warrior',
        badgeName: 'Weekly',
        description: 'Maintain a 7-day streak',
        requirement: { type: 'streak', target: 7 },
        tier: 2,
        xp: 250,
      },
      {
        id: 'habit-forming',
        name: 'Habit Forming',
        badgeName: 'Habitual',
        description: 'Maintain a 14-day streak',
        requirement: { type: 'streak', target: 14 },
        tier: 2,
        xp: 250,
      },
      {
        id: 'monthly-master',
        name: 'Monthly Master',
        badgeName: 'Monthly',
        description: 'Maintain a 30-day streak',
        requirement: { type: 'streak', target: 30 },
        tier: 3,
        xp: 500,
      },
      {
        id: 'century-club',
        name: 'Century Club',
        badgeName: 'Centurion',
        description: 'Maintain a 100-day streak',
        requirement: { type: 'streak', target: 100 },
        tier: 4,
        xp: 1000,
      },
      {
        id: 'year-of-spanish',
        name: 'Year of Spanish',
        badgeName: 'Yearly',
        description: 'Maintain a 365-day streak',
        requirement: { type: 'streak', target: 365 },
        tier: 5,
        xp: 2500,
      },
    ],
  },
  {
    id: 'precision',
    name: 'Precision',
    nameEs: 'Precisión',
    description: 'Review accuracy',
    icon: '🎯',
    color: '#eab308',
    skills: [
      {
        id: 'careful-student',
        name: 'Careful Student',
        badgeName: 'Careful',
        description: '80% accuracy in 50 reviews',
        requirement: { type: 'accuracy', target: 80, condition: { minReviews: 50 } },
        tier: 1,
        xp: 100,
      },
      {
        id: 'sharp-mind',
        name: 'Sharp Mind',
        badgeName: 'Sharp',
        description: '85% accuracy in 200 reviews',
        requirement: { type: 'accuracy', target: 85, condition: { minReviews: 200 } },
        tier: 2,
        xp: 250,
      },
      {
        id: 'precision-expert',
        name: 'Precision Expert',
        badgeName: 'Precise',
        description: '90% accuracy in 500 reviews',
        requirement: { type: 'accuracy', target: 90, condition: { minReviews: 500 } },
        tier: 3,
        xp: 500,
      },
      {
        id: 'nearly-perfect',
        name: 'Nearly Perfect',
        badgeName: 'Flawless',
        description: '95% accuracy in 1000 reviews',
        requirement: { type: 'accuracy', target: 95, condition: { minReviews: 1000 } },
        tier: 4,
        xp: 1000,
      },
    ],
  },
  {
    id: 'velocidad',
    name: 'Speed',
    nameEs: 'Velocidad',
    description: 'Quick recall',
    icon: '⚡',
    color: '#f97316',
    skills: [
      {
        id: 'quick-thinker',
        name: 'Quick Thinker',
        badgeName: 'Quick',
        description: 'Answer 50 cards in <3s avg',
        requirement: { type: 'speed', target: 50, condition: { avgTimeMs: 3000 } },
        tier: 1,
        xp: 100,
      },
      {
        id: 'speed-demon',
        name: 'Speed Demon',
        badgeName: 'Speedy',
        description: 'Answer 200 cards in <2s avg',
        requirement: { type: 'speed', target: 200, condition: { avgTimeMs: 2000 } },
        tier: 2,
        xp: 250,
      },
      {
        id: 'lightning-fast',
        name: 'Lightning Fast',
        badgeName: 'Lightning',
        description: 'Answer 500 cards in <1.5s avg',
        requirement: { type: 'speed', target: 500, condition: { avgTimeMs: 1500 } },
        tier: 3,
        xp: 500,
      },
      {
        id: 'instant-recall',
        name: 'Instant Recall',
        badgeName: 'Instant',
        description: 'Answer 1000 cards in <1s avg',
        requirement: { type: 'speed', target: 1000, condition: { avgTimeMs: 1000 } },
        tier: 4,
        xp: 1000,
      },
    ],
  },
  {
    id: 'maestria',
    name: 'Mastery',
    nameEs: 'Maestría',
    description: 'Long-term retention',
    icon: '👑',
    color: '#8b5cf6',
    skills: [
      {
        id: 'apprentice',
        name: 'Apprentice',
        badgeName: 'Apprentice',
        description: 'Master 25 words (interval >21 days)',
        requirement: { type: 'mastery', target: 25 },
        tier: 1,
        xp: 100,
      },
      {
        id: 'journeyman',
        name: 'Journeyman',
        badgeName: 'Journeyman',
        description: 'Master 100 words',
        requirement: { type: 'mastery', target: 100 },
        tier: 2,
        xp: 250,
      },
      {
        id: 'expert',
        name: 'Expert',
        badgeName: 'Expert',
        description: 'Master 250 words',
        requirement: { type: 'mastery', target: 250 },
        tier: 3,
        xp: 500,
      },
      {
        id: 'master',
        name: 'Master',
        badgeName: 'Master',
        description: 'Master 500 words',
        requirement: { type: 'mastery', target: 500 },
        tier: 4,
        xp: 1000,
      },
      {
        id: 'grandmaster',
        name: 'Grandmaster',
        badgeName: 'Grandmaster',
        description: 'Master 1000 words',
        requirement: { type: 'mastery', target: 1000 },
        tier: 5,
        xp: 2500,
      },
    ],
  },
  {
    id: 'explorador',
    name: 'Explorer',
    nameEs: 'Explorador',
    description: 'Using different features',
    icon: '🧭',
    color: '#14b8a6',
    skills: [
      {
        id: 'curious',
        name: 'Curious',
        badgeName: 'Curious',
        description: 'Try 3 different game modes',
        requirement: { type: 'games', target: 3 },
        tier: 1,
        xp: 100,
      },
      {
        id: 'adventurer',
        name: 'Adventurer',
        badgeName: 'Adventurer',
        description: 'Complete 10 sessions in each game mode',
        requirement: { type: 'games', target: 50 },
        tier: 3,
        xp: 500,
      },
    ],
  },
  {
    id: 'social',
    name: 'Social',
    nameEs: 'Social',
    description: 'Multiplayer and community',
    icon: '👥',
    color: '#ec4899',
    skills: [
      {
        id: 'first-match',
        name: 'First Match',
        badgeName: 'Competitor',
        description: 'Complete 1 multiplayer match',
        requirement: { type: 'matches', target: 1 },
        tier: 1,
        xp: 100,
      },
      {
        id: 'regular-player',
        name: 'Regular Player',
        badgeName: 'Regular',
        description: 'Complete 10 multiplayer matches',
        requirement: { type: 'matches', target: 10 },
        tier: 2,
        xp: 250,
      },
      {
        id: 'winner',
        name: 'Winner',
        badgeName: 'Winner',
        description: 'Win 5 multiplayer matches',
        requirement: { type: 'wins', target: 5 },
        tier: 2,
        xp: 250,
      },
      {
        id: 'champion',
        name: 'Champion',
        badgeName: 'Champion',
        description: 'Win 25 multiplayer matches',
        requirement: { type: 'wins', target: 25 },
        tier: 3,
        xp: 500,
      },
    ],
  },
  {
    id: 'conversador',
    name: 'Conversationalist',
    nameEs: 'Conversador',
    description: 'AI conversation practice',
    icon: '💬',
    color: '#6366f1',
    skills: [
      {
        id: 'first-words',
        name: 'First Words',
        badgeName: 'Talkative',
        description: 'Complete 1 AI conversation',
        requirement: { type: 'conversations', target: 1 },
        tier: 1,
        xp: 100,
      },
      {
        id: 'chatty',
        name: 'Chatty',
        badgeName: 'Chatty',
        description: 'Complete 10 AI conversations',
        requirement: { type: 'conversations', target: 10 },
        tier: 2,
        xp: 250,
      },
      {
        id: 'conversationalist',
        name: 'Conversationalist',
        badgeName: 'Conversational',
        description: 'Complete 50 AI conversations',
        requirement: { type: 'conversations', target: 50 },
        tier: 3,
        xp: 500,
      },
    ],
  },
  {
    id: 'pronunciacion',
    name: 'Pronunciation',
    nameEs: 'Pronunciación',
    description: 'Speaking practice',
    icon: '🎤',
    color: '#f43f5e',
    skills: [
      {
        id: 'first-sound',
        name: 'First Sound',
        badgeName: 'Speaker',
        description: 'Complete 1 pronunciation session',
        requirement: { type: 'pronunciation', target: 1 },
        tier: 1,
        xp: 100,
      },
      {
        id: 'clear-voice',
        name: 'Clear Voice',
        badgeName: 'Clear',
        description: 'Achieve 80% accuracy in 50 words',
        requirement: { type: 'pronunciation', target: 50, condition: { minAccuracy: 80 } },
        tier: 2,
        xp: 250,
      },
      {
        id: 'perfect-accent',
        name: 'Perfect Accent',
        badgeName: 'Perfect',
        description: 'Achieve 95% accuracy in 100 words',
        requirement: { type: 'pronunciation', target: 100, condition: { minAccuracy: 95 } },
        tier: 3,
        xp: 500,
      },
    ],
  },
];

// ============================================
// Storage
// ============================================

const SKILL_STATE_KEY = 'vocabloop-skills';

/**
 * Get user's skill state from localStorage
 */
export function getSkillState(): UserSkillState {
  try {
    const stored = localStorage.getItem(SKILL_STATE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load skill state:', e);
  }

  return initializeSkillState();
}

/**
 * Save skill state to localStorage
 */
export function saveSkillState(state: UserSkillState): void {
  try {
    localStorage.setItem(SKILL_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save skill state:', e);
  }
}

/**
 * Initialize empty skill state
 */
function initializeSkillState(): UserSkillState {
  const skills: SkillProgress[] = [];

  for (const category of SKILL_CATEGORIES) {
    for (const skill of category.skills) {
      skills.push({
        skillId: skill.id,
        categoryId: category.id,
        currentValue: 0,
        targetValue: skill.requirement.target,
        unlockedAt: null,
      });
    }
  }

  return {
    skills,
    featuredBadges: [],
    totalXP: 0,
    lastCheckedAt: Date.now(),
  };
}

// ============================================
// Progress Calculation
// ============================================

export interface SkillCheckContext {
  cards: Card[];
  reviews: ReviewLog[];
  currentStreak: number;
  matchHistory: { won: boolean }[];
  conversationCount: number;
  pronunciationSessions: { accuracy: number }[];
  gamesPlayed: Set<string>;
}

/**
 * Check all skills and return newly unlocked ones
 */
export function checkSkillProgress(context: SkillCheckContext): Skill[] {
  const state = getSkillState();
  const newlyUnlocked: Skill[] = [];

  for (const category of SKILL_CATEGORIES) {
    for (const skill of category.skills) {
      const progress = state.skills.find((s) => s.skillId === skill.id);
      if (!progress || progress.unlockedAt) continue; // Already unlocked

      const { current, unlocked } = calculateProgress(skill, context);

      progress.currentValue = current;

      if (unlocked && !progress.unlockedAt) {
        progress.unlockedAt = Date.now();
        state.totalXP += skill.xp;
        newlyUnlocked.push(skill);
      }
    }
  }

  state.lastCheckedAt = Date.now();
  saveSkillState(state);

  return newlyUnlocked;
}

/**
 * Calculate current progress for a skill
 */
function calculateProgress(
  skill: Skill,
  context: SkillCheckContext
): { current: number; unlocked: boolean } {
  const { type, target, condition } = skill.requirement;

  switch (type) {
    case 'words_learned': {
      const current = context.cards.filter((c) => c.intervalDays >= 1).length;
      return { current, unlocked: current >= target };
    }

    case 'streak': {
      const current = context.currentStreak;
      return { current, unlocked: current >= target };
    }

    case 'accuracy': {
      const minReviews = condition?.minReviews || 0;
      if (context.reviews.length < minReviews) {
        return { current: 0, unlocked: false };
      }
      const successful = context.reviews.filter((r) => r.grade !== 'again').length;
      const accuracy = Math.round((successful / context.reviews.length) * 100);
      return { current: accuracy, unlocked: accuracy >= target };
    }

    case 'speed': {
      // Would need timing data in reviews
      // Placeholder implementation
      return { current: 0, unlocked: false };
    }

    case 'mastery': {
      const current = context.cards.filter((c) => c.intervalDays >= 21).length;
      return { current, unlocked: current >= target };
    }

    case 'games': {
      const current = context.gamesPlayed.size;
      return { current, unlocked: current >= target };
    }

    case 'matches': {
      const current = context.matchHistory.length;
      return { current, unlocked: current >= target };
    }

    case 'wins': {
      const current = context.matchHistory.filter((m) => m.won).length;
      return { current, unlocked: current >= target };
    }

    case 'conversations': {
      const current = context.conversationCount;
      return { current, unlocked: current >= target };
    }

    case 'pronunciation': {
      const minAccuracy = condition?.minAccuracy || 0;
      const qualifying = context.pronunciationSessions.filter(
        (s) => s.accuracy >= minAccuracy
      );
      const current = qualifying.length;
      return { current, unlocked: current >= target };
    }

    default:
      return { current: 0, unlocked: false };
  }
}

// ============================================
// Helpers
// ============================================

/**
 * Get a skill by ID
 */
export function getSkillById(skillId: string): Skill | undefined {
  for (const category of SKILL_CATEGORIES) {
    const skill = category.skills.find((s) => s.id === skillId);
    if (skill) return skill;
  }
  return undefined;
}

/**
 * Get a category by ID
 */
export function getCategoryById(categoryId: string): SkillCategory | undefined {
  return SKILL_CATEGORIES.find((c) => c.id === categoryId);
}

/**
 * Get all unlocked skills
 */
export function getUnlockedSkills(): Skill[] {
  const state = getSkillState();
  const unlocked: Skill[] = [];

  for (const progress of state.skills) {
    if (progress.unlockedAt) {
      const skill = getSkillById(progress.skillId);
      if (skill) unlocked.push(skill);
    }
  }

  return unlocked;
}

/**
 * Get skills in progress (not unlocked but has progress)
 */
export function getSkillsInProgress(): Array<{ skill: Skill; progress: SkillProgress }> {
  const state = getSkillState();
  const inProgress: Array<{ skill: Skill; progress: SkillProgress }> = [];

  for (const progress of state.skills) {
    if (!progress.unlockedAt && progress.currentValue > 0) {
      const skill = getSkillById(progress.skillId);
      if (skill) {
        inProgress.push({ skill, progress });
      }
    }
  }

  return inProgress.sort(
    (a, b) =>
      b.progress.currentValue / b.progress.targetValue -
      a.progress.currentValue / a.progress.targetValue
  );
}

/**
 * Calculate user's level from XP
 */
export function calculateLevel(xp: number): { level: number; currentXP: number; nextLevelXP: number } {
  const levels = [0, 500, 1500, 3500, 7000, 12000, 20000, 35000, 55000, 80000, 110000];

  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i]) {
      const level = i + 1;
      const currentXP = xp - levels[i];
      const nextLevelXP = (levels[i + 1] || levels[i] * 2) - levels[i];
      return { level, currentXP, nextLevelXP };
    }
  }

  return { level: 1, currentXP: xp, nextLevelXP: 500 };
}

/**
 * Set featured badges
 */
export function setFeaturedBadges(skillIds: string[]): void {
  const state = getSkillState();
  state.featuredBadges = skillIds.slice(0, 3);
  saveSkillState(state);
}

/**
 * Get featured badges
 */
export function getFeaturedBadges(): Skill[] {
  const state = getSkillState();
  return state.featuredBadges
    .map((id) => getSkillById(id))
    .filter((s): s is Skill => s !== undefined);
}
