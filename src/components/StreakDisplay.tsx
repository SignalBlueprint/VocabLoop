interface StreakDisplayProps {
  reviewStreak: number;
  verbStreak: number;
  reviewedToday: boolean;
  streakAtRisk: boolean;
  hoursRemaining: number;
  isDark: boolean;
}

export function StreakDisplay({
  reviewStreak,
  verbStreak,
  reviewedToday,
  streakAtRisk,
  hoursRemaining,
  isDark,
}: StreakDisplayProps) {
  const hasAnyStreak = reviewStreak > 0 || verbStreak > 0;

  if (!hasAnyStreak && !streakAtRisk) {
    return null;
  }

  return (
    <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      {/* Streak at risk warning */}
      {streakAtRisk && !reviewedToday && (
        <div className={`mb-3 p-3 rounded-lg ${isDark ? 'bg-orange-900/30' : 'bg-orange-50'} border ${isDark ? 'border-orange-700' : 'border-orange-200'}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">🔥</span>
            <div>
              <p className={`font-medium ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                Streak at risk!
              </p>
              <p className={`text-sm ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                Review now to keep your {reviewStreak} day streak. {hoursRemaining}h left today.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Streak display */}
      <div className="flex justify-center gap-6">
        {/* Review streak */}
        <div className="text-center">
          <div className={`relative inline-flex items-center justify-center w-16 h-16 rounded-full ${
            reviewedToday
              ? 'bg-gradient-to-br from-orange-400 to-red-500'
              : isDark ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <span className={`text-2xl font-bold ${reviewedToday ? 'text-white' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {reviewStreak}
            </span>
            {reviewedToday && (
              <span className="absolute -top-1 -right-1 text-lg" aria-hidden="true">🔥</span>
            )}
          </div>
          <p className={`text-xs mt-1 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Review Streak
          </p>
          {reviewedToday && reviewStreak > 0 && (
            <p className="text-xs text-emerald-500">Done today!</p>
          )}
        </div>

        {/* Verb streak */}
        <div className="text-center">
          <div className={`relative inline-flex items-center justify-center w-16 h-16 rounded-full ${
            verbStreak > 0
              ? 'bg-gradient-to-br from-purple-400 to-purple-600'
              : isDark ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <span className={`text-2xl font-bold ${verbStreak > 0 ? 'text-white' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {verbStreak}
            </span>
            {verbStreak > 0 && (
              <span className="absolute -top-1 -right-1 text-lg" aria-hidden="true">🔤</span>
            )}
          </div>
          <p className={`text-xs mt-1 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Verb Streak
          </p>
        </div>
      </div>

      {/* Motivational message */}
      {reviewStreak >= 7 && (
        <p className={`text-center text-sm mt-3 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
          {reviewStreak >= 30
            ? `Amazing! ${reviewStreak} days of learning!`
            : reviewStreak >= 14
            ? `Great commitment! Keep it up!`
            : `A week strong! You're building a habit!`}
        </p>
      )}
    </div>
  );
}
