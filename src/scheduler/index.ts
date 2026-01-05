import type { Card, Grade } from '../types';

// SM-2 algorithm constants
const MIN_EASE = 1.3;
export const INITIAL_EASE = 2.5;

// Grade multipliers for ease adjustment
const GRADE_EASE_DELTA: Record<Grade, number> = {
  again: -0.2,
  hard: -0.15,
  good: 0,
  easy: 0.15,
};

// Initial intervals for new/lapsed cards (in days)
const LEARNING_STEPS: Record<Grade, number> = {
  again: 0, // Due immediately (same session)
  hard: 0,  // Due immediately
  good: 1,  // Tomorrow
  easy: 4,  // 4 days
};

export interface ScheduleResult {
  newEase: number;
  newInterval: number;
  newDueAt: number;
  newReps: number;
  newLapses: number;
}

/**
 * Calculate the next review schedule for a card based on the grade.
 * Implements a simplified SM-2 algorithm similar to Anki.
 */
export function calculateSchedule(card: Card, grade: Grade): ScheduleResult {
  const now = Date.now();
  let newEase = card.ease;
  let newInterval = card.intervalDays;
  let newReps = card.reps;
  let newLapses = card.lapses;

  // Adjust ease factor
  newEase = Math.max(MIN_EASE, newEase + GRADE_EASE_DELTA[grade]);

  if (grade === 'again') {
    // Card was forgotten - reset to learning
    newReps = 0;
    newLapses = card.lapses + 1;
    newInterval = LEARNING_STEPS.again;
  } else if (card.reps === 0) {
    // New or relearning card
    newReps = 1;
    newInterval = LEARNING_STEPS[grade];
  } else {
    // Graduated card
    newReps = card.reps + 1;

    switch (grade) {
      case 'hard':
        // Harder than expected - small increase
        newInterval = Math.max(1, Math.round(card.intervalDays * 1.2));
        break;
      case 'good':
        // Expected - normal increase
        newInterval = Math.max(1, Math.round(card.intervalDays * newEase));
        break;
      case 'easy':
        // Easier than expected - bigger increase + bonus
        newInterval = Math.max(1, Math.round(card.intervalDays * newEase * 1.3));
        break;
    }
  }

  // Calculate new due date
  const newDueAt = now + (newInterval * 24 * 60 * 60 * 1000);

  return {
    newEase,
    newInterval,
    newDueAt,
    newReps,
    newLapses,
  };
}

/**
 * Apply a schedule result to a card and return the updated card.
 */
export function applySchedule(card: Card, result: ScheduleResult): Card {
  return {
    ...card,
    ease: result.newEase,
    intervalDays: result.newInterval,
    dueAt: result.newDueAt,
    reps: result.newReps,
    lapses: result.newLapses,
    lastReviewedAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Get a human-readable interval string.
 */
export function formatInterval(days: number): string {
  if (days === 0) {
    return 'Now';
  } else if (days === 1) {
    return '1 day';
  } else if (days < 30) {
    return `${days} days`;
  } else if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? '1 month' : `${months} months`;
  } else {
    const years = Math.round(days / 365);
    return years === 1 ? '1 year' : `${years} years`;
  }
}

/**
 * Get preview intervals for all grades (for UI).
 */
export function getIntervalPreviews(card: Card): Record<Grade, string> {
  const grades: Grade[] = ['again', 'hard', 'good', 'easy'];
  const previews: Record<Grade, string> = {} as Record<Grade, string>;

  for (const grade of grades) {
    const result = calculateSchedule(card, grade);
    previews[grade] = formatInterval(result.newInterval);
  }

  return previews;
}
