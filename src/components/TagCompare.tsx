import { useState, useMemo } from 'react';
import type { Card, ReviewLog } from '../types';
import {
  getTagStats,
  compareTagMetric,
  extractAllTags,
  formatEase,
  formatInterval,
  formatSuccessRate,
  formatTimeToMastery,
  type TagStats,
} from '../utils/tagAnalytics';

interface TagCompareProps {
  allCards: Card[];
  allReviews: ReviewLog[];
  isDark: boolean;
  onCardClick?: (card: Card) => void;
}

// Metric display configuration
interface MetricConfig {
  key: keyof Omit<TagStats, 'tag' | 'mostForgotten'>;
  label: string;
  format: (value: number) => string;
  description: string;
}

const metrics: MetricConfig[] = [
  {
    key: 'cardCount',
    label: 'Cards',
    format: (v) => v.toString(),
    description: 'Number of cards with this tag',
  },
  {
    key: 'successRate',
    label: 'Success Rate',
    format: formatSuccessRate,
    description: 'Percentage of reviews not marked "Again"',
  },
  {
    key: 'avgEase',
    label: 'Avg Ease',
    format: formatEase,
    description: 'Average ease factor (higher = easier)',
  },
  {
    key: 'avgInterval',
    label: 'Avg Interval',
    format: formatInterval,
    description: 'Average review interval',
  },
  {
    key: 'masteredCount',
    label: 'Mastered',
    format: (v) => v.toString(),
    description: 'Cards with interval ≥21 days',
  },
  {
    key: 'avgTimeToMastery',
    label: 'Time to Master',
    format: formatTimeToMastery,
    description: 'Average days to reach mastery',
  },
];

export function TagCompare({
  allCards,
  allReviews,
  isDark,
  onCardClick,
}: TagCompareProps) {
  const allTags = useMemo(() => extractAllTags(allCards), [allCards]);

  const [tag1, setTag1] = useState<string>(allTags[0] || '');
  const [tag2, setTag2] = useState<string>(allTags[1] || '');

  // Calculate stats for both tags
  const stats1 = useMemo(
    () => (tag1 ? getTagStats(allCards, allReviews, tag1) : null),
    [allCards, allReviews, tag1]
  );

  const stats2 = useMemo(
    () => (tag2 ? getTagStats(allCards, allReviews, tag2) : null),
    [allCards, allReviews, tag2]
  );

  // Render indicator for which tag is better
  const renderIndicator = (
    metric: MetricConfig,
    stats1: TagStats | null,
    stats2: TagStats | null
  ) => {
    if (!stats1 || !stats2) return null;

    const comparison = compareTagMetric(stats1, stats2, metric.key);

    if (comparison === 0) {
      return <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>—</span>;
    }

    return (
      <span className={comparison === 1 ? 'text-green-500' : 'text-red-500'}>
        {comparison === 1 ? '↑' : '↓'}
      </span>
    );
  };

  if (allTags.length < 2) {
    return (
      <div className={`rounded-xl p-6 text-center ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <p className="text-3xl mb-3">🏷️</p>
        <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Not enough tags to compare
        </p>
        <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Add at least 2 different tags to your cards to use this feature.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <h3 className={`font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
        Compare Tags
      </h3>

      {/* Tag selectors */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label
            htmlFor="tag1-select"
            className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          >
            Tag 1
          </label>
          <select
            id="tag1-select"
            value={tag1}
            onChange={(e) => setTag1(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            {allTags.map((tag) => (
              <option key={tag} value={tag} disabled={tag === tag2}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="tag2-select"
            className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          >
            Tag 2
          </label>
          <select
            id="tag2-select"
            value={tag2}
            onChange={(e) => setTag2(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            {allTags.map((tag) => (
              <option key={tag} value={tag} disabled={tag === tag1}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats comparison table */}
      {stats1 && stats2 && (
        <>
          <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                  <th className={`px-3 py-2 text-left font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Metric
                  </th>
                  <th className={`px-3 py-2 text-center font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {tag1}
                  </th>
                  <th className="px-2 py-2 w-8"></th>
                  <th className={`px-3 py-2 text-center font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {tag2}
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <tr
                    key={metric.key}
                    className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                    <td className={`px-3 py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span title={metric.description}>{metric.label}</span>
                    </td>
                    <td className={`px-3 py-2 text-center font-mono ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                      {metric.format(stats1[metric.key] as number)}
                    </td>
                    <td className="px-2 py-2 text-center text-lg">
                      {renderIndicator(metric, stats1, stats2)}
                    </td>
                    <td className={`px-3 py-2 text-center font-mono ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                      {metric.format(stats2[metric.key] as number)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Most forgotten cards */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            {/* Tag 1 forgotten cards */}
            <div>
              <h4 className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Most Forgotten ({tag1})
              </h4>
              {stats1.mostForgotten.length > 0 ? (
                <div className="space-y-1">
                  {stats1.mostForgotten.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => onCardClick?.(card)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                        isDark
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="truncate">{card.front}</p>
                      <p className={`text-xs ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                        {card.lapses} lapses
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  No forgotten cards
                </p>
              )}
            </div>

            {/* Tag 2 forgotten cards */}
            <div>
              <h4 className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Most Forgotten ({tag2})
              </h4>
              {stats2.mostForgotten.length > 0 ? (
                <div className="space-y-1">
                  {stats2.mostForgotten.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => onCardClick?.(card)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                        isDark
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="truncate">{card.front}</p>
                      <p className={`text-xs ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                        {card.lapses} lapses
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  No forgotten cards
                </p>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className={`mt-4 text-xs flex items-center justify-center gap-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <span className="flex items-center gap-1">
              <span className="text-green-500">↑</span> Better performance
            </span>
            <span className="flex items-center gap-1">
              <span className="text-red-500">↓</span> Needs work
            </span>
          </div>
        </>
      )}
    </div>
  );
}
