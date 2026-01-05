import type { Card } from '../types';
import { getMasteryInfo, type MasteryLevel } from '../utils/mastery';

interface CardDifficultyVizProps {
  card: Card;
  isDark: boolean;
  showDetails?: boolean;
}

/**
 * Visual representation of card difficulty and progress
 * Shows: mastery level, ease factor, interval, lapse count
 */
export function CardDifficultyViz({ card, isDark, showDetails = false }: CardDifficultyVizProps) {
  const masteryInfo = getMasteryInfo(card);

  // Calculate difficulty score (inverse of ease - lower ease = harder)
  const difficultyPercent = Math.max(0, Math.min(100, ((3.0 - card.ease) / 1.5) * 100));
  const isHard = card.ease < 2.0 || card.lapses >= 3;
  const isEasy = card.ease >= 2.7 && card.lapses === 0;

  // Get status text
  const getStatusText = () => {
    if (card.reps === 0) return 'Not yet studied';
    if (isHard) return 'Difficult - needs practice';
    if (isEasy) return 'Easy - well learned';
    return 'Normal - progressing';
  };

  // Format interval for display
  const formatInterval = (days: number): string => {
    if (days === 0) return 'New';
    if (days < 1) return '< 1 day';
    if (days === 1) return '1 day';
    if (days < 30) return `${Math.round(days)} days`;
    if (days < 365) return `${Math.round(days / 30)} months`;
    return `${(days / 365).toFixed(1)} years`;
  };

  return (
    <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
      {/* Mastery level bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium ${
            isDark ? masteryInfo.darkColor : masteryInfo.color
          }`}>
            {masteryInfo.label}
          </span>
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {Math.round(masteryInfo.progress)}%
          </span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${getMasteryBarColor(masteryInfo.level, isDark)}`}
            style={{ width: `${masteryInfo.progress}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {/* Ease factor */}
        <div>
          <div className={`text-lg font-bold ${
            isHard ? (isDark ? 'text-red-400' : 'text-red-500') :
            isEasy ? (isDark ? 'text-emerald-400' : 'text-emerald-500') :
            (isDark ? 'text-gray-200' : 'text-gray-700')
          }`}>
            {card.ease.toFixed(1)}
          </div>
          <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Ease</div>
        </div>

        {/* Interval */}
        <div>
          <div className={`text-lg font-bold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            {card.intervalDays > 0 ? card.intervalDays : '-'}
          </div>
          <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Days</div>
        </div>

        {/* Reviews */}
        <div>
          <div className={`text-lg font-bold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            {card.reps}
          </div>
          <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Reviews</div>
        </div>

        {/* Lapses */}
        <div>
          <div className={`text-lg font-bold ${
            card.lapses >= 3 ? (isDark ? 'text-red-400' : 'text-red-500') :
            card.lapses > 0 ? (isDark ? 'text-amber-400' : 'text-amber-500') :
            (isDark ? 'text-gray-200' : 'text-gray-700')
          }`}>
            {card.lapses}
          </div>
          <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Lapses</div>
        </div>
      </div>

      {/* Detailed info */}
      {showDetails && (
        <div className={`mt-3 pt-3 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Status</span>
              <span className={`font-medium ${
                isHard ? (isDark ? 'text-red-400' : 'text-red-500') :
                isEasy ? (isDark ? 'text-emerald-400' : 'text-emerald-500') :
                (isDark ? 'text-gray-300' : 'text-gray-600')
              }`}>
                {getStatusText()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Next review</span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                {card.dueAt <= Date.now() ? 'Due now' : formatInterval(Math.ceil((card.dueAt - Date.now()) / (1000 * 60 * 60 * 24)))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Current interval</span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                {formatInterval(card.intervalDays)}
              </span>
            </div>
            {card.lastReviewedAt && (
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Last reviewed</span>
                <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                  {new Date(card.lastReviewedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Difficulty indicator bar */}
      {card.reps > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Easy
            </span>
            <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Hard
            </span>
          </div>
          <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isHard ? 'bg-red-500' : isEasy ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${difficultyPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function getMasteryBarColor(level: MasteryLevel, isDark: boolean): string {
  switch (level) {
    case 'new':
      return isDark ? 'bg-gray-500' : 'bg-gray-400';
    case 'learning':
      return isDark ? 'bg-blue-500' : 'bg-blue-500';
    case 'reviewing':
      return isDark ? 'bg-amber-500' : 'bg-amber-500';
    case 'known':
      return isDark ? 'bg-emerald-500' : 'bg-emerald-500';
    case 'mastered':
      return isDark ? 'bg-purple-500' : 'bg-purple-500';
  }
}

/**
 * Compact inline difficulty indicator for lists
 */
interface DifficultyIndicatorProps {
  card: Card;
  isDark: boolean;
}

export function DifficultyIndicator({ card, isDark }: DifficultyIndicatorProps) {
  const isHard = card.ease < 2.0 || card.lapses >= 3;
  const isEasy = card.ease >= 2.7 && card.lapses === 0 && card.reps >= 3;

  if (card.reps === 0) {
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
        isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
      }`}>
        NEW
      </span>
    );
  }

  if (isHard) {
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
        isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600'
      }`}>
        HARD
      </span>
    );
  }

  if (isEasy) {
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
        isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
      }`}>
        EASY
      </span>
    );
  }

  return null;
}

/**
 * Difficulty distribution chart for a set of cards
 */
interface DifficultyDistributionProps {
  cards: Card[];
  isDark: boolean;
}

export function DifficultyDistribution({ cards, isDark }: DifficultyDistributionProps) {
  // Categorize cards by difficulty
  const distribution = {
    easy: 0,
    normal: 0,
    hard: 0,
    new: 0,
  };

  for (const card of cards) {
    if (card.reps === 0) {
      distribution.new++;
    } else if (card.ease < 2.0 || card.lapses >= 3) {
      distribution.hard++;
    } else if (card.ease >= 2.7 && card.lapses === 0) {
      distribution.easy++;
    } else {
      distribution.normal++;
    }
  }

  const total = cards.length || 1;

  const bars = [
    { key: 'easy', label: 'Easy', count: distribution.easy, color: isDark ? 'bg-emerald-500' : 'bg-emerald-500' },
    { key: 'normal', label: 'Normal', count: distribution.normal, color: isDark ? 'bg-blue-500' : 'bg-blue-500' },
    { key: 'hard', label: 'Hard', count: distribution.hard, color: isDark ? 'bg-red-500' : 'bg-red-500' },
    { key: 'new', label: 'New', count: distribution.new, color: isDark ? 'bg-gray-500' : 'bg-gray-400' },
  ];

  return (
    <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <h3 className={`font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
        Difficulty Distribution
      </h3>

      <div className="space-y-3">
        {bars.map(({ key, label, count, color }) => (
          <div key={key}>
            <div className="flex justify-between mb-1">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {count} ({Math.round((count / total) * 100)}%)
              </span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${(count / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex justify-around text-center">
          <div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              {(cards.reduce((sum, c) => sum + c.ease, 0) / (cards.length || 1)).toFixed(2)}
            </div>
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Avg Ease</div>
          </div>
          <div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              {Math.round(cards.reduce((sum, c) => sum + c.intervalDays, 0) / (cards.length || 1))}
            </div>
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Avg Days</div>
          </div>
          <div>
            <div className={`text-xl font-bold ${
              distribution.hard > cards.length * 0.2
                ? (isDark ? 'text-red-400' : 'text-red-500')
                : (isDark ? 'text-gray-200' : 'text-gray-800')
            }`}>
              {distribution.hard}
            </div>
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Hard Cards</div>
          </div>
        </div>
      </div>
    </div>
  );
}
