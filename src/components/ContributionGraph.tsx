import { useState, useEffect } from 'react';
import { getAllReviews } from '../db/reviews';

interface ContributionGraphProps {
  isDark: boolean;
}

interface DayData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const WEEKS_TO_SHOW = 12;
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 5) return 1;
  if (count <= 15) return 2;
  if (count <= 30) return 3;
  return 4;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ContributionGraph({ isDark }: ContributionGraphProps) {
  const [data, setData] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalReviews, setTotalReviews] = useState(0);
  const [activeDays, setActiveDays] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const reviews = await getAllReviews();

      // Count reviews by day for the last N weeks
      const dayMap = new Map<string, number>();
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - (WEEKS_TO_SHOW * 7));
      startDate.setHours(0, 0, 0, 0);

      // Initialize all days
      for (let i = 0; i < WEEKS_TO_SHOW * 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dayMap.set(dateStr, 0);
      }

      // Count reviews
      let total = 0;
      for (const review of reviews) {
        const date = new Date(review.reviewedAt);
        const dateStr = date.toISOString().split('T')[0];
        if (dayMap.has(dateStr)) {
          dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
          total++;
        }
      }

      // Convert to array
      const days: DayData[] = [];
      let active = 0;
      for (const [date, count] of dayMap) {
        if (count > 0) active++;
        days.push({
          date,
          count,
          level: getLevel(count),
        });
      }

      setData(days);
      setTotalReviews(total);
      setActiveDays(active);
    } catch (error) {
      console.error('Failed to load contribution data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className={`animate-pulse h-24 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
      </div>
    );
  }

  // Group by weeks (columns)
  const weeks: DayData[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  // Color classes based on level
  const getLevelClass = (level: number) => {
    if (isDark) {
      switch (level) {
        case 0: return 'bg-gray-700';
        case 1: return 'bg-emerald-900';
        case 2: return 'bg-emerald-700';
        case 3: return 'bg-emerald-500';
        case 4: return 'bg-emerald-400';
        default: return 'bg-gray-700';
      }
    } else {
      switch (level) {
        case 0: return 'bg-gray-100';
        case 1: return 'bg-emerald-200';
        case 2: return 'bg-emerald-400';
        case 3: return 'bg-emerald-500';
        case 4: return 'bg-emerald-600';
        default: return 'bg-gray-100';
      }
    }
  };

  return (
    <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Activity
        </h3>
        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {totalReviews} reviews · {activeDays} active days
        </span>
      </div>

      {/* Graph */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-0.5">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 mr-1">
            {[0, 2, 4, 6].map((dayIndex) => (
              <div
                key={dayIndex}
                className={`h-3 text-[8px] leading-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                style={{ height: dayIndex === 0 ? '13px' : '13px' }}
              >
                {dayIndex === 0 || dayIndex === 2 || dayIndex === 4 || dayIndex === 6
                  ? DAYS_OF_WEEK[dayIndex].substring(0, 1)
                  : ''}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-0.5">
              {week.map((day, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`w-3 h-3 rounded-sm ${getLevelClass(day.level)} cursor-pointer transition-transform hover:scale-125`}
                  title={`${formatDate(day.date)}: ${day.count} reviews`}
                  aria-label={`${formatDate(day.date)}: ${day.count} reviews`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2">
        <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`w-2.5 h-2.5 rounded-sm ${getLevelClass(level)}`}
          />
        ))}
        <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>More</span>
      </div>
    </div>
  );
}
