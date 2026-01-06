import type { ReviewLog } from '../types';
import {
  analyzeReviewsByHour,
  generateInsightMessage,
  hasSufficientData,
} from '../utils/hourlyAnalytics';
import { HourlyHeatmap } from './HourlyHeatmap';

interface WeakestHourInsightProps {
  reviews: ReviewLog[];
  isDark: boolean;
}

export function WeakestHourInsight({ reviews, isDark }: WeakestHourInsightProps) {
  // Check if we have enough data
  if (!hasSufficientData(reviews)) {
    return (
      <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <h3 className={`font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Your Learning Rhythm
        </h3>
        <div className={`text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <p className="text-3xl mb-2">📊</p>
          <p>Not enough data yet</p>
          <p className="text-sm mt-1">
            Complete at least 50 reviews to see your optimal study times.
          </p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {reviews.length} / 50 reviews
          </p>
        </div>
      </div>
    );
  }

  // Analyze reviews by hour
  const hourlyStats = analyzeReviewsByHour(reviews);
  const insightMessage = generateInsightMessage(hourlyStats);

  return (
    <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <h3 className={`font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
        Your Learning Rhythm
      </h3>

      {/* Heatmap */}
      <HourlyHeatmap hourlyStats={hourlyStats} isDark={isDark} />

      {/* Insight message */}
      {insightMessage && (
        <p className={`mt-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          💡 {insightMessage}
        </p>
      )}
    </div>
  );
}
