import type { ReviewLog } from '../types';

/**
 * Data point for retention curve charting
 */
export interface RetentionDataPoint {
  day: number;           // Days since card creation
  retention: number;     // Retention percentage (0-100)
  isReview: boolean;     // True if a review happened on this day
  grade?: 'again' | 'hard' | 'good' | 'easy'; // Grade if review happened
}

/**
 * Calculate retention at a given time since last review using SM-2 retention formula.
 *
 * Formula: R = e^(-t/S) where:
 * - R = retention (0-1)
 * - t = time since review (days)
 * - S = stability (approximately equal to interval for SM-2)
 *
 * @param intervalDays - The scheduled interval (stability proxy)
 * @param daysSinceReview - Days elapsed since the last review
 * @returns Retention as percentage (0-100)
 */
export function calculateRetention(intervalDays: number, daysSinceReview: number): number {
  // Handle edge cases
  if (intervalDays <= 0) {
    intervalDays = 1; // Minimum stability of 1 day
  }
  if (daysSinceReview < 0) {
    daysSinceReview = 0;
  }

  // Stability is derived from interval - longer intervals indicate stronger memory
  const stability = intervalDays;

  // Exponential decay: R = e^(-t/S)
  const retention = Math.exp(-daysSinceReview / stability);

  // Convert to percentage and clamp between 0-100
  return Math.max(0, Math.min(100, retention * 100));
}

/**
 * Generate retention curve data points from review history.
 * Creates points showing retention decay over time with review events marked.
 *
 * @param reviews - Array of review logs for this card, sorted by reviewedAt
 * @param createdAt - Card creation timestamp (ms)
 * @param currentTime - Current timestamp for projection (defaults to now)
 * @returns Array of data points for charting
 */
export function generateRetentionCurve(
  reviews: ReviewLog[],
  createdAt: number,
  currentTime: number = Date.now()
): RetentionDataPoint[] {
  const dataPoints: RetentionDataPoint[] = [];
  const msPerDay = 24 * 60 * 60 * 1000;

  // Sort reviews by time (earliest first)
  const sortedReviews = [...reviews].sort((a, b) => a.reviewedAt - b.reviewedAt);

  // Calculate total days from creation to now
  const totalDays = Math.ceil((currentTime - createdAt) / msPerDay);

  // If no reviews, show decay from initial 100% retention
  if (sortedReviews.length === 0) {
    // Initial interval is 1 day for new cards
    const initialInterval = 1;

    for (let day = 0; day <= Math.min(totalDays, 30); day++) {
      dataPoints.push({
        day,
        retention: calculateRetention(initialInterval, day),
        isReview: false,
      });
    }
    return dataPoints;
  }

  // Build curve with reviews
  let currentInterval = 1; // Start with 1-day interval
  let lastReviewDay = 0;
  let reviewIndex = 0;

  // Add initial point at day 0 (card created)
  dataPoints.push({
    day: 0,
    retention: 100, // Fresh card starts at 100%
    isReview: false,
  });

  // Iterate through each day
  for (let day = 1; day <= totalDays; day++) {
    const dayStart = createdAt + (day * msPerDay);
    const dayEnd = dayStart + msPerDay;

    // Check if any reviews happened on this day
    let reviewOnThisDay: ReviewLog | null = null;
    while (reviewIndex < sortedReviews.length && sortedReviews[reviewIndex].reviewedAt < dayEnd) {
      if (sortedReviews[reviewIndex].reviewedAt >= dayStart) {
        reviewOnThisDay = sortedReviews[reviewIndex];
      }
      reviewIndex++;
    }

    if (reviewOnThisDay) {
      // Review happened - retention spikes back up
      // After review, retention goes back to ~100% (or 90% for 'again')
      let retentionAfterReview = 100;
      if (reviewOnThisDay.grade === 'again') {
        retentionAfterReview = 90; // Failed cards don't fully reset
      } else if (reviewOnThisDay.grade === 'hard') {
        retentionAfterReview = 95;
      }

      dataPoints.push({
        day,
        retention: retentionAfterReview,
        isReview: true,
        grade: reviewOnThisDay.grade,
      });

      // Update tracking for next decay period
      currentInterval = reviewOnThisDay.newInterval;
      lastReviewDay = day;
    } else {
      // No review - calculate decay from last review
      const daysSinceLastReview = day - lastReviewDay;
      const retention = calculateRetention(currentInterval, daysSinceLastReview);

      dataPoints.push({
        day,
        retention,
        isReview: false,
      });
    }
  }

  return dataPoints;
}

/**
 * Generate projected future retention points.
 * Shows what retention will look like if no review happens.
 *
 * @param currentRetention - Current retention percentage
 * @param currentInterval - Current scheduled interval
 * @param projectionDays - How many days to project forward
 * @returns Array of projected data points
 */
export function generateProjection(
  currentRetention: number,
  currentInterval: number,
  projectionDays: number = 14
): RetentionDataPoint[] {
  const projectedPoints: RetentionDataPoint[] = [];

  // Find how many days into the current interval we already are
  // based on current retention level
  // R = e^(-t/S) => t = -S * ln(R/100)
  const daysSinceReview = currentRetention >= 100
    ? 0
    : Math.max(0, -currentInterval * Math.log(currentRetention / 100));

  for (let day = 0; day <= projectionDays; day++) {
    const totalDaysSinceReview = daysSinceReview + day;
    const retention = calculateRetention(currentInterval, totalDaysSinceReview);

    projectedPoints.push({
      day,
      retention,
      isReview: false,
    });
  }

  return projectedPoints;
}

/**
 * Get current retention for a card based on its last review.
 *
 * @param intervalDays - Card's current interval
 * @param lastReviewedAt - Timestamp of last review (ms)
 * @param currentTime - Current time (defaults to now)
 * @returns Current retention percentage
 */
export function getCurrentRetention(
  intervalDays: number,
  lastReviewedAt: number | undefined,
  currentTime: number = Date.now()
): number {
  if (!lastReviewedAt) {
    // Never reviewed - assume 100% if just created, decaying otherwise
    return 100;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceReview = (currentTime - lastReviewedAt) / msPerDay;

  return calculateRetention(intervalDays, daysSinceReview);
}
