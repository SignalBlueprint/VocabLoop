/**
 * Conversation Review Tracking
 *
 * Tracks vocabulary usage during conversations and learns new words
 * introduced by the AI conversation partner.
 */

import type { ConversationMessage } from '../prompts/conversation';

const STORAGE_KEY = 'vocabloop_conversation_history';
const NEW_WORDS_KEY = 'vocabloop_new_words';

/**
 * A word learned during conversation
 */
export interface LearnedWord {
  word: string;
  meaning: string;
  learnedAt: number;
  conversationId: string;
  context?: string; // The sentence where it was introduced
  addedToCards?: boolean;
}

/**
 * A completed conversation session
 */
export interface ConversationSession {
  id: string;
  characterId: string;
  startedAt: number;
  endedAt: number;
  turnCount: number;
  wordsLearned: LearnedWord[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  messages: ConversationMessage[];
}

/**
 * Conversation history storage
 */
interface ConversationHistory {
  sessions: ConversationSession[];
  totalConversations: number;
  totalWordsLearned: number;
  lastConversationAt?: number;
}

/**
 * Load conversation history from localStorage
 */
export function loadConversationHistory(): ConversationHistory {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load conversation history:', error);
  }

  return {
    sessions: [],
    totalConversations: 0,
    totalWordsLearned: 0,
  };
}

/**
 * Save conversation history to localStorage
 */
function saveConversationHistory(history: ConversationHistory): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save conversation history:', error);
  }
}

/**
 * Record a completed conversation session
 */
export function recordConversationSession(
  session: Omit<ConversationSession, 'id'>
): ConversationSession {
  const history = loadConversationHistory();

  const newSession: ConversationSession = {
    ...session,
    id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  history.sessions.push(newSession);
  history.totalConversations++;
  history.totalWordsLearned += session.wordsLearned.length;
  history.lastConversationAt = Date.now();

  // Keep only last 50 sessions to limit storage
  if (history.sessions.length > 50) {
    history.sessions = history.sessions.slice(-50);
  }

  saveConversationHistory(history);

  // Also save new words separately for easy access
  saveNewWords(session.wordsLearned);

  return newSession;
}

/**
 * Load all learned words
 */
export function loadNewWords(): LearnedWord[] {
  try {
    const data = localStorage.getItem(NEW_WORDS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load new words:', error);
  }

  return [];
}

/**
 * Save new words to localStorage
 */
function saveNewWords(words: LearnedWord[]): void {
  const existing = loadNewWords();
  const existingSet = new Set(existing.map((w) => w.word.toLowerCase()));

  // Only add truly new words
  const newOnes = words.filter(
    (w) => !existingSet.has(w.word.toLowerCase())
  );

  if (newOnes.length > 0) {
    const updated = [...existing, ...newOnes];

    // Keep only last 200 words
    const trimmed = updated.slice(-200);

    try {
      localStorage.setItem(NEW_WORDS_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to save new words:', error);
    }
  }
}

/**
 * Mark a word as added to flashcards
 */
export function markWordAsAddedToCards(word: string): void {
  const words = loadNewWords();
  const updated = words.map((w) =>
    w.word.toLowerCase() === word.toLowerCase()
      ? { ...w, addedToCards: true }
      : w
  );

  try {
    localStorage.setItem(NEW_WORDS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to update word:', error);
  }
}

/**
 * Get words that haven't been added to flashcards yet
 */
export function getUnaddedWords(): LearnedWord[] {
  return loadNewWords().filter((w) => !w.addedToCards);
}

/**
 * Get conversation statistics
 */
export function getConversationStats(): {
  totalConversations: number;
  totalWordsLearned: number;
  conversationsToday: number;
  wordsLearnedToday: number;
  averageWordsPerConversation: number;
  favoriteCharacter?: string;
  lastConversationAt?: number;
} {
  const history = loadConversationHistory();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  const conversationsToday = history.sessions.filter(
    (s) => s.startedAt >= todayStart
  );

  // Count characters
  const characterCounts = new Map<string, number>();
  for (const session of history.sessions) {
    const count = characterCounts.get(session.characterId) || 0;
    characterCounts.set(session.characterId, count + 1);
  }

  let favoriteCharacter: string | undefined;
  let maxCount = 0;
  for (const [char, count] of characterCounts) {
    if (count > maxCount) {
      maxCount = count;
      favoriteCharacter = char;
    }
  }

  return {
    totalConversations: history.totalConversations,
    totalWordsLearned: history.totalWordsLearned,
    conversationsToday: conversationsToday.length,
    wordsLearnedToday: conversationsToday.reduce(
      (sum, s) => sum + s.wordsLearned.length,
      0
    ),
    averageWordsPerConversation:
      history.totalConversations > 0
        ? Math.round(
            (history.totalWordsLearned / history.totalConversations) * 10
          ) / 10
        : 0,
    favoriteCharacter,
    lastConversationAt: history.lastConversationAt,
  };
}

/**
 * Check if user can start a new conversation (daily limit)
 */
export function canStartConversation(): {
  allowed: boolean;
  remaining: number;
  dailyLimit: number;
} {
  const DAILY_LIMIT = 10;
  const stats = getConversationStats();

  return {
    allowed: stats.conversationsToday < DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - stats.conversationsToday),
    dailyLimit: DAILY_LIMIT,
  };
}

/**
 * Get recent conversation sessions
 */
export function getRecentSessions(count: number = 5): ConversationSession[] {
  const history = loadConversationHistory();
  return history.sessions.slice(-count).reverse();
}

/**
 * Clear all conversation history
 */
export function clearConversationHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(NEW_WORDS_KEY);
  } catch (error) {
    console.error('Failed to clear conversation history:', error);
  }
}

/**
 * Create a flashcard suggestion from a learned word
 */
export interface FlashcardSuggestion {
  front: string;
  back: string;
  context?: string;
  source: 'conversation';
}

/**
 * Get flashcard suggestions from learned words
 */
export function getFlashcardSuggestions(): FlashcardSuggestion[] {
  const unaddedWords = getUnaddedWords();

  return unaddedWords.map((word) => ({
    front: word.word,
    back: word.meaning,
    context: word.context,
    source: 'conversation' as const,
  }));
}
