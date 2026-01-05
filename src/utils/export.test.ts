import { describe, it, expect } from 'vitest';
import { validateImportData } from './export';

describe('validateImportData', () => {
  it('should return false for null', () => {
    expect(validateImportData(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(validateImportData(undefined)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(validateImportData('string')).toBe(false);
    expect(validateImportData(123)).toBe(false);
    expect(validateImportData([])).toBe(false);
  });

  it('should return false for missing version', () => {
    expect(validateImportData({ cards: [] })).toBe(false);
  });

  it('should return false for non-number version', () => {
    expect(validateImportData({ version: '1', cards: [] })).toBe(false);
  });

  it('should return false for missing cards array', () => {
    expect(validateImportData({ version: 1 })).toBe(false);
  });

  it('should return false for non-array cards', () => {
    expect(validateImportData({ version: 1, cards: 'not an array' })).toBe(false);
    expect(validateImportData({ version: 1, cards: {} })).toBe(false);
  });

  it('should return false for cards with missing id', () => {
    const data = {
      version: 1,
      cards: [{ front: 'hola', back: 'hello' }],
    };
    expect(validateImportData(data)).toBe(false);
  });

  it('should return false for cards with non-string id', () => {
    const data = {
      version: 1,
      cards: [{ id: 123, front: 'hola', back: 'hello' }],
    };
    expect(validateImportData(data)).toBe(false);
  });

  it('should return false for cards with missing front', () => {
    const data = {
      version: 1,
      cards: [{ id: '1', back: 'hello' }],
    };
    expect(validateImportData(data)).toBe(false);
  });

  it('should return false for cards with missing back', () => {
    const data = {
      version: 1,
      cards: [{ id: '1', front: 'hola' }],
    };
    expect(validateImportData(data)).toBe(false);
  });

  it('should return true for valid minimal data', () => {
    const data = {
      version: 1,
      cards: [],
    };
    expect(validateImportData(data)).toBe(true);
  });

  it('should return true for valid data with cards', () => {
    const data = {
      version: 1,
      cards: [
        { id: '1', front: 'hola', back: 'hello' },
        { id: '2', front: 'adios', back: 'goodbye' },
      ],
    };
    expect(validateImportData(data)).toBe(true);
  });

  it('should return true for valid data with all fields', () => {
    const data = {
      version: 1,
      exportedAt: Date.now(),
      cards: [
        {
          id: '1',
          type: 'BASIC',
          front: 'hola',
          back: 'hello',
          exampleEs: 'Hola mundo',
          exampleEn: 'Hello world',
          notes: 'greeting',
          tags: ['greetings'],
          ease: 2.5,
          intervalDays: 1,
          reps: 1,
          dueAt: Date.now(),
          lapses: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      reviews: [
        {
          id: 'r1',
          cardId: '1',
          reviewedAt: Date.now(),
          grade: 'good',
          previousInterval: 0,
          newInterval: 1,
          previousDueAt: Date.now(),
          newDueAt: Date.now(),
        },
      ],
    };
    expect(validateImportData(data)).toBe(true);
  });

  it('should return false if any card in array is invalid', () => {
    const data = {
      version: 1,
      cards: [
        { id: '1', front: 'hola', back: 'hello' },
        { id: '2', front: 'adios' }, // missing back
      ],
    };
    expect(validateImportData(data)).toBe(false);
  });

  it('should return false for null card in array', () => {
    const data = {
      version: 1,
      cards: [null],
    };
    expect(validateImportData(data)).toBe(false);
  });
});
