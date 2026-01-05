import type { Card } from '../types';
import { getMasteryInfo, type MasteryLevel } from '../utils/mastery';

interface MasteryBadgeProps {
  card: Card;
  isDark: boolean;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

/**
 * Small badge showing card mastery level
 */
export function MasteryBadge({ card, isDark, size = 'sm', showLabel = false }: MasteryBadgeProps) {
  const info = getMasteryInfo(card);

  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  const dotColor = getDotColor(info.level, isDark);

  if (showLabel) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
          isDark ? `${info.darkBgColor} ${info.darkColor}` : `${info.bgColor} ${info.color}`
        }`}
        title={info.description}
      >
        <span className={`${sizeClasses} rounded-full ${dotColor}`} />
        {info.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-block ${sizeClasses} rounded-full ${dotColor}`}
      title={`${info.label}: ${info.description}`}
      aria-label={`Mastery level: ${info.label}`}
    />
  );
}

function getDotColor(level: MasteryLevel, isDark: boolean): string {
  switch (level) {
    case 'new':
      return isDark ? 'bg-gray-500' : 'bg-gray-400';
    case 'learning':
      return isDark ? 'bg-blue-400' : 'bg-blue-500';
    case 'reviewing':
      return isDark ? 'bg-amber-400' : 'bg-amber-500';
    case 'known':
      return isDark ? 'bg-emerald-400' : 'bg-emerald-500';
    case 'mastered':
      return isDark ? 'bg-purple-400' : 'bg-purple-500';
  }
}

interface MasteryFilterProps {
  selected: MasteryLevel | null;
  onChange: (level: MasteryLevel | null) => void;
  counts: Record<MasteryLevel, number>;
  isDark: boolean;
}

/**
 * Filter buttons for mastery levels
 */
export function MasteryFilter({ selected, onChange, counts, isDark }: MasteryFilterProps) {
  const levels: { level: MasteryLevel | null; label: string }[] = [
    { level: null, label: 'All' },
    { level: 'new', label: 'New' },
    { level: 'learning', label: 'Learning' },
    { level: 'reviewing', label: 'Reviewing' },
    { level: 'known', label: 'Known' },
    { level: 'mastered', label: 'Mastered' },
  ];

  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by mastery level">
      {levels.map(({ level, label }) => {
        const count = level ? counts[level] : Object.values(counts).reduce((a, b) => a + b, 0);
        const isSelected = selected === level;

        return (
          <button
            key={level ?? 'all'}
            onClick={() => onChange(level)}
            aria-pressed={isSelected}
            className={`text-xs px-2 py-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              isSelected
                ? 'bg-emerald-600 text-white'
                : isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label} ({count})
          </button>
        );
      })}
    </div>
  );
}
