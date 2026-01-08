import { describe, it, expect } from 'vitest';
import type { Card } from '../types';
import {
  getMasteryLevel,
  extractWordFromCard,
  extractWordsFromSentence,
  extractVocabulary,
  getKnownWords,
  getVocabularyByMastery,
  isKnownWord,
  findCardsWithWord,
  buildVocabContext,
} from './vocabExtract';

const createCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'test-1',
  type: 'BASIC',
  front: 'hola',
  back: 'hello',
  tags: [],
  ease: 2.5,
  intervalDays: 1,
  reps: 1,
  dueAt: Date.now(),
  lapses: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('getMasteryLevel', () => {
  it('returns "learning" for new cards', () => {
    const card = createCard({ reps: 0, intervalDays: 0 });
    expect(getMasteryLevel(card)).toBe('learning');
  });

  it('returns "learning" for cards with low reps', () => {
    const card = createCard({ reps: 1, intervalDays: 1 });
    expect(getMasteryLevel(card)).toBe('learning');
  });

  it('returns "familiar" for cards with moderate progress', () => {
    const card = createCard({ reps: 3, intervalDays: 7 });
    expect(getMasteryLevel(card)).toBe('familiar');
  });

  it('returns "mastered" for well-learned cards', () => {
    const card = createCard({ reps: 6, intervalDays: 30 });
    expect(getMasteryLevel(card)).toBe('mastered');
  });
});

describe('extractWordFromCard', () => {
  it('extracts word from BASIC card', () => {
    const card = createCard({ type: 'BASIC', front: 'Hola' });
    expect(extractWordFromCard(card)).toBe('hola');
  });

  it('extracts word from VERB card', () => {
    const card = createCard({ type: 'VERB', front: 'Hablar' });
    expect(extractWordFromCard(card)).toBe('hablar');
  });

  it('extracts word from CLOZE card with clozeWord', () => {
    const card = createCard({
      type: 'CLOZE',
      front: 'Yo {{c1::como}} manzanas',
      clozeWord: 'como',
    });
    expect(extractWordFromCard(card)).toBe('como');
  });

  it('extracts word from CLOZE card without clozeWord (fallback)', () => {
    const card = createCard({
      type: 'CLOZE',
      front: 'Yo {{c1::bebo}} agua',
      clozeWord: undefined,
    });
    expect(extractWordFromCard(card)).toBe('bebo');
  });

  it('cleans punctuation from words', () => {
    const card = createCard({ type: 'BASIC', front: '¿Cómo?' });
    expect(extractWordFromCard(card)).toBe('cómo');
  });
});

describe('extractWordsFromSentence', () => {
  it('extracts content words from a sentence', () => {
    const words = extractWordsFromSentence('Yo tengo un gato grande');
    expect(words).toContain('tengo');
    expect(words).toContain('gato');
    expect(words).toContain('grande');
  });

  it('filters out stopwords', () => {
    const words = extractWordsFromSentence('El gato está en la casa');
    expect(words).not.toContain('el');
    expect(words).not.toContain('en');
    expect(words).not.toContain('la');
    expect(words).toContain('gato');
    expect(words).toContain('casa');
  });

  it('filters out short words', () => {
    const words = extractWordsFromSentence('Yo no sé qué hacer');
    expect(words).not.toContain('yo');
    expect(words).not.toContain('no');
    expect(words).toContain('hacer');
  });

  it('removes punctuation', () => {
    const words = extractWordsFromSentence('¡Hola! ¿Cómo estás?');
    expect(words).toContain('hola');
    // 'cómo' is filtered as a stopword
    expect(words).not.toContain('cómo');
    expect(words).toContain('estás');
  });
});

describe('extractVocabulary', () => {
  const cards: Card[] = [
    createCard({
      id: '1',
      front: 'hola',
      back: 'hello',
      reps: 5,
      intervalDays: 30,
    }),
    createCard({
      id: '2',
      front: 'adiós',
      back: 'goodbye',
      reps: 3,
      intervalDays: 7,
    }),
    createCard({
      id: '3',
      front: 'gracias',
      back: 'thank you',
      reps: 1,
      intervalDays: 1,
    }),
    createCard({
      id: '4',
      front: 'por favor',
      back: 'please',
      reps: 0,
      intervalDays: 0,
    }),
  ];

  it('extracts vocabulary from cards', () => {
    const vocab = extractVocabulary(cards);
    expect(vocab.length).toBeGreaterThan(0);
    expect(vocab.some((v) => v.word === 'hola')).toBe(true);
  });

  it('respects minReps filter', () => {
    const vocab = extractVocabulary(cards, { minReps: 3 });
    expect(vocab.some((v) => v.word === 'hola')).toBe(true);
    expect(vocab.some((v) => v.word === 'adiós')).toBe(true);
    expect(vocab.some((v) => v.word === 'gracias')).toBe(false);
  });

  it('respects maxWords limit', () => {
    const vocab = extractVocabulary(cards, { maxWords: 2, minReps: 0 });
    expect(vocab.length).toBeLessThanOrEqual(2);
  });

  it('includes mastery level', () => {
    const vocab = extractVocabulary(cards);
    const holaVocab = vocab.find((v) => v.word === 'hola');
    expect(holaVocab?.mastery).toBe('mastered');
  });

  it('filters out learning cards when includeLearning is false', () => {
    const vocab = extractVocabulary(cards, {
      includeLearning: false,
      minReps: 0,
    });
    expect(vocab.some((v) => v.word === 'por favor')).toBe(false);
  });
});

describe('getKnownWords', () => {
  const cards: Card[] = [
    createCard({ front: 'hola', reps: 2 }),
    createCard({ front: 'adiós', reps: 2 }),
    createCard({ front: 'gracias', reps: 2 }),
  ];

  it('returns just the Spanish words', () => {
    const words = getKnownWords(cards);
    expect(words).toContain('hola');
    expect(words).toContain('adiós');
    expect(words).toContain('gracias');
  });
});

describe('getVocabularyByMastery', () => {
  const cards: Card[] = [
    createCard({ id: '1', front: 'hola', reps: 6, intervalDays: 30 }),
    createCard({ id: '2', front: 'adiós', reps: 3, intervalDays: 7 }),
    createCard({ id: '3', front: 'gracias', reps: 1, intervalDays: 1 }),
  ];

  it('groups vocabulary by mastery level', () => {
    const byMastery = getVocabularyByMastery(cards);
    expect(byMastery.mastered.some((v) => v.word === 'hola')).toBe(true);
    expect(byMastery.familiar.some((v) => v.word === 'adiós')).toBe(true);
    expect(byMastery.learning.some((v) => v.word === 'gracias')).toBe(true);
  });
});

describe('isKnownWord', () => {
  const cards: Card[] = [
    createCard({ front: 'hola', reps: 2 }),
    createCard({ front: 'adiós', reps: 2 }),
  ];

  it('returns true for known words', () => {
    expect(isKnownWord(cards, 'hola')).toBe(true);
    expect(isKnownWord(cards, 'Hola')).toBe(true); // Case insensitive
  });

  it('returns false for unknown words', () => {
    expect(isKnownWord(cards, 'gracias')).toBe(false);
  });
});

describe('findCardsWithWord', () => {
  const cards: Card[] = [
    createCard({ id: '1', front: 'hola', exampleEs: 'Hola, ¿cómo estás?' }),
    createCard({ id: '2', front: 'adiós' }),
    createCard({
      id: '3',
      type: 'CLOZE',
      front: 'Yo {{c1::estoy}} bien',
      clozeSentence: 'Yo estoy bien',
      clozeWord: 'estoy',
    }),
  ];

  it('finds cards with matching front word', () => {
    const found = findCardsWithWord(cards, 'hola');
    expect(found.length).toBe(1);
    expect(found[0].id).toBe('1');
  });

  it('finds cards with word in example sentence', () => {
    const found = findCardsWithWord(cards, 'estás');
    expect(found.length).toBe(1);
    expect(found[0].id).toBe('1');
  });

  it('finds cards with word in cloze sentence', () => {
    const found = findCardsWithWord(cards, 'estoy');
    expect(found.length).toBe(1);
    expect(found[0].id).toBe('3');
  });
});

describe('buildVocabContext', () => {
  const cards: Card[] = [
    createCard({ front: 'hola', reps: 5, intervalDays: 30 }),
    createCard({ front: 'adiós', reps: 3, intervalDays: 7 }),
    createCard({ front: 'gracias', reps: 2, intervalDays: 3 }),
  ];

  it('builds a comma-separated vocabulary string', () => {
    const context = buildVocabContext(cards);
    expect(context).toContain('hola');
    expect(context).toContain(',');
  });

  it('respects maxWords limit', () => {
    const context = buildVocabContext(cards, 2);
    const words = context.split(',').map((w) => w.trim());
    expect(words.length).toBeLessThanOrEqual(2);
  });

  it('returns fallback for empty cards', () => {
    const context = buildVocabContext([]);
    expect(context).toContain('hola');
    expect(context).toContain('adiós');
  });

  it('prioritizes mastered words', () => {
    const context = buildVocabContext(cards, 1);
    expect(context).toBe('hola'); // Most mastered word
  });
});
