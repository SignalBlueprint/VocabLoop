import type { Card } from '../types';
import { getAllCards, importCards } from '../db/cards';
import starterDecksData from '../data/starterDecks.json';

const FIRST_LAUNCH_KEY = 'vocabloop_first_launch_complete';
const AUTO_LOADED_DECK_KEY = 'vocabloop_auto_loaded_deck';

interface StarterDeck {
  id: string;
  name: string;
  description: string;
  icon: string;
  cardCount: number;
  cards: { front: string; back: string; tags: string[] }[];
}

// Check if this is the first launch
export function isFirstLaunch(): boolean {
  return localStorage.getItem(FIRST_LAUNCH_KEY) !== 'true';
}

// Mark first launch as complete
export function markFirstLaunchComplete(): void {
  localStorage.setItem(FIRST_LAUNCH_KEY, 'true');
}

// Check if a deck was auto-loaded
export function wasAutoLoaded(): boolean {
  return localStorage.getItem(AUTO_LOADED_DECK_KEY) === 'true';
}

// Auto-load the Common Phrases starter deck for new users
export async function autoLoadStarterDeck(): Promise<{ loaded: boolean; cardCount: number }> {
  // Don't auto-load if already done
  if (wasAutoLoaded()) {
    return { loaded: false, cardCount: 0 };
  }

  // Check if user already has cards
  const existingCards = await getAllCards();
  if (existingCards.length > 0) {
    localStorage.setItem(AUTO_LOADED_DECK_KEY, 'true');
    return { loaded: false, cardCount: 0 };
  }

  // Get the Common Phrases deck (first deck)
  const decks = starterDecksData.decks as StarterDeck[];
  const commonPhrasesDeck = decks.find(d => d.id === 'common-phrases');

  if (!commonPhrasesDeck) {
    return { loaded: false, cardCount: 0 };
  }

  // Convert to Card format
  const now = Date.now();
  const cardsToImport: Card[] = commonPhrasesDeck.cards.map((c, index) => ({
    id: `card_${now}_${Math.random().toString(36).substring(2, 9)}_${index}`,
    type: 'BASIC' as const,
    front: c.front,
    back: c.back,
    tags: [...c.tags, `deck:${commonPhrasesDeck.id}`],
    ease: 2.5,
    intervalDays: 0,
    reps: 0,
    dueAt: now,
    lapses: 0,
    createdAt: now,
    updatedAt: now,
  }));

  await importCards(cardsToImport);
  localStorage.setItem(AUTO_LOADED_DECK_KEY, 'true');

  return { loaded: true, cardCount: cardsToImport.length };
}
