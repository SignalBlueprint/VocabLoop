import type { ReviewLog, Grade } from '../types';
import { getAll, put, queryByIndex } from './index';

const STORE_NAME = 'reviews';

// Generate unique ID
function generateId(): string {
  return `review_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create a review log entry
export async function logReview(
  cardId: string,
  grade: Grade,
  previousInterval: number,
  newInterval: number,
  previousDueAt: number,
  newDueAt: number
): Promise<ReviewLog> {
  const log: ReviewLog = {
    id: generateId(),
    cardId,
    reviewedAt: Date.now(),
    grade,
    previousInterval,
    newInterval,
    previousDueAt,
    newDueAt,
  };

  await put(STORE_NAME, log);
  return log;
}

// Get all review logs
export async function getAllReviews(): Promise<ReviewLog[]> {
  return getAll<ReviewLog>(STORE_NAME);
}

// Get reviews for a specific card
export async function getReviewsForCard(cardId: string): Promise<ReviewLog[]> {
  return queryByIndex<ReviewLog>(STORE_NAME, 'cardId', cardId);
}

// Get reviews for today (since midnight local time)
export async function getReviewsToday(): Promise<ReviewLog[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.getTime();

  const allReviews = await getAllReviews();
  return allReviews.filter(review => review.reviewedAt >= startOfDay);
}

// Get count of reviews today
export async function getReviewedTodayCount(): Promise<number> {
  const todayReviews = await getReviewsToday();
  return todayReviews.length;
}

// Get reviews in a date range
export async function getReviewsInRange(startDate: number, endDate: number): Promise<ReviewLog[]> {
  const allReviews = await getAllReviews();
  return allReviews.filter(
    review => review.reviewedAt >= startDate && review.reviewedAt <= endDate
  );
}

// Get unique days with at least one review (for streak calculation)
export async function getReviewDays(): Promise<Set<string>> {
  const allReviews = await getAllReviews();
  const days = new Set<string>();

  for (const review of allReviews) {
    const date = new Date(review.reviewedAt);
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
    days.add(dateString);
  }

  return days;
}
