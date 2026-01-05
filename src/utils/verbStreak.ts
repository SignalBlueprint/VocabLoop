const VERB_STREAK_KEY = 'vocabloop_verb_streak';
const VERB_LAST_PRACTICE_KEY = 'vocabloop_verb_last_practice';

interface VerbStats {
  streak: number;
  lastPracticeDate: string | null;
  totalSessions: number;
}

// Get date string in local timezone (YYYY-MM-DD)
function getLocalDateString(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format
}

// Get yesterday's date string
function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateString(yesterday);
}

// Get verb practice stats
export function getVerbStats(): VerbStats {
  const streakData = localStorage.getItem(VERB_STREAK_KEY);
  const lastPractice = localStorage.getItem(VERB_LAST_PRACTICE_KEY);

  if (!streakData) {
    return { streak: 0, lastPracticeDate: null, totalSessions: 0 };
  }

  try {
    const stats = JSON.parse(streakData);
    return {
      streak: stats.streak || 0,
      lastPracticeDate: lastPractice,
      totalSessions: stats.totalSessions || 0,
    };
  } catch {
    return { streak: 0, lastPracticeDate: lastPractice, totalSessions: 0 };
  }
}

// Record a completed verb practice session
export function recordVerbPractice(): VerbStats {
  const stats = getVerbStats();
  const today = getLocalDateString();
  const yesterday = getYesterdayDateString();

  let newStreak = stats.streak;
  const newTotalSessions = stats.totalSessions + 1;

  // Calculate new streak
  if (stats.lastPracticeDate === today) {
    // Already practiced today, streak doesn't change
  } else if (stats.lastPracticeDate === yesterday) {
    // Practiced yesterday, extend streak
    newStreak = stats.streak + 1;
  } else if (stats.lastPracticeDate === null) {
    // First practice ever
    newStreak = 1;
  } else {
    // Streak broken, start fresh
    newStreak = 1;
  }

  // Save updated stats
  localStorage.setItem(VERB_LAST_PRACTICE_KEY, today);
  localStorage.setItem(VERB_STREAK_KEY, JSON.stringify({
    streak: newStreak,
    totalSessions: newTotalSessions,
  }));

  return {
    streak: newStreak,
    lastPracticeDate: today,
    totalSessions: newTotalSessions,
  };
}

// Check if practiced today
export function hasPracticedToday(): boolean {
  const lastPractice = localStorage.getItem(VERB_LAST_PRACTICE_KEY);
  return lastPractice === getLocalDateString();
}
