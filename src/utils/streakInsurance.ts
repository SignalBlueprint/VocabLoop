import { getTotalXP, addXP } from './xp';

const INSURANCE_KEY = 'vocabloop_streak_insurance';
const INSURANCE_COST = 100; // XP cost to buy streak insurance
const MAX_USES_PER_WEEK = 1; // Can only use once per week

interface InsuranceState {
  lastUsedWeek: string; // ISO week string
  usesThisWeek: number;
}

function getWeekKey(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber}`;
}

function getState(): InsuranceState {
  const stored = localStorage.getItem(INSURANCE_KEY);
  if (!stored) {
    return { lastUsedWeek: '', usesThisWeek: 0 };
  }
  try {
    return JSON.parse(stored);
  } catch {
    return { lastUsedWeek: '', usesThisWeek: 0 };
  }
}

function saveState(state: InsuranceState): void {
  localStorage.setItem(INSURANCE_KEY, JSON.stringify(state));
}

// Check if user can use streak insurance
export function canUseStreakInsurance(): { canUse: boolean; reason?: string } {
  const state = getState();
  const currentWeek = getWeekKey();

  // Reset uses if new week
  if (state.lastUsedWeek !== currentWeek) {
    state.usesThisWeek = 0;
    state.lastUsedWeek = currentWeek;
    saveState(state);
  }

  // Check if already used this week
  if (state.usesThisWeek >= MAX_USES_PER_WEEK) {
    return { canUse: false, reason: 'Already used streak insurance this week' };
  }

  // Check if user has enough XP
  const currentXP = getTotalXP();
  if (currentXP < INSURANCE_COST) {
    return { canUse: false, reason: `Need ${INSURANCE_COST} XP (have ${currentXP})` };
  }

  return { canUse: true };
}

// Use streak insurance (costs XP, saves streak)
export function useStreakInsurance(): { success: boolean; message: string } {
  const check = canUseStreakInsurance();
  if (!check.canUse) {
    return { success: false, message: check.reason || 'Cannot use streak insurance' };
  }

  const state = getState();
  const currentWeek = getWeekKey();

  // Deduct XP
  addXP(-INSURANCE_COST);

  // Record usage
  state.lastUsedWeek = currentWeek;
  state.usesThisWeek++;
  saveState(state);

  // Mark today as having reviewed (to save streak)
  // This is done by adding a fake review timestamp
  const STREAK_KEY = 'vocabloop_streak_data';
  const streakData = localStorage.getItem(STREAK_KEY);
  const data = streakData ? JSON.parse(streakData) : { lastReviewDate: null };
  data.lastReviewDate = new Date().toISOString().split('T')[0];
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));

  return { success: true, message: `Streak saved! -${INSURANCE_COST} XP` };
}

// Get streak insurance status
export function getStreakInsuranceStatus(): {
  cost: number;
  usesRemaining: number;
  canUse: boolean;
  reason?: string;
} {
  const state = getState();
  const currentWeek = getWeekKey();

  // Reset uses if new week
  if (state.lastUsedWeek !== currentWeek) {
    state.usesThisWeek = 0;
  }

  const check = canUseStreakInsurance();

  return {
    cost: INSURANCE_COST,
    usesRemaining: MAX_USES_PER_WEEK - state.usesThisWeek,
    canUse: check.canUse,
    reason: check.reason,
  };
}
