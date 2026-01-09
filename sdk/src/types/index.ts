/**
 * VocabLoop Widget SDK Types
 */

// ============================================
// Configuration
// ============================================

export interface VocabLoopConfig {
  apiKey?: string;
  apiUrl?: string;
  userId?: string;
  theme?: 'light' | 'dark' | 'auto';
  locale?: 'en' | 'es';
  anonymous?: boolean;
}

export interface WidgetTheme {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  fontFamily?: string;
}

// ============================================
// Vocabulary
// ============================================

export interface VocabWord {
  word: string;
  english: string;
  intervalDays: number;
  masteryLevel: 'learning' | 'familiar' | 'mastered';
}

export interface VocabStats {
  totalWords: number;
  knownWords: number;
  learningWords: number;
  masteredWords: number;
  streak: number;
  level: number;
}

// ============================================
// Widget Components
// ============================================

export interface HighlightConfig {
  container: HTMLElement | string;
  theme?: WidgetTheme;
  showTranslations?: boolean;
  onWordClick?: (word: string, element: HTMLElement) => void;
  onUnknownClick?: (word: string, context: string) => void;
}

export interface CardPopupConfig {
  word: string;
  context?: string;
  position?: { x: number; y: number } | 'center';
  theme?: WidgetTheme;
  onGrade?: (grade: 'again' | 'hard' | 'good' | 'easy') => void;
  onAdd?: (word: string) => void;
  onClose?: () => void;
}

export interface MiniReviewConfig {
  container: HTMLElement | string;
  size?: 'small' | 'medium' | 'large';
  cardCount?: 1 | 5 | 10;
  theme?: WidgetTheme;
  onComplete?: (results: ReviewResults) => void;
  onError?: (error: Error) => void;
}

export interface BadgeConfig {
  container: HTMLElement | string;
  size?: 'icon' | 'compact' | 'full';
  showStreak?: boolean;
  animate?: boolean;
  theme?: WidgetTheme;
}

export interface ReviewResults {
  cardsReviewed: number;
  correct: number;
  incorrect: number;
  timeSpentMs: number;
}

// ============================================
// Events
// ============================================

export type VocabLoopEvent =
  | 'ready'
  | 'authenticated'
  | 'word-added'
  | 'review-complete'
  | 'error';

export interface VocabLoopEventData {
  ready: void;
  authenticated: { userId: string };
  'word-added': { word: string };
  'review-complete': ReviewResults;
  error: Error;
}

export type EventHandler<T extends VocabLoopEvent> = (
  data: VocabLoopEventData[T]
) => void;

// ============================================
// API
// ============================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
