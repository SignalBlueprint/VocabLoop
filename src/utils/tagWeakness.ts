import type { ReviewResult } from '../types';

const STORAGE_KEY = 'vocabloop_tag_weakness';
const ROLLING_DAYS = 7;

/**
 * Daily stats for a single tag
 */
interface DailyStats {
  date: string; // YYYY-MM-DD
  reviews: number;
  successes: number;
}

/**
 * Tag weakness record with rolling stats
 */
export interface TagWeaknessRecord {
  tag: string;
  dailyStats: DailyStats[];
  rollingSuccessRate: number;
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * All tag weakness data
 */
interface TagWeaknessData {
  [tag: string]: TagWeaknessRecord;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get date N days ago in YYYY-MM-DD format
 */
function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/**
 * Load tag weakness data from localStorage
 */
function loadTagWeaknessData(): TagWeaknessData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Save tag weakness data to localStorage
 */
function saveTagWeaknessData(data: TagWeaknessData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save tag weakness data:', error);
  }
}

/**
 * Calculate rolling success rate from daily stats
 */
function calculateRollingSuccessRate(dailyStats: DailyStats[]): number {
  if (dailyStats.length === 0) return 0;

  const cutoffDate = getDateDaysAgo(ROLLING_DAYS);
  const recentStats = dailyStats.filter((s) => s.date >= cutoffDate);

  const totalReviews = recentStats.reduce((sum, s) => sum + s.reviews, 0);
  const totalSuccesses = recentStats.reduce((sum, s) => sum + s.successes, 0);

  if (totalReviews === 0) return 0;
  return Math.round((totalSuccesses / totalReviews) * 100);
}

/**
 * Calculate trend based on comparing recent vs older stats
 */
function calculateTrend(dailyStats: DailyStats[]): 'improving' | 'stable' | 'declining' {
  if (dailyStats.length < 4) return 'stable';

  const midpoint = Math.floor(dailyStats.length / 2);
  const recentStats = dailyStats.slice(midpoint);
  const olderStats = dailyStats.slice(0, midpoint);

  const recentRate = calculateRollingSuccessRate(recentStats);
  const olderRate = calculateRollingSuccessRate(olderStats);

  const diff = recentRate - olderRate;

  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

/**
 * Clean up old stats beyond the rolling window
 */
function cleanupOldStats(dailyStats: DailyStats[]): DailyStats[] {
  const cutoffDate = getDateDaysAgo(ROLLING_DAYS * 2); // Keep 2x window for trend analysis
  return dailyStats.filter((s) => s.date >= cutoffDate);
}

/**
 * Update tag weakness tracking after a review.
 *
 * @param tag - The tag to update
 * @param result - The review result
 */
export function updateTagWeakness(tag: string, result: ReviewResult): void {
  const data = loadTagWeaknessData();
  const today = getTodayDate();
  const isSuccess = result.grade !== 'again';

  // Initialize tag record if not exists
  if (!data[tag]) {
    data[tag] = {
      tag,
      dailyStats: [],
      rollingSuccessRate: 0,
      trend: 'stable',
    };
  }

  const record = data[tag];

  // Find or create today's stats
  let todayStats = record.dailyStats.find((s) => s.date === today);
  if (!todayStats) {
    todayStats = { date: today, reviews: 0, successes: 0 };
    record.dailyStats.push(todayStats);
  }

  // Update stats
  todayStats.reviews++;
  if (isSuccess) {
    todayStats.successes++;
  }

  // Sort by date (newest first)
  record.dailyStats.sort((a, b) => b.date.localeCompare(a.date));

  // Cleanup old stats
  record.dailyStats = cleanupOldStats(record.dailyStats);

  // Recalculate rolling success rate and trend
  record.rollingSuccessRate = calculateRollingSuccessRate(record.dailyStats);
  record.trend = calculateTrend(record.dailyStats);

  // Save
  saveTagWeaknessData(data);
}

/**
 * Update tag weakness for multiple tags at once.
 *
 * @param tags - Array of tags to update
 * @param result - The review result
 */
export function updateTagWeaknessMultiple(tags: string[], result: ReviewResult): void {
  for (const tag of tags) {
    updateTagWeakness(tag, result);
  }
}

/**
 * Get the weakest tags based on rolling success rate.
 *
 * @param count - Number of tags to return
 * @returns Array of tag names sorted by lowest success rate
 */
export function getWeakestTags(count: number): string[] {
  const data = loadTagWeaknessData();
  const records = Object.values(data);

  // Filter to tags with enough data (at least 5 reviews in rolling period)
  const cutoffDate = getDateDaysAgo(ROLLING_DAYS);
  const validRecords = records.filter((record) => {
    const recentStats = record.dailyStats.filter((s) => s.date >= cutoffDate);
    const totalReviews = recentStats.reduce((sum, s) => sum + s.reviews, 0);
    return totalReviews >= 5;
  });

  // Sort by success rate (lowest first)
  validRecords.sort((a, b) => a.rollingSuccessRate - b.rollingSuccessRate);

  return validRecords.slice(0, count).map((r) => r.tag);
}

/**
 * Get all tag weakness records.
 *
 * @returns Object with all tag weakness records
 */
export function getAllTagWeakness(): TagWeaknessData {
  return loadTagWeaknessData();
}

/**
 * Get tag weakness record for a specific tag.
 *
 * @param tag - Tag to lookup
 * @returns TagWeaknessRecord or null if not found
 */
export function getTagWeakness(tag: string): TagWeaknessRecord | null {
  const data = loadTagWeaknessData();
  return data[tag] || null;
}

/**
 * Get tags that are improving (success rate trending up).
 *
 * @returns Array of tag names that are improving
 */
export function getImprovingTags(): string[] {
  const data = loadTagWeaknessData();
  return Object.values(data)
    .filter((r) => r.trend === 'improving')
    .map((r) => r.tag);
}

/**
 * Get tags that are declining (success rate trending down).
 *
 * @returns Array of tag names that are declining
 */
export function getDecliningTags(): string[] {
  const data = loadTagWeaknessData();
  return Object.values(data)
    .filter((r) => r.trend === 'declining')
    .map((r) => r.tag);
}

/**
 * Clear all tag weakness data.
 */
export function clearTagWeaknessData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
