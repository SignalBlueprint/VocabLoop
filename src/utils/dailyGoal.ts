const DAILY_GOAL_KEY = 'vocabloop_daily_goal';
const DAILY_PROGRESS_KEY = 'vocabloop_daily_progress';

interface DailyGoalData {
  target: number;
  date: string;
  completed: number;
  celebrationShown: boolean;
}

// Get date string in local timezone (YYYY-MM-DD)
function getLocalDateString(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format
}

// Get the default daily goal (10 reviews)
export const DEFAULT_DAILY_GOAL = 10;

// Get the current daily goal target
export function getDailyGoalTarget(): number {
  const saved = localStorage.getItem(DAILY_GOAL_KEY);
  if (saved) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_DAILY_GOAL;
}

// Set the daily goal target
export function setDailyGoalTarget(target: number): void {
  if (target > 0 && target <= 100) {
    localStorage.setItem(DAILY_GOAL_KEY, target.toString());
  }
}

// Get today's progress
export function getDailyProgress(): DailyGoalData {
  const today = getLocalDateString();
  const saved = localStorage.getItem(DAILY_PROGRESS_KEY);

  if (saved) {
    try {
      const data = JSON.parse(saved) as DailyGoalData;
      // Reset if it's a new day
      if (data.date !== today) {
        return {
          target: getDailyGoalTarget(),
          date: today,
          completed: 0,
          celebrationShown: false,
        };
      }
      return {
        ...data,
        target: getDailyGoalTarget(), // Always use current target setting
      };
    } catch {
      // Invalid data, start fresh
    }
  }

  return {
    target: getDailyGoalTarget(),
    date: today,
    completed: 0,
    celebrationShown: false,
  };
}

// Increment daily progress (called after each review)
export function incrementDailyProgress(): DailyGoalData {
  const progress = getDailyProgress();
  const newProgress: DailyGoalData = {
    ...progress,
    completed: progress.completed + 1,
  };
  localStorage.setItem(DAILY_PROGRESS_KEY, JSON.stringify(newProgress));
  return newProgress;
}

// Set daily progress directly (for syncing with actual review count)
export function setDailyProgress(completed: number): DailyGoalData {
  const progress = getDailyProgress();
  const newProgress: DailyGoalData = {
    ...progress,
    completed,
  };
  localStorage.setItem(DAILY_PROGRESS_KEY, JSON.stringify(newProgress));
  return newProgress;
}

// Mark celebration as shown
export function markCelebrationShown(): void {
  const progress = getDailyProgress();
  const newProgress: DailyGoalData = {
    ...progress,
    celebrationShown: true,
  };
  localStorage.setItem(DAILY_PROGRESS_KEY, JSON.stringify(newProgress));
}

// Check if goal is complete and celebration hasn't been shown
export function shouldShowCelebration(): boolean {
  const progress = getDailyProgress();
  return progress.completed >= progress.target && !progress.celebrationShown;
}

// Get progress percentage (capped at 100)
export function getProgressPercentage(): number {
  const progress = getDailyProgress();
  if (progress.target === 0) return 0;
  return Math.min(100, Math.round((progress.completed / progress.target) * 100));
}
