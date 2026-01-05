// Time of day analytics - track when users study best

const ANALYTICS_KEY = 'vocabloop_time_analytics';

interface ReviewSession {
  hour: number; // 0-23
  dayOfWeek: number; // 0-6 (Sunday = 0)
  cardCount: number;
  correctCount: number; // Good/Easy grades
  timestamp: number;
}

interface TimeAnalyticsState {
  sessions: ReviewSession[];
}

function getState(): TimeAnalyticsState {
  const stored = localStorage.getItem(ANALYTICS_KEY);
  if (!stored) {
    return { sessions: [] };
  }
  try {
    return JSON.parse(stored);
  } catch {
    return { sessions: [] };
  }
}

function saveState(state: TimeAnalyticsState): void {
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(state));
}

// Record a review session
export function recordReviewSession(cardCount: number, correctCount: number): void {
  const now = new Date();
  const state = getState();

  const session: ReviewSession = {
    hour: now.getHours(),
    dayOfWeek: now.getDay(),
    cardCount,
    correctCount,
    timestamp: now.getTime(),
  };

  state.sessions.push(session);

  // Keep only last 90 days of data
  const ninetyDaysAgo = now.getTime() - (90 * 24 * 60 * 60 * 1000);
  state.sessions = state.sessions.filter(s => s.timestamp > ninetyDaysAgo);

  saveState(state);
}

// Get hourly performance data
export function getHourlyStats(): Array<{
  hour: number;
  label: string;
  sessionCount: number;
  avgAccuracy: number;
  totalCards: number;
}> {
  const state = getState();
  const hourlyData: Map<number, { sessions: number; correct: number; total: number }> = new Map();

  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    hourlyData.set(i, { sessions: 0, correct: 0, total: 0 });
  }

  // Aggregate session data
  for (const session of state.sessions) {
    const data = hourlyData.get(session.hour)!;
    data.sessions++;
    data.correct += session.correctCount;
    data.total += session.cardCount;
  }

  // Convert to array with labels
  const result: Array<{
    hour: number;
    label: string;
    sessionCount: number;
    avgAccuracy: number;
    totalCards: number;
  }> = [];

  for (let hour = 0; hour < 24; hour++) {
    const data = hourlyData.get(hour)!;
    const avgAccuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;

    let label: string;
    if (hour === 0) label = '12 AM';
    else if (hour < 12) label = `${hour} AM`;
    else if (hour === 12) label = '12 PM';
    else label = `${hour - 12} PM`;

    result.push({
      hour,
      label,
      sessionCount: data.sessions,
      avgAccuracy,
      totalCards: data.total,
    });
  }

  return result;
}

// Get day of week performance data
export function getDayOfWeekStats(): Array<{
  day: number;
  name: string;
  shortName: string;
  sessionCount: number;
  avgAccuracy: number;
  totalCards: number;
}> {
  const state = getState();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dayData: Map<number, { sessions: number; correct: number; total: number }> = new Map();

  // Initialize all days
  for (let i = 0; i < 7; i++) {
    dayData.set(i, { sessions: 0, correct: 0, total: 0 });
  }

  // Aggregate session data
  for (const session of state.sessions) {
    const data = dayData.get(session.dayOfWeek)!;
    data.sessions++;
    data.correct += session.correctCount;
    data.total += session.cardCount;
  }

  // Convert to array
  const result: Array<{
    day: number;
    name: string;
    shortName: string;
    sessionCount: number;
    avgAccuracy: number;
    totalCards: number;
  }> = [];

  for (let day = 0; day < 7; day++) {
    const data = dayData.get(day)!;
    const avgAccuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;

    result.push({
      day,
      name: dayNames[day],
      shortName: shortNames[day],
      sessionCount: data.sessions,
      avgAccuracy,
      totalCards: data.total,
    });
  }

  return result;
}

// Get best time to study (based on accuracy)
export function getBestStudyTime(): {
  bestHour: { hour: number; label: string; accuracy: number } | null;
  bestDay: { day: number; name: string; accuracy: number } | null;
  totalSessions: number;
} {
  const hourlyStats = getHourlyStats();
  const dayStats = getDayOfWeekStats();

  // Find best hour (with at least 5 cards reviewed)
  const hoursWithData = hourlyStats.filter(h => h.totalCards >= 5);
  const bestHour = hoursWithData.length > 0
    ? hoursWithData.reduce((best, h) => h.avgAccuracy > best.avgAccuracy ? h : best)
    : null;

  // Find best day (with at least 5 cards reviewed)
  const daysWithData = dayStats.filter(d => d.totalCards >= 5);
  const bestDay = daysWithData.length > 0
    ? daysWithData.reduce((best, d) => d.avgAccuracy > best.avgAccuracy ? d : best)
    : null;

  const totalSessions = hourlyStats.reduce((sum, h) => sum + h.sessionCount, 0);

  return {
    bestHour: bestHour ? { hour: bestHour.hour, label: bestHour.label, accuracy: bestHour.avgAccuracy } : null,
    bestDay: bestDay ? { day: bestDay.day, name: bestDay.name, accuracy: bestDay.avgAccuracy } : null,
    totalSessions,
  };
}

// Get time period summary
export function getTimePeriodStats(): {
  morning: { sessions: number; accuracy: number }; // 5-11
  afternoon: { sessions: number; accuracy: number }; // 12-17
  evening: { sessions: number; accuracy: number }; // 18-21
  night: { sessions: number; accuracy: number }; // 22-4
} {
  const periods = {
    morning: { hours: [5, 6, 7, 8, 9, 10, 11], sessions: 0, correct: 0, total: 0 },
    afternoon: { hours: [12, 13, 14, 15, 16, 17], sessions: 0, correct: 0, total: 0 },
    evening: { hours: [18, 19, 20, 21], sessions: 0, correct: 0, total: 0 },
    night: { hours: [22, 23, 0, 1, 2, 3, 4], sessions: 0, correct: 0, total: 0 },
  };

  const state = getState();

  for (const session of state.sessions) {
    for (const [, data] of Object.entries(periods)) {
      if (data.hours.includes(session.hour)) {
        data.sessions++;
        data.correct += session.correctCount;
        data.total += session.cardCount;
      }
    }
  }

  return {
    morning: {
      sessions: periods.morning.sessions,
      accuracy: periods.morning.total > 0 ? Math.round((periods.morning.correct / periods.morning.total) * 100) : 0,
    },
    afternoon: {
      sessions: periods.afternoon.sessions,
      accuracy: periods.afternoon.total > 0 ? Math.round((periods.afternoon.correct / periods.afternoon.total) * 100) : 0,
    },
    evening: {
      sessions: periods.evening.sessions,
      accuracy: periods.evening.total > 0 ? Math.round((periods.evening.correct / periods.evening.total) * 100) : 0,
    },
    night: {
      sessions: periods.night.sessions,
      accuracy: periods.night.total > 0 ? Math.round((periods.night.correct / periods.night.total) * 100) : 0,
    },
  };
}
