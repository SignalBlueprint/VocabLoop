import { getReviewDays } from '../db/reviews';

/**
 * Calculate the current review streak (consecutive days with at least one review).
 * A streak is only valid if it includes today or yesterday.
 */
export async function calculateStreak(): Promise<number> {
  const reviewDays = await getReviewDays();

  if (reviewDays.size === 0) {
    return 0;
  }

  // Get today's date string
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Get yesterday's date string
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Streak must include today or yesterday to be valid
  if (!reviewDays.has(todayStr) && !reviewDays.has(yesterdayStr)) {
    return 0;
  }

  // Count consecutive days going backwards
  let streak = 0;
  const currentDate = reviewDays.has(todayStr) ? today : yesterday;

  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];

    if (reviewDays.has(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get a formatted date string for display.
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Check if streak is at risk (haven't reviewed today and have an active streak).
 */
export async function isStreakAtRisk(): Promise<{ atRisk: boolean; hoursRemaining: number }> {
  const reviewDays = await getReviewDays();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Already reviewed today - not at risk
  if (reviewDays.has(todayStr)) {
    return { atRisk: false, hoursRemaining: 0 };
  }

  // Have a streak from yesterday - at risk!
  if (reviewDays.has(yesterdayStr)) {
    // Calculate hours until midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const hoursRemaining = Math.floor((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));

    return { atRisk: true, hoursRemaining };
  }

  // No active streak
  return { atRisk: false, hoursRemaining: 0 };
}

/**
 * Check if user has reviewed today.
 */
export async function hasReviewedToday(): Promise<boolean> {
  const reviewDays = await getReviewDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  return reviewDays.has(todayStr);
}
