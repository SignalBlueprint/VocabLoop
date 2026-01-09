/**
 * Enhanced Vocabulary Types
 *
 * Types for the expanded vocabulary corpus with domain tags,
 * regional variants, and difficulty ratings.
 */

export type Domain =
  | 'general'
  | 'travel'
  | 'food'
  | 'business'
  | 'medical'
  | 'legal'
  | 'technology'
  | 'academic'
  | 'sports'
  | 'arts'
  | 'nature'
  | 'family'
  | 'emotions'
  | 'time'
  | 'numbers';

export type Region = 'neutral' | 'spain' | 'mexico' | 'argentina' | 'colombia' | 'caribbean';

export type Difficulty = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'preposition'
  | 'conjunction'
  | 'article'
  | 'interjection'
  | 'phrase';

export interface RegionalVariant {
  region: Region;
  word: string;
  note?: string;
}

export interface VocabularyWord {
  /** Spanish word */
  spanish: string;
  /** English translation(s) */
  english: string | string[];
  /** Part of speech */
  pos: PartOfSpeech;
  /** Frequency rank (1 = most common) */
  frequencyRank: number;
  /** CEFR difficulty level */
  difficulty: Difficulty;
  /** Domain categories */
  domains: Domain[];
  /** Primary region (or neutral for universal) */
  region: Region;
  /** Regional variants if any */
  variants?: RegionalVariant[];
  /** Example sentence in Spanish */
  example?: string;
  /** Example translation */
  exampleTranslation?: string;
  /** Related words */
  related?: string[];
  /** IPA pronunciation */
  ipa?: string;
  /** Audio file reference */
  audioFile?: string;
  /** Gender for nouns (m/f/mf) */
  gender?: 'm' | 'f' | 'mf';
  /** Is this word irregular (for verbs) */
  irregular?: boolean;
  /** Common collocations */
  collocations?: string[];
  /** Usage notes */
  notes?: string;
}

export interface DomainWordSet {
  domain: Domain;
  name: string;
  nameEs: string;
  description: string;
  words: VocabularyWord[];
}

export interface VocabularyCorpus {
  version: string;
  totalWords: number;
  lastUpdated: string;
  domains: DomainWordSet[];
}

export interface FrequencyList {
  version: string;
  source: string;
  words: VocabularyWord[];
}

/**
 * Difficulty level descriptions
 */
export const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
  A1: 'Beginner - Basic phrases and vocabulary',
  A2: 'Elementary - Common everyday expressions',
  B1: 'Intermediate - Independent communication',
  B2: 'Upper Intermediate - Complex texts and discussions',
  C1: 'Advanced - Flexible and effective language use',
  C2: 'Proficient - Near-native fluency',
};

/**
 * Domain descriptions
 */
export const DOMAIN_INFO: Record<Domain, { name: string; nameEs: string; icon: string }> = {
  general: { name: 'General', nameEs: 'General', icon: '📚' },
  travel: { name: 'Travel', nameEs: 'Viajes', icon: '✈️' },
  food: { name: 'Food & Dining', nameEs: 'Comida', icon: '🍽️' },
  business: { name: 'Business', nameEs: 'Negocios', icon: '💼' },
  medical: { name: 'Medical', nameEs: 'Médico', icon: '🏥' },
  legal: { name: 'Legal', nameEs: 'Legal', icon: '⚖️' },
  technology: { name: 'Technology', nameEs: 'Tecnología', icon: '💻' },
  academic: { name: 'Academic', nameEs: 'Académico', icon: '🎓' },
  sports: { name: 'Sports', nameEs: 'Deportes', icon: '⚽' },
  arts: { name: 'Arts & Culture', nameEs: 'Arte y Cultura', icon: '🎨' },
  nature: { name: 'Nature', nameEs: 'Naturaleza', icon: '🌿' },
  family: { name: 'Family & Relationships', nameEs: 'Familia', icon: '👨‍👩‍👧' },
  emotions: { name: 'Emotions', nameEs: 'Emociones', icon: '❤️' },
  time: { name: 'Time & Dates', nameEs: 'Tiempo', icon: '🕐' },
  numbers: { name: 'Numbers', nameEs: 'Números', icon: '🔢' },
};

/**
 * Region descriptions
 */
export const REGION_INFO: Record<Region, { name: string; flag: string }> = {
  neutral: { name: 'Universal Spanish', flag: '🌎' },
  spain: { name: 'Spain', flag: '🇪🇸' },
  mexico: { name: 'Mexico', flag: '🇲🇽' },
  argentina: { name: 'Argentina', flag: '🇦🇷' },
  colombia: { name: 'Colombia', flag: '🇨🇴' },
  caribbean: { name: 'Caribbean', flag: '🌴' },
};
