// Hint system utilities

export interface HintState {
  revealed: number; // Number of hint levels revealed (0-3)
  cost: number; // XP cost for current hint
}

// Hint costs increase with each level
export const HINT_COSTS = [5, 10, 15]; // First letter, half word, full word

// Get first letter hint
export function getFirstLetterHint(word: string): string {
  if (!word || word.length === 0) return '';
  const firstChar = word[0];
  const remaining = word.slice(1).replace(/[a-záéíóúüñ]/gi, '_');
  return firstChar + remaining;
}

// Get half word hint (reveals ~half the letters)
export function getHalfWordHint(word: string): string {
  if (!word || word.length === 0) return '';

  const chars = word.split('');
  const indicesToReveal = new Set<number>();

  // Always reveal first letter
  indicesToReveal.add(0);

  // Reveal approximately half of remaining letters
  const remainingCount = Math.floor((chars.length - 1) / 2);
  const availableIndices = chars.map((_, i) => i).filter(i => i > 0);

  // Shuffle and pick
  const shuffled = availableIndices.sort(() => Math.random() - 0.5);
  shuffled.slice(0, remainingCount).forEach(i => indicesToReveal.add(i));

  return chars.map((char, i) => {
    if (indicesToReveal.has(i)) return char;
    // Keep spaces and punctuation
    if (!/[a-záéíóúüñ]/i.test(char)) return char;
    return '_';
  }).join('');
}

// Get syllable hint (splits word into syllables)
export function getSyllableHint(word: string): string {
  // Simple syllable splitting for Spanish
  // This is a basic implementation - Spanish syllables can be complex
  const vowels = 'aeiouáéíóúü';
  const result: string[] = [];
  let currentSyllable = '';

  for (let i = 0; i < word.length; i++) {
    const char = word[i].toLowerCase();
    currentSyllable += word[i];

    // Check if we should break the syllable
    if (vowels.includes(char)) {
      // Look ahead to see if next chars form a new syllable
      const next = word[i + 1]?.toLowerCase() || '';
      const nextNext = word[i + 2]?.toLowerCase() || '';

      // Break after vowel if:
      // - Next is a vowel (except for diphthongs)
      // - Next is a consonant followed by a vowel
      // - We're at the end
      if (i === word.length - 1 ||
          (vowels.includes(next) && !['i', 'u'].includes(next)) ||
          (next && !vowels.includes(next) && vowels.includes(nextNext))) {
        result.push(currentSyllable);
        currentSyllable = '';
      }
    }
  }

  if (currentSyllable) {
    result.push(currentSyllable);
  }

  return result.join(' · ');
}

// Get hint based on level
export function getHint(word: string, level: number): string {
  switch (level) {
    case 1:
      return getFirstLetterHint(word);
    case 2:
      return getHalfWordHint(word);
    case 3:
      return word; // Full reveal
    default:
      return '';
  }
}

// Get hint description
export function getHintDescription(level: number): string {
  switch (level) {
    case 1:
      return 'First letter';
    case 2:
      return 'Half revealed';
    case 3:
      return 'Full answer';
    default:
      return 'Get a hint';
  }
}
