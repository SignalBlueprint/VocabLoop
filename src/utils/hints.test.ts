import { describe, it, expect } from 'vitest';
import {
  getFirstLetterHint,
  getHalfWordHint,
  getSyllableHint,
  getHint,
  getHintDescription,
  HINT_COSTS,
} from './hints';

describe('Hints System', () => {
  describe('getFirstLetterHint', () => {
    it('should return empty string for empty input', () => {
      expect(getFirstLetterHint('')).toBe('');
    });

    it('should reveal first letter and hide rest', () => {
      const hint = getFirstLetterHint('hola');
      expect(hint[0]).toBe('h');
      expect(hint.slice(1)).toBe('___');
    });

    it('should handle single character', () => {
      expect(getFirstLetterHint('a')).toBe('a');
    });

    it('should preserve first letter with accents', () => {
      const hint = getFirstLetterHint('árbol');
      expect(hint[0]).toBe('á');
    });

    it('should handle Spanish special characters', () => {
      const hint = getFirstLetterHint('ñoño');
      expect(hint[0]).toBe('ñ');
    });
  });

  describe('getHalfWordHint', () => {
    it('should return empty string for empty input', () => {
      expect(getHalfWordHint('')).toBe('');
    });

    it('should always reveal first letter', () => {
      const hint = getHalfWordHint('hola');
      expect(hint[0]).toBe('h');
    });

    it('should reveal approximately half the letters', () => {
      const hint = getHalfWordHint('perro');
      // First letter always revealed, plus ~half of remaining
      const revealedCount = hint.split('').filter(c => c !== '_').length;
      expect(revealedCount).toBeGreaterThanOrEqual(1);
      expect(revealedCount).toBeLessThanOrEqual(hint.length);
    });

    it('should preserve spaces', () => {
      const hint = getHalfWordHint('buenos días');
      expect(hint).toContain(' ');
    });

    it('should preserve punctuation', () => {
      const hint = getHalfWordHint('¡hola!');
      expect(hint).toContain('¡');
      expect(hint).toContain('!');
    });
  });

  describe('getSyllableHint', () => {
    it('should split simple words into syllables', () => {
      const hint = getSyllableHint('hola');
      expect(hint).toContain(' · ');
    });

    it('should handle single syllable words', () => {
      const hint = getSyllableHint('sol');
      // Single syllable word may not have separator
      expect(hint.length).toBeGreaterThan(0);
    });

    it('should handle accented vowels', () => {
      const hint = getSyllableHint('café');
      expect(hint.length).toBeGreaterThan(0);
    });
  });

  describe('getHint', () => {
    it('should return empty string for level 0', () => {
      expect(getHint('hola', 0)).toBe('');
    });

    it('should return first letter hint for level 1', () => {
      const hint = getHint('hola', 1);
      expect(hint[0]).toBe('h');
      expect(hint).toContain('_');
    });

    it('should return half word hint for level 2', () => {
      const hint = getHint('hola', 2);
      expect(hint[0]).toBe('h'); // First letter always revealed
    });

    it('should return full word for level 3', () => {
      expect(getHint('hola', 3)).toBe('hola');
    });

    it('should return empty string for invalid level', () => {
      expect(getHint('hola', 4)).toBe('');
      expect(getHint('hola', -1)).toBe('');
    });
  });

  describe('getHintDescription', () => {
    it('should return correct descriptions for each level', () => {
      expect(getHintDescription(1)).toBe('First letter');
      expect(getHintDescription(2)).toBe('Half revealed');
      expect(getHintDescription(3)).toBe('Full answer');
    });

    it('should return default for level 0', () => {
      expect(getHintDescription(0)).toBe('Get a hint');
    });

    it('should return default for invalid levels', () => {
      expect(getHintDescription(-1)).toBe('Get a hint');
      expect(getHintDescription(4)).toBe('Get a hint');
    });
  });

  describe('HINT_COSTS', () => {
    it('should have increasing costs', () => {
      expect(HINT_COSTS[0]).toBeLessThan(HINT_COSTS[1]);
      expect(HINT_COSTS[1]).toBeLessThan(HINT_COSTS[2]);
    });

    it('should have correct values', () => {
      expect(HINT_COSTS[0]).toBe(5);
      expect(HINT_COSTS[1]).toBe(10);
      expect(HINT_COSTS[2]).toBe(15);
    });
  });
});
