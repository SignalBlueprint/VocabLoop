import { useState, useEffect } from 'react';
import { getReviewsInRange } from '../db/reviews';
import { getTotalXP, getCurrentLevel } from '../utils/xp';
import { calculateStreak } from '../utils/streak';
import { getWeeklyStudyTime } from '../utils/studyTime';
import type { Page } from '../types';

interface ProgressSummaryProps {
  isDark: boolean;
  onNavigate: (page: Page) => void;
}

interface WeeklyStats {
  cardsReviewed: number;
  xpEarned: number;
  streak: number;
  studyMinutes: number;
  level: number;
  levelTitle: string;
}

export function ProgressSummary({ isDark, onNavigate }: ProgressSummaryProps) {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

      const [reviews, streak, level] = await Promise.all([
        getReviewsInRange(weekAgo, now),
        calculateStreak(),
        Promise.resolve(getCurrentLevel()),
      ]);

      const studyTime = getWeeklyStudyTime();

      setStats({
        cardsReviewed: reviews.length,
        xpEarned: getTotalXP(),
        streak,
        studyMinutes: studyTime.minutes,
        level: level.level,
        levelTitle: level.title,
      });
    } catch (error) {
      console.error('Failed to load progress stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return null;
  }

  const statItems = [
    { label: 'This Week', value: stats.cardsReviewed, icon: '📚', color: 'text-blue-500' },
    { label: 'Streak', value: `${stats.streak}d`, icon: '🔥', color: 'text-orange-500' },
    { label: 'Level', value: stats.level, icon: '⭐', color: 'text-amber-500' },
    { label: 'Minutes', value: stats.studyMinutes, icon: '⏱️', color: 'text-emerald-500' },
  ];

  return (
    <button
      onClick={() => onNavigate('stats')}
      className={`w-full rounded-xl p-4 mb-4 ${isDark ? 'bg-gradient-to-r from-gray-800 to-gray-800/80' : 'bg-gradient-to-r from-white to-gray-50'} shadow-sm transition-all hover:shadow-md`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Your Progress
        </h3>
        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Tap for details →
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {statItems.map((item) => (
          <div key={item.label} className="text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-sm" aria-hidden="true">{item.icon}</span>
              <span className={`text-lg font-bold ${item.color}`}>{item.value}</span>
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </button>
  );
}
