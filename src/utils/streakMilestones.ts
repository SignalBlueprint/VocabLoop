import { addXP } from './xp';

const MILESTONES_KEY = 'vocabloop_streak_milestones';

export interface StreakMilestone {
  days: number;
  title: string;
  message: string;
  icon: string;
  xpReward: number;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, title: 'Getting Started!', message: '3 days of consistent learning', icon: '🌱', xpReward: 25 },
  { days: 7, title: 'One Week Strong!', message: 'A full week of dedication', icon: '🔥', xpReward: 50 },
  { days: 14, title: 'Two Week Champion!', message: 'Building a solid habit', icon: '💪', xpReward: 100 },
  { days: 21, title: 'Habit Formed!', message: '21 days - habits stick now!', icon: '🧠', xpReward: 150 },
  { days: 30, title: 'Monthly Master!', message: 'One month of learning', icon: '🌟', xpReward: 200 },
  { days: 50, title: 'Halfway to 100!', message: '50 days of dedication', icon: '🚀', xpReward: 300 },
  { days: 75, title: 'Three Quarters!', message: '75 days - unstoppable!', icon: '⚡', xpReward: 400 },
  { days: 100, title: 'Century Club!', message: '100 days of learning!', icon: '🏆', xpReward: 500 },
  { days: 150, title: 'Super Streak!', message: '150 days strong!', icon: '💎', xpReward: 750 },
  { days: 200, title: 'Legend Status!', message: '200 days - true legend!', icon: '👑', xpReward: 1000 },
  { days: 365, title: 'One Year Strong!', message: 'A full year of learning!', icon: '🎉', xpReward: 2000 },
];

// Get milestones that have been claimed
function getClaimedMilestones(): Set<number> {
  const stored = localStorage.getItem(MILESTONES_KEY);
  if (!stored) return new Set();
  try {
    return new Set(JSON.parse(stored));
  } catch {
    return new Set();
  }
}

// Save claimed milestones
function saveClaimedMilestones(milestones: Set<number>): void {
  localStorage.setItem(MILESTONES_KEY, JSON.stringify([...milestones]));
}

// Check if a milestone has been claimed
export function isMilestoneClaimed(days: number): boolean {
  return getClaimedMilestones().has(days);
}

// Get unclaimed milestone for current streak (if any)
export function getUnclaimedMilestone(currentStreak: number): StreakMilestone | null {
  const claimed = getClaimedMilestones();

  // Find the highest unclaimed milestone at or below current streak
  const eligible = STREAK_MILESTONES
    .filter(m => m.days <= currentStreak && !claimed.has(m.days))
    .sort((a, b) => b.days - a.days);

  return eligible[0] || null;
}

// Claim a milestone and award XP
export function claimMilestone(days: number): { xpAwarded: number; milestone: StreakMilestone } | null {
  const milestone = STREAK_MILESTONES.find(m => m.days === days);
  if (!milestone) return null;

  const claimed = getClaimedMilestones();
  if (claimed.has(days)) return null;

  // Award XP
  addXP(milestone.xpReward);

  // Mark as claimed
  claimed.add(days);
  saveClaimedMilestones(claimed);

  return { xpAwarded: milestone.xpReward, milestone };
}

// Get next milestone to achieve
export function getNextMilestone(currentStreak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find(m => m.days > currentStreak) || null;
}

// Get progress to next milestone
export function getMilestoneProgress(currentStreak: number): { current: number; target: number; percentage: number } | null {
  const next = getNextMilestone(currentStreak);
  if (!next) return null;

  // Find previous milestone
  const previousMilestones = STREAK_MILESTONES.filter(m => m.days <= currentStreak);
  const previousDays = previousMilestones.length > 0
    ? previousMilestones[previousMilestones.length - 1].days
    : 0;

  const progressInRange = currentStreak - previousDays;
  const rangeSize = next.days - previousDays;
  const percentage = Math.round((progressInRange / rangeSize) * 100);

  return { current: currentStreak, target: next.days, percentage };
}

// Get all milestones with their status
export function getAllMilestonesWithStatus(currentStreak: number): Array<StreakMilestone & { status: 'claimed' | 'available' | 'locked' }> {
  const claimed = getClaimedMilestones();

  return STREAK_MILESTONES.map(milestone => ({
    ...milestone,
    status: claimed.has(milestone.days)
      ? 'claimed'
      : milestone.days <= currentStreak
      ? 'available'
      : 'locked',
  }));
}
