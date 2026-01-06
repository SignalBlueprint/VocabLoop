import { useState } from 'react';
import { type HourlyStats, formatHour, getHeatmapColor } from '../utils/hourlyAnalytics';

interface HourlyHeatmapProps {
  hourlyStats: HourlyStats[];
  isDark: boolean;
}

export function HourlyHeatmap({ hourlyStats, isDark }: HourlyHeatmapProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  // Hour labels to display below heatmap
  const hourLabels = [0, 6, 12, 18, 24];

  return (
    <div className="w-full">
      {/* Heatmap grid */}
      <div className="flex gap-0.5">
        {hourlyStats.map((stat) => {
          const colors = getHeatmapColor(stat.successRate, stat.totalReviews);
          const bgClass = isDark ? colors.bgDark : colors.bg;
          const isHovered = hoveredHour === stat.hour;

          return (
            <div
              key={stat.hour}
              className={`flex-1 h-8 rounded-sm cursor-pointer transition-all ${bgClass} ${
                isHovered ? 'ring-2 ring-offset-1 ring-blue-500' : ''
              } ${isDark ? 'ring-offset-gray-800' : 'ring-offset-white'}`}
              onMouseEnter={() => setHoveredHour(stat.hour)}
              onMouseLeave={() => setHoveredHour(null)}
              onTouchStart={() => setHoveredHour(stat.hour)}
              onTouchEnd={() => setHoveredHour(null)}
              role="gridcell"
              aria-label={`${formatHour(stat.hour)}: ${stat.totalReviews} reviews, ${Math.round(stat.successRate)}% success`}
            />
          );
        })}
      </div>

      {/* Hour labels */}
      <div className="flex justify-between mt-1 px-1">
        {hourLabels.map((hour) => (
          <span
            key={hour}
            className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
          >
            {hour === 24 ? '12am' : formatHour(hour)}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredHour !== null && (
        <div
          className={`mt-3 p-2 rounded text-sm text-center ${
            isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
          }`}
        >
          <span className="font-medium">{formatHour(hoveredHour)}</span>
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}> — </span>
          {hourlyStats[hoveredHour].totalReviews < 5 ? (
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              Not enough data ({hourlyStats[hoveredHour].totalReviews} reviews)
            </span>
          ) : (
            <>
              <span>{hourlyStats[hoveredHour].totalReviews} reviews, </span>
              <span
                className={
                  hourlyStats[hoveredHour].successRate >= 80
                    ? 'text-green-500'
                    : hourlyStats[hoveredHour].successRate >= 60
                    ? 'text-yellow-500'
                    : 'text-red-500'
                }
              >
                {Math.round(hourlyStats[hoveredHour].successRate)}% success
              </span>
            </>
          )}
        </div>
      )}

      {/* Legend */}
      <div className={`flex items-center justify-center gap-4 mt-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded-sm ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          <span>No data</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded-sm ${isDark ? 'bg-red-600' : 'bg-red-400'}`}></div>
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded-sm ${isDark ? 'bg-yellow-500' : 'bg-yellow-300'}`}></div>
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded-sm ${isDark ? 'bg-green-500' : 'bg-green-400'}`}></div>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}
