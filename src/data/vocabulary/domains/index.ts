/**
 * Domain Vocabulary Index
 */

export { travelVocabulary } from './travel';
export { foodVocabulary } from './food';
export { medicalVocabulary } from './medical';
export { businessVocabulary } from './business';

import { travelVocabulary } from './travel';
import { foodVocabulary } from './food';
import { medicalVocabulary } from './medical';
import { businessVocabulary } from './business';
import type { DomainWordSet, VocabularyWord } from '../types';

/**
 * All domain word sets
 */
export const DOMAIN_WORD_SETS: DomainWordSet[] = [
  {
    domain: 'travel',
    name: 'Travel',
    nameEs: 'Viajes',
    description: 'Vocabulary for airports, hotels, and transportation',
    words: travelVocabulary,
  },
  {
    domain: 'food',
    name: 'Food & Dining',
    nameEs: 'Comida',
    description: 'Vocabulary for restaurants, cooking, and meals',
    words: foodVocabulary,
  },
  {
    domain: 'medical',
    name: 'Medical',
    nameEs: 'Médico',
    description: 'Vocabulary for health, doctors, and hospitals',
    words: medicalVocabulary,
  },
  {
    domain: 'business',
    name: 'Business',
    nameEs: 'Negocios',
    description: 'Vocabulary for work, finance, and commerce',
    words: businessVocabulary,
  },
];

/**
 * Get all words from all domains
 */
export function getAllDomainWords(): VocabularyWord[] {
  return DOMAIN_WORD_SETS.flatMap((set) => set.words);
}

/**
 * Get words by domain
 */
export function getWordsByDomain(domain: string): VocabularyWord[] {
  const set = DOMAIN_WORD_SETS.find((s) => s.domain === domain);
  return set ? set.words : [];
}

/**
 * Get total word count across all domains
 */
export function getDomainWordCount(): number {
  return DOMAIN_WORD_SETS.reduce((sum, set) => sum + set.words.length, 0);
}
