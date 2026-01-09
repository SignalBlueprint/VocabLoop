// Card types
export type CardType = 'BASIC' | 'CLOZE' | 'VERB';

export interface Card {
  id: string;
  type: CardType;
  front: string;           // Spanish word/phrase (for CLOZE: sentence with {{c1::word}} marker)
  back: string;            // English translation (for CLOZE: the hidden word)
  exampleEs?: string;      // Example sentence in Spanish
  exampleEn?: string;      // Example sentence translation
  notes?: string;          // User notes
  tags: string[];          // Tags for organization

  // Cloze-specific fields
  clozeSentence?: string;  // Full sentence without cloze marker (for display)
  clozeWord?: string;      // The word that was hidden

  // SRS fields
  ease: number;            // Ease factor (default 2.5)
  intervalDays: number;    // Days until next review
  reps: number;            // Number of successful reviews
  dueAt: number;           // Unix timestamp for next review
  lapses: number;          // Number of times card was forgotten
  lastReviewedAt?: number; // Unix timestamp of last review

  // Metadata
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // Unix timestamp
}

// Grade options for review
export type Grade = 'again' | 'hard' | 'good' | 'easy';

// Review log entry
export interface ReviewLog {
  id: string;
  cardId: string;
  reviewedAt: number;       // Unix timestamp
  grade: Grade;
  previousInterval: number; // Days before review
  newInterval: number;      // Days after review
  previousDueAt: number;    // Due date before review
  newDueAt: number;         // Due date after review
}

// For creating new cards (without generated fields)
export interface NewCard {
  type: CardType;
  front: string;
  back: string;
  exampleEs?: string;
  exampleEn?: string;
  notes?: string;
  tags?: string[];
  // Cloze-specific
  clozeSentence?: string;
  clozeWord?: string;
}

// Stats summary
export interface Stats {
  dueCount: number;
  reviewedToday: number;
  streak: number;
  cardsLearned: number;   // Cards with reps >= 3
  totalCards: number;
}

// App navigation pages
export type Page = 'home' | 'add' | 'review' | 'library' | 'stats' | 'frequency' | 'verbs' | 'cloze' | 'difficulty' | 'speedround' | 'matching' | 'quiz' | 'typing' | 'custom-study' | 'listening' | 'multiplayer-lobby' | 'multiplayer-game' | 'multiplayer-results' | 'smart-session' | 'conversation' | 'pronunciation';

// Smart Session configuration
export type SessionMode = 'smart' | 'due-only' | 'tag-focus';

export interface SessionConfig {
  mode: SessionMode;
  targetCards: number;        // 10-50 cards per session
  tagFocus?: string;          // For 'tag-focus' mode only

  // Optional weight overrides (defaults: due=60, weakTag=25, new=15)
  weights?: {
    due: number;
    weakTag: number;
    new: number;
  };

  enableConfidenceRecovery?: boolean;  // default: true
}

// Result of a single card review in a session
export interface ReviewResult {
  cardId: string;
  grade: Grade;
  timeMs: number;              // Response time in milliseconds
  wasRecoveryCard?: boolean;   // True if this was a confidence recovery card
}
