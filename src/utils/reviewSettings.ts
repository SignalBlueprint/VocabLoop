// Review settings stored in localStorage

export type ReviewDirection = 'spanish-to-english' | 'english-to-spanish' | 'mixed';

const STORAGE_KEY = 'vocabloop_review_direction';

export function getReviewDirection(): ReviewDirection {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'spanish-to-english' || stored === 'english-to-spanish' || stored === 'mixed') {
    return stored;
  }
  return 'spanish-to-english'; // Default
}

export function setReviewDirection(direction: ReviewDirection): void {
  localStorage.setItem(STORAGE_KEY, direction);
}

export const DIRECTION_INFO: Record<ReviewDirection, { label: string; description: string; icon: string }> = {
  'spanish-to-english': {
    label: 'Spanish → English',
    description: 'See Spanish, recall English',
    icon: '🇪🇸',
  },
  'english-to-spanish': {
    label: 'English → Spanish',
    description: 'See English, recall Spanish',
    icon: '🇺🇸',
  },
  'mixed': {
    label: 'Mixed Mode',
    description: 'Random direction each card',
    icon: '🔀',
  },
};
