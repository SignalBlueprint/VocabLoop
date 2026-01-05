// Study time tracking utilities
// Stores study sessions in localStorage for performance

interface StudySession {
  date: string;          // ISO date string (YYYY-MM-DD)
  durationMs: number;    // Total study time in milliseconds
  reviews: number;       // Number of reviews completed
}

interface ActiveSession {
  startTime: number;     // Timestamp when session started
  reviews: number;       // Reviews in current session
}

const STORAGE_KEY = 'vocabloop_study_time';
const ACTIVE_SESSION_KEY = 'vocabloop_active_session';

// Get all study sessions
function getStudySessions(): StudySession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save study sessions
function saveStudySessions(sessions: StudySession[]): void {
  // Keep only last 90 days of data
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const filtered = sessions.filter(s => s.date >= cutoffStr);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

// Get today's date string
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Start a study session
export function startStudySession(): void {
  const session: ActiveSession = {
    startTime: Date.now(),
    reviews: 0,
  };
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
}

// Record a review in the active session
export function recordReview(): void {
  try {
    const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (stored) {
      const session: ActiveSession = JSON.parse(stored);
      session.reviews++;
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore errors
  }
}

// End the current study session and save the data
export function endStudySession(): void {
  try {
    const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!stored) return;

    const activeSession: ActiveSession = JSON.parse(stored);
    const duration = Date.now() - activeSession.startTime;

    // Only save if session was at least 5 seconds (ignore accidental starts)
    if (duration < 5000) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      return;
    }

    const today = getTodayString();
    const sessions = getStudySessions();

    // Find or create today's session
    const existingIndex = sessions.findIndex(s => s.date === today);
    if (existingIndex >= 0) {
      sessions[existingIndex].durationMs += duration;
      sessions[existingIndex].reviews += activeSession.reviews;
    } else {
      sessions.push({
        date: today,
        durationMs: duration,
        reviews: activeSession.reviews,
      });
    }

    saveStudySessions(sessions);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }
}

// Get study time for today (in minutes)
export function getTodayStudyTime(): { minutes: number; reviews: number } {
  const today = getTodayString();
  const sessions = getStudySessions();
  const todaySession = sessions.find(s => s.date === today);

  // Add active session time if exists
  let activeMinutes = 0;
  let activeReviews = 0;
  try {
    const activeStored = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (activeStored) {
      const active: ActiveSession = JSON.parse(activeStored);
      activeMinutes = (Date.now() - active.startTime) / 60000;
      activeReviews = active.reviews;
    }
  } catch {
    // Ignore
  }

  return {
    minutes: Math.round((todaySession?.durationMs || 0) / 60000 + activeMinutes),
    reviews: (todaySession?.reviews || 0) + activeReviews,
  };
}

// Get study time for the current week (in minutes)
export function getWeeklyStudyTime(): { minutes: number; reviews: number; dailyBreakdown: { day: string; minutes: number }[] } {
  const sessions = getStudySessions();
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0);

  const weekStartStr = weekStart.toISOString().split('T')[0];

  const weekSessions = sessions.filter(s => s.date >= weekStartStr);

  let totalMinutes = 0;
  let totalReviews = 0;
  weekSessions.forEach(s => {
    totalMinutes += s.durationMs / 60000;
    totalReviews += s.reviews;
  });

  // Build daily breakdown
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyBreakdown = days.map((day, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const dateStr = date.toISOString().split('T')[0];
    const session = sessions.find(s => s.date === dateStr);
    return {
      day,
      minutes: Math.round((session?.durationMs || 0) / 60000),
    };
  });

  return {
    minutes: Math.round(totalMinutes),
    reviews: totalReviews,
    dailyBreakdown,
  };
}

// Get study time for all time
export function getAllTimeStudyTime(): { minutes: number; reviews: number; days: number } {
  const sessions = getStudySessions();

  let totalMinutes = 0;
  let totalReviews = 0;
  sessions.forEach(s => {
    totalMinutes += s.durationMs / 60000;
    totalReviews += s.reviews;
  });

  return {
    minutes: Math.round(totalMinutes),
    reviews: totalReviews,
    days: sessions.length,
  };
}

// Format minutes as human-readable string
export function formatStudyTime(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
