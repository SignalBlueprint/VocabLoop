/**
 * Utility for undoing the last review grade.
 * Stores the card state before grading so it can be restored.
 */

import type { Card, Grade } from '../types';

interface UndoState {
  card: Card;  // Card state BEFORE the review
  grade: Grade;
  xpEarned: number;
  timestamp: number;
}

const STORAGE_KEY = 'vocabloop_undo_state';
const UNDO_TIMEOUT_MS = 30000; // 30 seconds to undo

/**
 * Save the undo state before a review is applied.
 */
export function saveUndoState(card: Card, grade: Grade, xpEarned: number): void {
  const state: UndoState = {
    card: { ...card }, // Clone the card state
    grade,
    xpEarned,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save undo state:', error);
  }
}

/**
 * Get the current undo state if it's still valid (within timeout).
 */
export function getUndoState(): UndoState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const state: UndoState = JSON.parse(stored);

    // Check if undo has expired
    if (Date.now() - state.timestamp > UNDO_TIMEOUT_MS) {
      clearUndoState();
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to get undo state:', error);
    return null;
  }
}

/**
 * Clear the undo state.
 */
export function clearUndoState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear undo state:', error);
  }
}

/**
 * Check if undo is available.
 */
export function canUndo(): boolean {
  return getUndoState() !== null;
}

/**
 * Get time remaining for undo in seconds.
 */
export function getUndoTimeRemaining(): number {
  const state = getUndoState();
  if (!state) return 0;

  const elapsed = Date.now() - state.timestamp;
  const remaining = Math.max(0, UNDO_TIMEOUT_MS - elapsed);
  return Math.ceil(remaining / 1000);
}
