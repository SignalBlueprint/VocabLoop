import type { Card, ReviewLog } from '../types';
import { importCards, getAllCards } from '../db/cards';
import { bulkPut, clearStore } from '../db';

interface ImportResult {
  cardsImported: number;
  cardsSkipped: number;
  reviewsImported: number;
}

/**
 * Import cards with merge mode (skip duplicates based on front/back match).
 */
export async function importMerge(
  cards: Card[],
  reviews: ReviewLog[]
): Promise<ImportResult> {
  const existingCards = await getAllCards();
  const existingFronts = new Set(existingCards.map(c => `${c.front}|${c.back}`));

  const newCards = cards.filter(card => {
    const key = `${card.front}|${card.back}`;
    return !existingFronts.has(key);
  });

  if (newCards.length > 0) {
    await importCards(newCards);
  }

  // Import reviews for new cards
  const newCardIds = new Set(newCards.map(c => c.id));
  const newReviews = reviews.filter(r => newCardIds.has(r.cardId));

  if (newReviews.length > 0) {
    await bulkPut('reviews', newReviews);
  }

  return {
    cardsImported: newCards.length,
    cardsSkipped: cards.length - newCards.length,
    reviewsImported: newReviews.length,
  };
}

/**
 * Import cards with replace mode (clear existing data first).
 */
export async function importReplace(
  cards: Card[],
  reviews: ReviewLog[]
): Promise<ImportResult> {
  // Clear existing data
  await clearStore('cards');
  await clearStore('reviews');

  // Import all cards and reviews
  if (cards.length > 0) {
    await importCards(cards);
  }

  if (reviews.length > 0) {
    await bulkPut('reviews', reviews);
  }

  return {
    cardsImported: cards.length,
    cardsSkipped: 0,
    reviewsImported: reviews.length,
  };
}
