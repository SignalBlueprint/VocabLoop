import { calculateSessionStats } from '../utils/curriculum';

interface SmartSessionSummaryProps {
  stats: ReturnType<typeof calculateSessionStats>;
  insights: string[];
  tagPerformance: Array<{ tag: string; reviewed: number; successRate: number }>;
  startTime: number;
  endTime: number;
  xpEarned: number;
  isDark: boolean;
  onClose: () => void;
}

export function SmartSessionSummary({
  stats,
  insights,
  tagPerformance,
  startTime,
  endTime,
  xpEarned,
  isDark,
  onClose,
}: SmartSessionSummaryProps) {
  const duration = Math.round((endTime - startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  // Determine overall performance level
  const getPerformanceEmoji = () => {
    if (stats.successRate >= 90) return '🌟';
    if (stats.successRate >= 70) return '👍';
    if (stats.successRate >= 50) return '💪';
    return '📚';
  };

  const getPerformanceText = () => {
    if (stats.successRate >= 90) return 'Excellent!';
    if (stats.successRate >= 70) return 'Great job!';
    if (stats.successRate >= 50) return 'Keep practicing!';
    return 'Room to grow!';
  };

  return (
    <div className={`rounded-xl shadow-sm p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-5xl mb-2">{getPerformanceEmoji()}</p>
        <h2 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          {getPerformanceText()}
        </h2>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Smart Session Complete
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className={`text-3xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {stats.totalReviewed}
          </p>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Cards</p>
        </div>
        <div className="text-center">
          <p className={`text-3xl font-bold ${
            stats.successRate >= 70
              ? isDark ? 'text-emerald-400' : 'text-emerald-600'
              : isDark ? 'text-amber-400' : 'text-amber-600'
          }`}>
            {stats.successRate}%
          </p>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Success</p>
        </div>
        <div className="text-center">
          <p className={`text-3xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            +{xpEarned}
          </p>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>XP</p>
        </div>
      </div>

      {/* Time and Speed */}
      <div className={`rounded-lg p-3 mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <div className="flex justify-between items-center">
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Duration</span>
          <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            {minutes > 0 ? `${minutes}m ` : ''}{seconds}s
          </span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Avg. Response</span>
          <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            {(stats.avgTimeMs / 1000).toFixed(1)}s
          </span>
        </div>
        {stats.recoveryCardsUsed > 0 && (
          <div className="flex justify-between items-center mt-2">
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Confidence Boosts</span>
            <span className={`font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              {stats.recoveryCardsUsed}
            </span>
          </div>
        )}
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mb-4">
          <h3 className={`font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            Insights
          </h3>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 text-sm ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}`}
              >
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tag Performance */}
      {tagPerformance.length > 0 && (
        <div className="mb-6">
          <h3 className={`font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            Performance by Tag
          </h3>
          <div className="space-y-2">
            {tagPerformance.slice(0, 5).map((tag) => (
              <div
                key={tag.tag}
                className={`flex items-center justify-between rounded-lg p-2 ${
                  isDark ? 'bg-gray-700' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    tag.successRate >= 70
                      ? isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                      : isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {tag.tag}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {tag.reviewed} cards
                  </span>
                </div>
                <span className={`font-medium text-sm ${
                  tag.successRate >= 70
                    ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                    : isDark ? 'text-amber-400' : 'text-amber-600'
                }`}>
                  {tag.successRate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={onClose}
        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors"
      >
        Return Home
      </button>
    </div>
  );
}
