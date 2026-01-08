/**
 * Vocabulary Extraction Utilities
 *
 * Extracts known Spanish vocabulary from user's flashcards
 * for use in conversation prompts.
 */

import type { Card } from '../types';

/**
 * Vocabulary item with metadata
 */
export interface VocabItem {
  word: string;
  translation: string;
  mastery: 'learning' | 'familiar' | 'mastered';
  lastReviewedAt?: number;
}

/**
 * Configuration for vocabulary extraction
 */
export interface VocabExtractConfig {
  minReps?: number; // Minimum successful reviews to include (default: 1)
  maxWords?: number; // Maximum words to return (default: 100)
  includeLearning?: boolean; // Include cards still being learned (default: true)
  priorityTags?: string[]; // Prioritize cards with these tags
}

/**
 * Get mastery level based on card stats
 */
export function getMasteryLevel(card: Card): 'learning' | 'familiar' | 'mastered' {
  if (card.reps >= 5 && card.intervalDays >= 21) {
    return 'mastered';
  }
  if (card.reps >= 2 && card.intervalDays >= 3) {
    return 'familiar';
  }
  return 'learning';
}

/**
 * Extract the main Spanish word from a card.
 * Handles different card types appropriately.
 */
export function extractWordFromCard(card: Card): string | null {
  switch (card.type) {
    case 'BASIC':
    case 'VERB':
      // For basic/verb cards, the front is the Spanish word
      return cleanWord(card.front);

    case 'CLOZE':
      // For cloze cards, extract the hidden word
      if (card.clozeWord) {
        return cleanWord(card.clozeWord);
      }
      // Fallback: try to extract from the front with marker
      const clozeMatch = card.front.match(/\{\{c\d+::([^}]+)\}\}/);
      if (clozeMatch) {
        return cleanWord(clozeMatch[1]);
      }
      return null;

    default:
      return null;
  }
}

/**
 * Clean a word for consistent formatting
 */
function cleanWord(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .replace(/[¿¡.,!?;:'"()[\]{}]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Extract all vocabulary from a card (including examples)
 */
export function extractAllWordsFromCard(card: Card): string[] {
  const words: string[] = [];

  // Main word
  const mainWord = extractWordFromCard(card);
  if (mainWord) {
    words.push(mainWord);
  }

  // Extract words from example sentence
  if (card.exampleEs) {
    const exampleWords = extractWordsFromSentence(card.exampleEs);
    words.push(...exampleWords);
  }

  // For cloze cards, extract from the full sentence too
  if (card.type === 'CLOZE' && card.clozeSentence) {
    const sentenceWords = extractWordsFromSentence(card.clozeSentence);
    words.push(...sentenceWords);
  }

  return [...new Set(words)]; // Remove duplicates
}

/**
 * Extract individual words from a Spanish sentence
 */
export function extractWordsFromSentence(sentence: string): string[] {
  // Common Spanish stopwords to filter out
  const stopwords = new Set([
    'el',
    'la',
    'los',
    'las',
    'un',
    'una',
    'unos',
    'unas',
    'de',
    'del',
    'en',
    'a',
    'al',
    'y',
    'e',
    'o',
    'u',
    'que',
    'es',
    'son',
    'está',
    'están',
    'ser',
    'estar',
    'con',
    'por',
    'para',
    'sin',
    'sobre',
    'entre',
    'como',
    'se',
    'su',
    'sus',
    'mi',
    'mis',
    'tu',
    'tus',
    'lo',
    'le',
    'les',
    'me',
    'te',
    'nos',
    'muy',
    'más',
    'menos',
    'ya',
    'no',
    'sí',
    'pero',
    'si',
    'cuando',
    'donde',
    'porque',
    'qué',
    'quién',
    'cuál',
    'cómo',
    'cuándo',
    'dónde',
    'hay',
    'ha',
    'han',
    'he',
    'has',
    'este',
    'esta',
    'estos',
    'estas',
    'ese',
    'esa',
    'esos',
    'esas',
    'aquel',
    'aquella',
  ]);

  return sentence
    .toLowerCase()
    .replace(/[¿¡.,!?;:'"()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopwords.has(word));
}

/**
 * Extract vocabulary from user's cards
 */
export function extractVocabulary(
  cards: Card[],
  config: VocabExtractConfig = {}
): VocabItem[] {
  const {
    minReps = 1,
    maxWords = 100,
    includeLearning = true,
    priorityTags = [],
  } = config;

  // Filter cards based on criteria
  const eligibleCards = cards.filter((card) => {
    if (card.reps < minReps) return false;
    if (!includeLearning && getMasteryLevel(card) === 'learning') return false;
    return true;
  });

  // Sort by priority: tagged cards first, then by mastery, then by recent review
  const sortedCards = [...eligibleCards].sort((a, b) => {
    // Priority tags first
    const aHasPriority = priorityTags.some((tag) => a.tags.includes(tag));
    const bHasPriority = priorityTags.some((tag) => b.tags.includes(tag));
    if (aHasPriority && !bHasPriority) return -1;
    if (!aHasPriority && bHasPriority) return 1;

    // Then by mastery level
    const masteryOrder = { mastered: 0, familiar: 1, learning: 2 };
    const aMastery = masteryOrder[getMasteryLevel(a)];
    const bMastery = masteryOrder[getMasteryLevel(b)];
    if (aMastery !== bMastery) return aMastery - bMastery;

    // Then by most recently reviewed
    const aTime = a.lastReviewedAt || 0;
    const bTime = b.lastReviewedAt || 0;
    return bTime - aTime;
  });

  // Extract vocabulary items
  const vocabMap = new Map<string, VocabItem>();

  for (const card of sortedCards) {
    if (vocabMap.size >= maxWords) break;

    const word = extractWordFromCard(card);
    if (!word || vocabMap.has(word)) continue;

    vocabMap.set(word, {
      word,
      translation: card.back,
      mastery: getMasteryLevel(card),
      lastReviewedAt: card.lastReviewedAt,
    });
  }

  return Array.from(vocabMap.values());
}

/**
 * Get just the Spanish words as a list
 */
export function getKnownWords(cards: Card[], config: VocabExtractConfig = {}): string[] {
  const vocab = extractVocabulary(cards, config);
  return vocab.map((v) => v.word);
}

/**
 * Get vocabulary grouped by mastery level
 */
export function getVocabularyByMastery(
  cards: Card[]
): Record<'learning' | 'familiar' | 'mastered', VocabItem[]> {
  const vocab = extractVocabulary(cards, { maxWords: 500, includeLearning: true });

  return {
    learning: vocab.filter((v) => v.mastery === 'learning'),
    familiar: vocab.filter((v) => v.mastery === 'familiar'),
    mastered: vocab.filter((v) => v.mastery === 'mastered'),
  };
}

/**
 * Get vocabulary for a specific tag
 */
export function getVocabularyByTag(cards: Card[], tag: string): VocabItem[] {
  const taggedCards = cards.filter((card) => card.tags.includes(tag));
  return extractVocabulary(taggedCards, { maxWords: 100 });
}

/**
 * Check if a word is in the user's vocabulary
 */
export function isKnownWord(cards: Card[], word: string): boolean {
  const normalizedWord = cleanWord(word);
  return cards.some((card) => {
    const cardWord = extractWordFromCard(card);
    return cardWord === normalizedWord;
  });
}

/**
 * Find cards that contain a specific word
 */
export function findCardsWithWord(cards: Card[], word: string): Card[] {
  const normalizedWord = cleanWord(word);

  return cards.filter((card) => {
    // Check main word
    const mainWord = extractWordFromCard(card);
    if (mainWord === normalizedWord) return true;

    // Check examples
    if (card.exampleEs) {
      const exampleWords = extractWordsFromSentence(card.exampleEs);
      if (exampleWords.includes(normalizedWord)) return true;
    }

    // Check cloze sentence
    if (card.clozeSentence) {
      const sentenceWords = extractWordsFromSentence(card.clozeSentence);
      if (sentenceWords.includes(normalizedWord)) return true;
    }

    return false;
  });
}

/**
 * Get vocabulary summary for conversation context
 */
export function getVocabularySummary(cards: Card[]): {
  totalWords: number;
  masteredCount: number;
  familiarCount: number;
  learningCount: number;
  recentWords: string[];
  topTags: string[];
} {
  const vocab = extractVocabulary(cards, { maxWords: 500 });
  const byMastery = getVocabularyByMastery(cards);

  // Get recently reviewed words
  const recentVocab = [...vocab]
    .filter((v) => v.lastReviewedAt)
    .sort((a, b) => (b.lastReviewedAt || 0) - (a.lastReviewedAt || 0))
    .slice(0, 10);

  // Get top tags
  const tagCounts = new Map<string, number>();
  for (const card of cards) {
    for (const tag of card.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  return {
    totalWords: vocab.length,
    masteredCount: byMastery.mastered.length,
    familiarCount: byMastery.familiar.length,
    learningCount: byMastery.learning.length,
    recentWords: recentVocab.map((v) => v.word),
    topTags,
  };
}

/**
 * Build a vocabulary context string for LLM prompts
 */
export function buildVocabContext(cards: Card[], maxWords: number = 50): string {
  const vocab = extractVocabulary(cards, { maxWords, minReps: 1 });

  if (vocab.length === 0) {
    return 'hola, adiós, gracias, por favor, sí, no'; // Basic fallback
  }

  // Prioritize mastered and familiar words
  const prioritized = vocab
    .sort((a, b) => {
      const order = { mastered: 0, familiar: 1, learning: 2 };
      return order[a.mastery] - order[b.mastery];
    })
    .slice(0, maxWords);

  return prioritized.map((v) => v.word).join(', ');
}
