import { useState, useEffect, useMemo } from 'react';
import { getAllReviews } from '../db/reviews';

interface HeatmapCalendarProps {
  isDark: boolean;
}

interface DayData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface MonthData {
  month: number;
  year: number;
  days: (DayData | null)[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function HeatmapCalendar({ isDark }: HeatmapCalendarProps) {
  const [reviewData, setReviewData] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'year' | 'month'>('year');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [stats, setStats] = useState({ totalReviews: 0, activeDays: 0, currentStreak: 0, longestStreak: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const reviews = await getAllReviews();
      const dayMap = new Map<string, number>();

      // Count reviews by day for the past year
      for (const review of reviews) {
        const date = new Date(review.reviewedAt);
        const dateStr = date.toISOString().split('T')[0];
        dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
      }

      setReviewData(dayMap);

      // Calculate stats
      let totalReviews = 0;
      let activeDays = 0;
      for (const count of dayMap.values()) {
        totalReviews += count;
        if (count > 0) activeDays++;
      }

      // Calculate streaks
      const sortedDates = Array.from(dayMap.keys())
        .filter(d => dayMap.get(d)! > 0)
        .sort();

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // Check if today has reviews
      if (dayMap.has(todayStr) && dayMap.get(todayStr)! > 0) {
        currentStreak = 1;
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - 1);

        while (true) {
          const checkStr = checkDate.toISOString().split('T')[0];
          if (dayMap.has(checkStr) && dayMap.get(checkStr)! > 0) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      } else {
        // Check yesterday
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (dayMap.has(yesterdayStr) && dayMap.get(yesterdayStr)! > 0) {
          currentStreak = 1;
          const checkDate = new Date(yesterday);
          checkDate.setDate(checkDate.getDate() - 1);

          while (true) {
            const checkStr = checkDate.toISOString().split('T')[0];
            if (dayMap.has(checkStr) && dayMap.get(checkStr)! > 0) {
              currentStreak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
        }
      }

      // Calculate longest streak
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const prev = new Date(sortedDates[i - 1]);
          const curr = new Date(sortedDates[i]);
          const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

          if (diff === 1) {
            tempStreak++;
          } else {
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }

      setStats({ totalReviews, activeDays, currentStreak, longestStreak });
    } catch (error) {
      console.error('Failed to load heatmap data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate year data (last 52 weeks)
  const yearData = useMemo(() => {
    const data: DayData[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Go back to the start of the week, 52 weeks ago
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - startDate.getDay() - (52 * 7));

    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const count = reviewData.get(dateStr) || 0;
      data.push({
        date: dateStr,
        count,
        level: getLevel(count),
      });
    }

    return data;
  }, [reviewData]);

  // Generate month data
  const monthData = useMemo((): MonthData => {
    const { month, year } = selectedMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days: (DayData | null)[] = [];

    // Add padding for days before the 1st
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Add actual days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().split('T')[0];
      const count = reviewData.get(dateStr) || 0;
      days.push({
        date: dateStr,
        count,
        level: getLevel(count),
      });
    }

    return { month, year, days };
  }, [reviewData, selectedMonth]);

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
        case 0: return 'bg-gray-200';
        case 1: return 'bg-emerald-200';
        case 2: return 'bg-emerald-400';
        case 3: return 'bg-emerald-500';
        case 4: return 'bg-emerald-600';
        default: return 'bg-gray-200';
      }
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedMonth(prev => {
      const newMonth = direction === 'prev' ? prev.month - 1 : prev.month + 1;
      if (newMonth < 0) {
        return { month: 11, year: prev.year - 1 };
      } else if (newMonth > 11) {
        return { month: 0, year: prev.year + 1 };
      }
      return { ...prev, month: newMonth };
    });
  };

  if (isLoading) {
    return (
      <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className={`animate-pulse h-40 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
      </div>
    );
  }

  // Group year data by weeks
  const weeks: DayData[][] = [];
  for (let i = 0; i < yearData.length; i += 7) {
    weeks.push(yearData.slice(i, i + 7));
  }

  // Get month labels for year view
  const monthLabels: { month: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, weekIndex) => {
    if (week.length > 0) {
      const firstDayOfWeek = new Date(week[0].date);
      const month = firstDayOfWeek.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ month: MONTHS[month], weekIndex });
        lastMonth = month;
      }
    }
  });

  return (
    <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Activity Calendar
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('year')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              viewMode === 'year'
                ? 'bg-emerald-600 text-white'
                : isDark
                ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Year
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              viewMode === 'month'
                ? 'bg-emerald-600 text-white'
                : isDark
                ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-4 text-xs">
        <div className="text-center">
          <p className={`font-bold text-lg text-emerald-500`}>{stats.totalReviews.toLocaleString()}</p>
          <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>Reviews</p>
        </div>
        <div className="text-center">
          <p className={`font-bold text-lg text-blue-500`}>{stats.activeDays}</p>
          <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>Active Days</p>
        </div>
        <div className="text-center">
          <p className={`font-bold text-lg text-orange-500`}>{stats.currentStreak}</p>
          <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>Current Streak</p>
        </div>
        <div className="text-center">
          <p className={`font-bold text-lg text-purple-500`}>{stats.longestStreak}</p>
          <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>Best Streak</p>
        </div>
      </div>

      {viewMode === 'year' ? (
        <>
          {/* Year View */}
          <div className="overflow-x-auto pb-2">
            {/* Month labels */}
            <div className="flex mb-1 ml-4">
              {monthLabels.map(({ month, weekIndex }, i) => (
                <div
                  key={i}
                  className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                  style={{
                    position: 'relative',
                    left: `${weekIndex * 14}px`,
                    marginRight: i < monthLabels.length - 1
                      ? `${(monthLabels[i + 1].weekIndex - weekIndex - 1) * 14}px`
                      : 0,
                  }}
                >
                  {month}
                </div>
              ))}
            </div>

            <div className="flex gap-0.5">
              {/* Day labels */}
              <div className="flex flex-col gap-0.5 mr-1">
                {DAYS_OF_WEEK.map((day, i) => (
                  <div
                    key={i}
                    className={`h-3 text-[8px] leading-3 w-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                    style={{ visibility: i % 2 === 1 ? 'visible' : 'hidden' }}
                  >
                    {day.charAt(0)}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-0.5">
                  {week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`w-3 h-3 rounded-sm ${getLevelClass(day.level)} cursor-pointer transition-all hover:scale-125 hover:ring-2 hover:ring-emerald-400`}
                      title={`${formatDate(day.date)}: ${day.count} reviews`}
                      onClick={() => setSelectedDay(day)}
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
        </>
      ) : (
        <>
          {/* Month View */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigateMonth('prev')}
              className={`p-1 rounded ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              ←
            </button>
            <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {MONTHS[monthData.month]} {monthData.year}
            </span>
            <button
              onClick={() => navigateMonth('next')}
              className={`p-1 rounded ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              →
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS_OF_WEEK.map(day => (
              <div
                key={day}
                className={`text-center text-[10px] font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
              >
                {day.charAt(0)}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthData.days.map((day, i) => (
              <div
                key={i}
                className={`aspect-square rounded-md flex items-center justify-center text-xs relative ${
                  day
                    ? `${getLevelClass(day.level)} cursor-pointer hover:ring-2 hover:ring-emerald-400`
                    : 'bg-transparent'
                }`}
                onClick={() => day && setSelectedDay(day)}
                title={day ? `${formatDate(day.date)}: ${day.count} reviews` : ''}
              >
                {day && (
                  <span className={`text-[10px] ${
                    day.level > 0
                      ? 'text-white font-medium'
                      : isDark ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {new Date(day.date).getDate()}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Month summary */}
          <div className={`mt-3 text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {monthData.days.filter(d => d && d.count > 0).length} active days this month
          </div>
        </>
      )}

      {/* Selected day popup */}
      {selectedDay && (
        <div
          className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                {formatDate(selectedDay.date)}
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {selectedDay.count === 0
                  ? 'No reviews'
                  : selectedDay.count === 1
                  ? '1 review completed'
                  : `${selectedDay.count} reviews completed`}
              </p>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className={isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-500'}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
