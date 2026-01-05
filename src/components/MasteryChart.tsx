import { useState, useEffect } from 'react';
import { getAllCards } from '../db/cards';
import { getMasteryStats, type MasteryLevel } from '../utils/mastery';

interface MasteryChartProps {
  isDark: boolean;
}

const MASTERY_COLORS: Record<MasteryLevel, { bg: string; darkBg: string; label: string }> = {
  new: { bg: 'bg-gray-300', darkBg: 'bg-gray-600', label: 'New' },
  learning: { bg: 'bg-blue-400', darkBg: 'bg-blue-500', label: 'Learning' },
  reviewing: { bg: 'bg-amber-400', darkBg: 'bg-amber-500', label: 'Reviewing' },
  known: { bg: 'bg-emerald-400', darkBg: 'bg-emerald-500', label: 'Known' },
  mastered: { bg: 'bg-purple-400', darkBg: 'bg-purple-500', label: 'Mastered' },
};

const MASTERY_ORDER: MasteryLevel[] = ['new', 'learning', 'reviewing', 'known', 'mastered'];

export function MasteryChart({ isDark }: MasteryChartProps) {
  const [stats, setStats] = useState<{
    breakdown: Record<MasteryLevel, number>;
    percentKnown: number;
    percentMastered: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCards, setTotalCards] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const cards = await getAllCards();
      setTotalCards(cards.length);
      if (cards.length > 0) {
        setStats(getMasteryStats(cards));
      }
    } catch (error) {
      console.error('Failed to load mastery stats:', error);
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

  if (!stats || totalCards === 0) {
    return null;
  }

  return (
    <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Card Mastery
        </h3>
        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {stats.percentKnown}% known · {stats.percentMastered}% mastered
        </span>
      </div>

      {/* Stacked bar chart */}
      <div className="h-6 flex rounded-full overflow-hidden mb-3">
        {MASTERY_ORDER.map((level) => {
          const count = stats.breakdown[level];
          const percent = (count / totalCards) * 100;
          if (percent === 0) return null;

          return (
            <div
              key={level}
              className={`${isDark ? MASTERY_COLORS[level].darkBg : MASTERY_COLORS[level].bg} transition-all`}
              style={{ width: `${percent}%` }}
              title={`${MASTERY_COLORS[level].label}: ${count} cards (${Math.round(percent)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {MASTERY_ORDER.map((level) => {
          const count = stats.breakdown[level];
          if (count === 0) return null;

          return (
            <div key={level} className="flex items-center gap-1.5">
              <div
                className={`w-2.5 h-2.5 rounded-sm ${isDark ? MASTERY_COLORS[level].darkBg : MASTERY_COLORS[level].bg}`}
              />
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {MASTERY_COLORS[level].label} ({count})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
