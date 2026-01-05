import { useState } from 'react';
import {
  getHourlyStats,
  getDayOfWeekStats,
  getBestStudyTime,
  getTimePeriodStats,
} from '../utils/timeAnalytics';

interface TimeAnalyticsProps {
  isDark: boolean;
}

export function TimeAnalytics({ isDark }: TimeAnalyticsProps) {
  const [view, setView] = useState<'periods' | 'hours' | 'days'>('periods');

  const hourlyStats = getHourlyStats();
  const dayStats = getDayOfWeekStats();
  const bestTime = getBestStudyTime();
  const periodStats = getTimePeriodStats();

  if (bestTime.totalSessions < 3) {
    return (
      <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <h3 className="font-semibold mb-2">Study Time Analytics</h3>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Complete more review sessions to see when you study best!
        </p>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Study Time Analytics</h3>
        <div className="flex gap-1 text-xs">
          {(['periods', 'hours', 'days'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2 py-1 rounded transition-colors ${
                view === v
                  ? 'bg-emerald-600 text-white'
                  : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Best time summary */}
      {(bestTime.bestHour || bestTime.bestDay) && (
        <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
          <p className={`text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
            Your best study times:
          </p>
          <div className="flex flex-wrap gap-3 mt-1">
            {bestTime.bestHour && (
              <span className={`text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>
                {bestTime.bestHour.label} ({bestTime.bestHour.accuracy}% accuracy)
              </span>
            )}
            {bestTime.bestDay && (
              <span className={`text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>
                {bestTime.bestDay.name}s ({bestTime.bestDay.accuracy}% accuracy)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Period view */}
      {view === 'periods' && (
        <div className="grid grid-cols-2 gap-3">
          {([
            { key: 'morning', label: 'Morning', icon: '🌅', time: '5 AM - 12 PM' },
            { key: 'afternoon', label: 'Afternoon', icon: '☀️', time: '12 PM - 6 PM' },
            { key: 'evening', label: 'Evening', icon: '🌆', time: '6 PM - 10 PM' },
            { key: 'night', label: 'Night', icon: '🌙', time: '10 PM - 5 AM' },
          ] as const).map(({ key, label, icon, time }) => {
            const data = periodStats[key];
            return (
              <div
                key={key}
                className={`p-3 rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{icon}</span>
                  <span className="font-medium text-sm">{label}</span>
                </div>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{time}</p>
                <div className="mt-2">
                  <p className={`text-lg font-bold ${data.accuracy >= 70 ? 'text-emerald-500' : data.accuracy >= 50 ? 'text-amber-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {data.sessions > 0 ? `${data.accuracy}%` : '-'}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {data.sessions} sessions
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hourly view */}
      {view === 'hours' && (
        <div className="space-y-1">
          {hourlyStats.filter(h => h.sessionCount > 0).length === 0 ? (
            <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              No hourly data yet
            </p>
          ) : (
            hourlyStats
              .filter(h => h.sessionCount > 0)
              .map((h) => (
                <div key={h.hour} className="flex items-center gap-3">
                  <span className={`w-14 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {h.label}
                  </span>
                  <div className="flex-1 h-6 relative">
                    <div
                      className={`h-full rounded ${h.avgAccuracy >= 70 ? 'bg-emerald-500' : h.avgAccuracy >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                      style={{ width: `${Math.max(h.avgAccuracy, 5)}%` }}
                    />
                  </div>
                  <span className={`w-12 text-xs text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {h.avgAccuracy}%
                  </span>
                  <span className={`w-10 text-xs text-right ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    ({h.sessionCount})
                  </span>
                </div>
              ))
          )}
        </div>
      )}

      {/* Day of week view */}
      {view === 'days' && (
        <div className="space-y-2">
          {dayStats.map((d) => (
            <div key={d.day} className="flex items-center gap-3">
              <span className={`w-10 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {d.shortName}
              </span>
              <div className="flex-1 h-6 relative">
                {d.sessionCount > 0 ? (
                  <div
                    className={`h-full rounded ${d.avgAccuracy >= 70 ? 'bg-emerald-500' : d.avgAccuracy >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                    style={{ width: `${Math.max(d.avgAccuracy, 5)}%` }}
                  />
                ) : (
                  <div className={`h-full rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} style={{ width: '5%' }} />
                )}
              </div>
              <span className={`w-12 text-xs text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {d.sessionCount > 0 ? `${d.avgAccuracy}%` : '-'}
              </span>
              <span className={`w-10 text-xs text-right ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                ({d.totalCards})
              </span>
            </div>
          ))}
        </div>
      )}

      <p className={`text-xs text-center mt-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
        Based on {bestTime.totalSessions} review sessions
      </p>
    </div>
  );
}
