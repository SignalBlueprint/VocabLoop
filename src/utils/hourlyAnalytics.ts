import type { ReviewLog } from '../types';

/**
 * Statistics for a single hour of the day
 */
export interface HourlyStats {
  hour: number;           // 0-23
  totalReviews: number;   // Total reviews during this hour
  successCount: number;   // Reviews with grade !== 'again'
  successRate: number;    // 0-100 percentage
}

/**
 * Analyze reviews by hour of day.
 * Success is defined as grade !== 'again'.
 *
 * @param reviews - Array of review logs
 * @returns Array of 24 HourlyStats objects (one per hour)
 */
export function analyzeReviewsByHour(reviews: ReviewLog[]): HourlyStats[] {
  // Initialize stats for all 24 hours
  const hourlyData: { total: number; success: number }[] = Array.from(
    { length: 24 },
    () => ({ total: 0, success: 0 })
  );

  // Tally reviews by hour
  for (const review of reviews) {
    const hour = new Date(review.reviewedAt).getHours();
    hourlyData[hour].total++;
    if (review.grade !== 'again') {
      hourlyData[hour].success++;
    }
  }

  // Convert to HourlyStats format
  return hourlyData.map((data, hour) => ({
    hour,
    totalReviews: data.total,
    successCount: data.success,
    successRate: data.total > 0 ? (data.success / data.total) * 100 : 0,
  }));
}

/**
 * Find optimal and worst hours for learning based on success rates.
 * Only considers hours with at least 5 reviews (sufficient data).
 *
 * @param hourlyStats - Array of HourlyStats from analyzeReviewsByHour
 * @returns Object with best 3 and worst 3 hours
 */
export function findOptimalHours(hourlyStats: HourlyStats[]): {
  best: number[];
  worst: number[];
} {
  // Filter to hours with sufficient data (>= 5 reviews)
  const sufficientData = hourlyStats.filter((h) => h.totalReviews >= 5);

  if (sufficientData.length === 0) {
    return { best: [], worst: [] };
  }

  // Sort by success rate
  const sorted = [...sufficientData].sort((a, b) => b.successRate - a.successRate);

  // Get top 3 best and worst
  const best = sorted.slice(0, 3).map((h) => h.hour);
  const worst = sorted.slice(-3).reverse().map((h) => h.hour);

  return { best, worst };
}

/**
 * Format an hour for display (e.g., 8 -> "8am", 14 -> "2pm")
 */
export function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

/**
 * Format an hour range for display (e.g., [8,9,10] -> "8-10am")
 */
function formatHourRange(hours: number[]): string {
  if (hours.length === 0) return '';
  if (hours.length === 1) return formatHour(hours[0]);

  // Sort hours
  const sorted = [...hours].sort((a, b) => a - b);

  // Check if hours are consecutive
  const isConsecutive = sorted.every(
    (h, i) => i === 0 || h === sorted[i - 1] + 1 || (sorted[i - 1] === 23 && h === 0)
  );

  if (isConsecutive) {
    const start = formatHour(sorted[0]);
    const end = formatHour((sorted[sorted.length - 1] + 1) % 24);
    return `${start}-${end}`;
  }

  // Not consecutive, list individually
  return sorted.map(formatHour).join(', ');
}

/**
 * Generate actionable insight message based on hourly performance.
 *
 * @param hourlyStats - Array of HourlyStats from analyzeReviewsByHour
 * @returns Actionable insight string, or empty string if insufficient data
 */
export function generateInsightMessage(hourlyStats: HourlyStats[]): string {
  const { best, worst } = findOptimalHours(hourlyStats);

  if (best.length === 0 || worst.length === 0) {
    return '';
  }

  // Calculate average success rates for best and worst periods
  const bestStats = hourlyStats.filter((h) => best.includes(h.hour));
  const worstStats = hourlyStats.filter((h) => worst.includes(h.hour));

  const bestAvg =
    bestStats.reduce((sum, h) => sum + h.successRate, 0) / bestStats.length;
  const worstAvg =
    worstStats.reduce((sum, h) => sum + h.successRate, 0) / worstStats.length;

  const difference = Math.round(bestAvg - worstAvg);

  if (difference < 5) {
    return 'Your performance is consistent throughout the day. Great job!';
  }

  // Determine time-of-day descriptions
  const getBestPeriod = (): string => {
    const avgHour = best.reduce((sum, h) => sum + h, 0) / best.length;
    if (avgHour < 6) return 'early mornings';
    if (avgHour < 12) return 'mornings';
    if (avgHour < 17) return 'afternoons';
    if (avgHour < 21) return 'evenings';
    return 'late nights';
  };

  const getWorstPeriod = (): string => {
    const avgHour = worst.reduce((sum, h) => sum + h, 0) / worst.length;
    if (avgHour < 6) return 'early mornings';
    if (avgHour < 12) return 'mornings';
    if (avgHour < 17) return 'afternoons';
    if (avgHour < 21) return 'evenings';
    return 'late nights';
  };

  const bestPeriod = getBestPeriod();
  const worstPeriod = getWorstPeriod();

  const bestRange = formatHourRange(best);
  const worstRange = formatHourRange(worst);

  return `You perform ${difference}% better in ${bestPeriod} (${bestRange}) than ${worstPeriod} (${worstRange}). Consider shifting reviews to your peak hours.`;
}

/**
 * Check if there's sufficient data for meaningful insights.
 *
 * @param reviews - Array of review logs
 * @returns true if >= 50 reviews
 */
export function hasSufficientData(reviews: ReviewLog[]): boolean {
  return reviews.length >= 50;
}

/**
 * Get color class for a success rate (for heatmap coloring).
 * Returns a Tailwind color class.
 *
 * @param successRate - Success rate 0-100
 * @param totalReviews - Number of reviews for this hour
 * @returns Tailwind background color class
 */
export function getHeatmapColor(
  successRate: number,
  totalReviews: number
): { bg: string; bgDark: string } {
  // Gray for insufficient data
  if (totalReviews < 5) {
    return { bg: 'bg-gray-200', bgDark: 'bg-gray-700' };
  }

  // Color scale from red (bad) to green (good)
  if (successRate < 50) {
    return { bg: 'bg-red-400', bgDark: 'bg-red-600' };
  }
  if (successRate < 60) {
    return { bg: 'bg-red-300', bgDark: 'bg-red-500' };
  }
  if (successRate < 70) {
    return { bg: 'bg-orange-300', bgDark: 'bg-orange-500' };
  }
  if (successRate < 80) {
    return { bg: 'bg-yellow-300', bgDark: 'bg-yellow-500' };
  }
  if (successRate < 90) {
    return { bg: 'bg-lime-300', bgDark: 'bg-lime-500' };
  }
  return { bg: 'bg-green-400', bgDark: 'bg-green-500' };
}
