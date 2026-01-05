import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  startStudySession,
  recordReview,
  endStudySession,
  getTodayStudyTime,
  getWeeklyStudyTime,
  getAllTimeStudyTime,
  formatStudyTime,
} from './studyTime';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('Study Time System', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('startStudySession', () => {
    it('should create an active session', () => {
      startStudySession();
      const stored = localStorageMock.getItem('vocabloop_active_session');
      expect(stored).not.toBeNull();

      const session = JSON.parse(stored!);
      expect(session.startTime).toBeDefined();
      expect(session.reviews).toBe(0);
    });
  });

  describe('recordReview', () => {
    it('should increment review count in active session', () => {
      startStudySession();
      recordReview();
      recordReview();

      const stored = localStorageMock.getItem('vocabloop_active_session');
      const session = JSON.parse(stored!);
      expect(session.reviews).toBe(2);
    });

    it('should do nothing if no active session', () => {
      // Should not throw
      expect(() => recordReview()).not.toThrow();
    });
  });

  describe('endStudySession', () => {
    it('should save session data and clear active session', () => {
      startStudySession();
      recordReview();

      // Advance time by 10 minutes
      vi.advanceTimersByTime(10 * 60 * 1000);

      endStudySession();

      // Active session should be cleared
      expect(localStorageMock.getItem('vocabloop_active_session')).toBeNull();

      // Data should be saved
      const stored = localStorageMock.getItem('vocabloop_study_time');
      expect(stored).not.toBeNull();
    });

    it('should not save sessions shorter than 5 seconds', () => {
      startStudySession();

      // Advance time by only 2 seconds
      vi.advanceTimersByTime(2000);

      endStudySession();

      // Data should not be saved
      const stored = localStorageMock.getItem('vocabloop_study_time');
      expect(stored).toBeNull();
    });

    it('should accumulate time for same day', () => {
      // First session
      startStudySession();
      vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
      endStudySession();

      // Second session
      startStudySession();
      vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
      endStudySession();

      const todayTime = getTodayStudyTime();
      expect(todayTime.minutes).toBe(15);
    });

    it('should do nothing if no active session', () => {
      expect(() => endStudySession()).not.toThrow();
    });
  });

  describe('getTodayStudyTime', () => {
    it('should return 0 for no sessions', () => {
      const result = getTodayStudyTime();
      expect(result.minutes).toBe(0);
      expect(result.reviews).toBe(0);
    });

    it('should return correct time and reviews', () => {
      startStudySession();
      recordReview();
      recordReview();
      recordReview();
      vi.advanceTimersByTime(15 * 60 * 1000); // 15 minutes
      endStudySession();

      const result = getTodayStudyTime();
      expect(result.minutes).toBe(15);
      expect(result.reviews).toBe(3);
    });

    it('should include active session time', () => {
      startStudySession();
      vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes (without ending)

      const result = getTodayStudyTime();
      expect(result.minutes).toBe(10);
    });
  });

  describe('getWeeklyStudyTime', () => {
    it('should return 0 for no sessions', () => {
      const result = getWeeklyStudyTime();
      expect(result.minutes).toBe(0);
      expect(result.reviews).toBe(0);
    });

    it('should include daily breakdown', () => {
      const result = getWeeklyStudyTime();
      expect(result.dailyBreakdown).toHaveLength(7);
      expect(result.dailyBreakdown[0].day).toBe('Sun');
      expect(result.dailyBreakdown[6].day).toBe('Sat');
    });

    it('should only include current week data', () => {
      // Set date to Wednesday Jan 15, 2025
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));

      // Add session
      startStudySession();
      vi.advanceTimersByTime(30 * 60 * 1000);
      endStudySession();

      const result = getWeeklyStudyTime();
      expect(result.minutes).toBe(30);
    });
  });

  describe('getAllTimeStudyTime', () => {
    it('should return 0 for no sessions', () => {
      const result = getAllTimeStudyTime();
      expect(result.minutes).toBe(0);
      expect(result.reviews).toBe(0);
      expect(result.days).toBe(0);
    });

    it('should return total time across all days', () => {
      // Day 1
      startStudySession();
      vi.advanceTimersByTime(20 * 60 * 1000);
      endStudySession();

      // Day 2 (advance a day)
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
      startStudySession();
      vi.advanceTimersByTime(30 * 60 * 1000);
      endStudySession();

      const result = getAllTimeStudyTime();
      expect(result.minutes).toBe(50);
      expect(result.days).toBe(2);
    });
  });

  describe('formatStudyTime', () => {
    it('should format < 1 minute', () => {
      expect(formatStudyTime(0)).toBe('< 1 min');
    });

    it('should format minutes only', () => {
      expect(formatStudyTime(1)).toBe('1 min');
      expect(formatStudyTime(30)).toBe('30 min');
      expect(formatStudyTime(59)).toBe('59 min');
    });

    it('should format hours only', () => {
      expect(formatStudyTime(60)).toBe('1h');
      expect(formatStudyTime(120)).toBe('2h');
    });

    it('should format hours and minutes', () => {
      expect(formatStudyTime(90)).toBe('1h 30m');
      expect(formatStudyTime(150)).toBe('2h 30m');
    });
  });
});
