// XP and leveling system utilities

interface XPData {
  totalXP: number;
  lastUpdated: number;
}

interface LevelInfo {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
}

const STORAGE_KEY = 'vocabloop_xp';

// XP rewards for different actions
export const XP_REWARDS = {
  REVIEW_CORRECT: 10,      // Good/Easy grade
  REVIEW_HARD: 5,          // Hard grade
  REVIEW_FORGOT: 2,        // Again grade (still some XP for trying)
  PERFECT_SESSION: 50,     // Complete session with no "again" grades
  STREAK_BONUS: 25,        // Per day of streak (added daily)
  NEW_CARD: 5,             // Adding a new card
  DAILY_GOAL: 100,         // Completing daily goal
  FIRST_REVIEW_TODAY: 15,  // First review of the day bonus
} as const;

// Level thresholds - increasing XP required per level
const LEVELS: LevelInfo[] = [
  { level: 1, title: 'Beginner', minXP: 0, maxXP: 100 },
  { level: 2, title: 'Apprentice', minXP: 100, maxXP: 300 },
  { level: 3, title: 'Student', minXP: 300, maxXP: 600 },
  { level: 4, title: 'Scholar', minXP: 600, maxXP: 1000 },
  { level: 5, title: 'Linguist', minXP: 1000, maxXP: 1500 },
  { level: 6, title: 'Polyglot', minXP: 1500, maxXP: 2500 },
  { level: 7, title: 'Sage', minXP: 2500, maxXP: 4000 },
  { level: 8, title: 'Master', minXP: 4000, maxXP: 6000 },
  { level: 9, title: 'Grandmaster', minXP: 6000, maxXP: 10000 },
  { level: 10, title: 'Legend', minXP: 10000, maxXP: Infinity },
];

// Get XP data from storage
function getXPData(): XPData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return { totalXP: 0, lastUpdated: Date.now() };
}

// Save XP data to storage
function saveXPData(data: XPData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Get total XP
export function getTotalXP(): number {
  return getXPData().totalXP;
}

// Add XP
export function addXP(amount: number): { newTotal: number; leveledUp: boolean; newLevel?: LevelInfo } {
  const data = getXPData();
  const previousLevel = getLevelFromXP(data.totalXP);

  data.totalXP += amount;
  data.lastUpdated = Date.now();
  saveXPData(data);

  const newLevel = getLevelFromXP(data.totalXP);
  const leveledUp = newLevel.level > previousLevel.level;

  return {
    newTotal: data.totalXP,
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
  };
}

// Get level from XP amount
export function getLevelFromXP(xp: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

// Get current level
export function getCurrentLevel(): LevelInfo {
  return getLevelFromXP(getTotalXP());
}

// Get progress towards next level (0-100%)
export function getLevelProgress(): number {
  const xp = getTotalXP();
  const level = getLevelFromXP(xp);

  if (level.maxXP === Infinity) return 100;

  const xpInLevel = xp - level.minXP;
  const xpForLevel = level.maxXP - level.minXP;

  return Math.min(Math.round((xpInLevel / xpForLevel) * 100), 100);
}

// Get XP needed for next level
export function getXPToNextLevel(): number {
  const xp = getTotalXP();
  const level = getLevelFromXP(xp);

  if (level.maxXP === Infinity) return 0;

  return level.maxXP - xp;
}

// Get all level info
export function getAllLevels(): LevelInfo[] {
  return LEVELS;
}

// Award XP for a review
export function awardReviewXP(grade: 'again' | 'hard' | 'good' | 'easy'): { xpEarned: number; newTotal: number; leveledUp: boolean; newLevel?: LevelInfo } {
  let xpEarned: number;

  switch (grade) {
    case 'again':
      xpEarned = XP_REWARDS.REVIEW_FORGOT;
      break;
    case 'hard':
      xpEarned = XP_REWARDS.REVIEW_HARD;
      break;
    case 'good':
    case 'easy':
      xpEarned = XP_REWARDS.REVIEW_CORRECT;
      break;
    default:
      xpEarned = XP_REWARDS.REVIEW_FORGOT;
  }

  const result = addXP(xpEarned);
  return { xpEarned, ...result };
}

// Format XP with thousands separator
export function formatXP(xp: number): string {
  return xp.toLocaleString();
}
