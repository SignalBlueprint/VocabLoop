import type { Card } from '../types';

export type MasteryLevel = 'new' | 'learning' | 'reviewing' | 'known' | 'mastered';

export interface MasteryInfo {
  level: MasteryLevel;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  darkColor: string;
  darkBgColor: string;
  progress: number; // 0-100
}

/**
 * Determines mastery level based on card performance metrics
 * - new: 0 reps
 * - learning: 1-2 reps, short intervals
 * - reviewing: 3-5 reps, building intervals
 * - known: 6+ reps with good ease, intervals >= 7 days
 * - mastered: 10+ reps with high ease (>= 2.5), intervals >= 21 days
 */
export function getMasteryLevel(card: Card): MasteryLevel {
  const { reps, ease, intervalDays, lapses } = card;

  // New cards: never reviewed
  if (reps === 0) {
    return 'new';
  }

  // Learning phase: early reviews, potentially unstable
  if (reps <= 2) {
    return 'learning';
  }

  // Reviewing phase: building up review history
  if (reps <= 5 || intervalDays < 7) {
    return 'reviewing';
  }

  // Known: solid review history with decent intervals
  if (reps >= 6 && intervalDays >= 7) {
    // Check for mastery: high reps, high ease, long intervals, few lapses
    if (reps >= 10 && ease >= 2.5 && intervalDays >= 21 && lapses <= 2) {
      return 'mastered';
    }
    return 'known';
  }

  return 'reviewing';
}

/**
 * Get full mastery info including styling
 */
export function getMasteryInfo(card: Card): MasteryInfo {
  const level = getMasteryLevel(card);

  // Calculate progress within level
  let progress = 0;
  switch (level) {
    case 'new':
      progress = 0;
      break;
    case 'learning':
      progress = (card.reps / 3) * 100;
      break;
    case 'reviewing':
      progress = Math.min(((card.reps - 2) / 4) * 100, 100);
      break;
    case 'known':
      progress = Math.min(((card.reps - 5) / 5) * 100, 100);
      break;
    case 'mastered':
      progress = 100;
      break;
  }

  const info: Record<MasteryLevel, Omit<MasteryInfo, 'level' | 'progress'>> = {
    new: {
      label: 'New',
      description: 'Not yet reviewed',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      darkColor: 'text-gray-400',
      darkBgColor: 'bg-gray-700',
    },
    learning: {
      label: 'Learning',
      description: 'Early stage, building memory',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      darkColor: 'text-blue-400',
      darkBgColor: 'bg-blue-900/30',
    },
    reviewing: {
      label: 'Reviewing',
      description: 'Strengthening recall',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      darkColor: 'text-amber-400',
      darkBgColor: 'bg-amber-900/30',
    },
    known: {
      label: 'Known',
      description: 'Solid retention',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      darkColor: 'text-emerald-400',
      darkBgColor: 'bg-emerald-900/30',
    },
    mastered: {
      label: 'Mastered',
      description: 'Excellent long-term retention',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      darkColor: 'text-purple-400',
      darkBgColor: 'bg-purple-900/30',
    },
  };

  return {
    level,
    progress,
    ...info[level],
  };
}

/**
 * Get mastery breakdown for a set of cards
 */
export function getMasteryBreakdown(cards: Card[]): Record<MasteryLevel, number> {
  const breakdown: Record<MasteryLevel, number> = {
    new: 0,
    learning: 0,
    reviewing: 0,
    known: 0,
    mastered: 0,
  };

  for (const card of cards) {
    const level = getMasteryLevel(card);
    breakdown[level]++;
  }

  return breakdown;
}

/**
 * Get mastery stats summary
 */
export function getMasteryStats(cards: Card[]): {
  breakdown: Record<MasteryLevel, number>;
  percentKnown: number;
  percentMastered: number;
} {
  const breakdown = getMasteryBreakdown(cards);
  const total = cards.length || 1;

  return {
    breakdown,
    percentKnown: Math.round(((breakdown.known + breakdown.mastered) / total) * 100),
    percentMastered: Math.round((breakdown.mastered / total) * 100),
  };
}
