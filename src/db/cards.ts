import type { Card, NewCard } from '../types';
import { getById, getAll, put, remove, queryByIndex, bulkPut } from './index';

const STORE_NAME = 'cards';

// Generate unique ID
function generateId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create a new card with default SRS values
export async function createCard(data: NewCard): Promise<Card> {
  const now = Date.now();
  const card: Card = {
    id: generateId(),
    type: data.type,
    front: data.front,
    back: data.back,
    exampleEs: data.exampleEs,
    exampleEn: data.exampleEn,
    notes: data.notes,
    tags: data.tags || [],
    // Cloze-specific fields
    clozeSentence: data.clozeSentence,
    clozeWord: data.clozeWord,
    // Default SRS values
    ease: 2.5,
    intervalDays: 0,
    reps: 0,
    dueAt: now, // Due immediately for new cards
    lapses: 0,
    lastReviewedAt: undefined,
    createdAt: now,
    updatedAt: now,
  };

  await put(STORE_NAME, card);
  return card;
}

// Get card by ID
export async function getCard(id: string): Promise<Card | undefined> {
  return getById<Card>(STORE_NAME, id);
}

// Get all cards
export async function getAllCards(): Promise<Card[]> {
  return getAll<Card>(STORE_NAME);
}

// Update a card
export async function updateCard(card: Card): Promise<void> {
  card.updatedAt = Date.now();
  await put(STORE_NAME, card);
}

// Delete a card
export async function deleteCard(id: string): Promise<void> {
  await remove(STORE_NAME, id);
}

// Delete multiple cards
export async function deleteCards(ids: string[]): Promise<void> {
  for (const id of ids) {
    await remove(STORE_NAME, id);
  }
}

// Get due cards (dueAt <= now)
export async function getDueCards(): Promise<Card[]> {
  const now = Date.now();
  const allCards = await getAllCards();
  return allCards.filter(card => card.dueAt <= now);
}

// Get due cards count
export async function getDueCount(): Promise<number> {
  const dueCards = await getDueCards();
  return dueCards.length;
}

// Get cards by type
export async function getCardsByType(type: Card['type']): Promise<Card[]> {
  return queryByIndex<Card>(STORE_NAME, 'type', type);
}

// Search cards by text (front, back, or tags)
export async function searchCards(query: string): Promise<Card[]> {
  const allCards = await getAllCards();
  const lowerQuery = query.toLowerCase();

  return allCards.filter(card =>
    card.front.toLowerCase().includes(lowerQuery) ||
    card.back.toLowerCase().includes(lowerQuery) ||
    card.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

// Import cards (bulk insert)
export async function importCards(cards: Card[]): Promise<void> {
  await bulkPut(STORE_NAME, cards);
}

// Get learned cards (reps >= 3)
export async function getLearnedCardsCount(): Promise<number> {
  const allCards = await getAllCards();
  return allCards.filter(card => card.reps >= 3).length;
}
