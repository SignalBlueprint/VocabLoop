/**
 * VocabLoop Enhanced Vocabulary Corpus
 *
 * Exports vocabulary data with domain tags, regional variants,
 * difficulty ratings, and frequency rankings.
 */

export * from './types';
export * from './domains';

import type { VocabularyCorpus, VocabularyWord, Difficulty, Domain, Region } from './types';
import { DOMAIN_WORD_SETS, getAllDomainWords, getDomainWordCount } from './domains';

/**
 * The complete vocabulary corpus
 */
export const VOCABULARY_CORPUS: VocabularyCorpus = {
  version: '1.0.0',
  totalWords: getDomainWordCount(),
  lastUpdated: '2026-01-08',
  domains: DOMAIN_WORD_SETS,
};

/**
 * Filter vocabulary by difficulty level
 */
export function filterByDifficulty(
  words: VocabularyWord[],
  difficulty: Difficulty | Difficulty[]
): VocabularyWord[] {
  const levels = Array.isArray(difficulty) ? difficulty : [difficulty];
  return words.filter((w) => levels.includes(w.difficulty));
}

/**
 * Filter vocabulary by domain
 */
export function filterByDomain(
  words: VocabularyWord[],
  domain: Domain | Domain[]
): VocabularyWord[] {
  const domains = Array.isArray(domain) ? domain : [domain];
  return words.filter((w) => w.domains.some((d) => domains.includes(d)));
}

/**
 * Filter vocabulary by region
 */
export function filterByRegion(
  words: VocabularyWord[],
  region: Region | Region[]
): VocabularyWord[] {
  const regions = Array.isArray(region) ? region : [region];
  return words.filter(
    (w) => regions.includes(w.region) || regions.includes('neutral') || w.region === 'neutral'
  );
}

/**
 * Get words sorted by frequency (most common first)
 */
export function sortByFrequency(words: VocabularyWord[]): VocabularyWord[] {
  return [...words].sort((a, b) => a.frequencyRank - b.frequencyRank);
}

/**
 * Get words for a specific CEFR level and below
 */
export function getWordsUpToLevel(maxLevel: Difficulty): VocabularyWord[] {
  const levelOrder: Difficulty[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const maxIndex = levelOrder.indexOf(maxLevel);
  const allowedLevels = levelOrder.slice(0, maxIndex + 1);
  return filterByDifficulty(getAllDomainWords(), allowedLevels);
}

/**
 * Search vocabulary by Spanish or English term
 */
export function searchVocabulary(query: string): VocabularyWord[] {
  const lowerQuery = query.toLowerCase();
  return getAllDomainWords().filter((w) => {
    const englishMatches = Array.isArray(w.english)
      ? w.english.some((e) => e.toLowerCase().includes(lowerQuery))
      : w.english.toLowerCase().includes(lowerQuery);
    return w.spanish.toLowerCase().includes(lowerQuery) || englishMatches;
  });
}

/**
 * Get vocabulary statistics
 */
export function getVocabularyStats(): {
  totalWords: number;
  byDifficulty: Record<Difficulty, number>;
  byDomain: Record<Domain, number>;
  byRegion: Record<Region, number>;
} {
  const words = getAllDomainWords();

  const byDifficulty: Record<Difficulty, number> = {
    A1: 0,
    A2: 0,
    B1: 0,
    B2: 0,
    C1: 0,
    C2: 0,
  };

  const byDomain: Record<Domain, number> = {
    general: 0,
    travel: 0,
    food: 0,
    business: 0,
    medical: 0,
    legal: 0,
    technology: 0,
    academic: 0,
    sports: 0,
    arts: 0,
    nature: 0,
    family: 0,
    emotions: 0,
    time: 0,
    numbers: 0,
  };

  const byRegion: Record<Region, number> = {
    neutral: 0,
    spain: 0,
    mexico: 0,
    argentina: 0,
    colombia: 0,
    caribbean: 0,
  };

  for (const word of words) {
    byDifficulty[word.difficulty]++;
    for (const domain of word.domains) {
      byDomain[domain]++;
    }
    byRegion[word.region]++;
  }

  return {
    totalWords: words.length,
    byDifficulty,
    byDomain,
    byRegion,
  };
}

/**
 * Convert enhanced vocabulary to simple frequency list format
 * (for backwards compatibility)
 */
export function toFrequencyListFormat(
  words: VocabularyWord[]
): Array<{ spanish: string; english: string }> {
  return sortByFrequency(words).map((w) => ({
    spanish: w.spanish,
    english: Array.isArray(w.english) ? w.english[0] : w.english,
  }));
}

/**
 * Get a random selection of words for practice
 */
export function getRandomWords(count: number, options?: {
  difficulty?: Difficulty | Difficulty[];
  domain?: Domain | Domain[];
  region?: Region | Region[];
}): VocabularyWord[] {
  let words = getAllDomainWords();

  if (options?.difficulty) {
    words = filterByDifficulty(words, options.difficulty);
  }
  if (options?.domain) {
    words = filterByDomain(words, options.domain);
  }
  if (options?.region) {
    words = filterByRegion(words, options.region);
  }

  // Shuffle and take count
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
