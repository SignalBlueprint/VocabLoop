import { useState, useEffect } from 'react';
import {
  getWeeklyChallenges,
  getDaysRemainingInWeek,
  claimChallengeXP,
  type Challenge,
} from '../utils/challenges';
import { addXP } from '../utils/xp';

interface ChallengeProgress {
  id: string;
  current: number;
  completed: boolean;
  claimedXP: boolean;
}

interface WeeklyChallengesProps {
  isDark: boolean;
  showToast: (message: string) => void;
}

export function WeeklyChallenges({ isDark, showToast }: WeeklyChallengesProps) {
  const [challenges, setChallenges] = useState<{ challenge: Challenge; progress: ChallengeProgress }[]>([]);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = () => {
    setChallenges(getWeeklyChallenges());
    setDaysRemaining(getDaysRemainingInWeek());
  };

  const handleClaimReward = (challengeId: string) => {
    const xpEarned = claimChallengeXP(challengeId);
    if (xpEarned > 0) {
      addXP(xpEarned);
      showToast(`Earned ${xpEarned} XP!`);
      loadChallenges();
    }
  };

  const completedCount = challenges.filter(c => c.progress.completed).length;
  const unclaimedCount = challenges.filter(c => c.progress.completed && !c.progress.claimedXP).length;

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`w-full rounded-xl p-4 flex items-center justify-between transition-colors ${
          isDark
            ? 'bg-gray-800 hover:bg-gray-700'
            : 'bg-white hover:bg-gray-50 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="font-medium">Weekly Challenges</p>
              {unclaimedCount > 0 && (
                <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                  {unclaimedCount} reward{unclaimedCount > 1 ? 's' : ''}!
                </span>
              )}
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {completedCount}/3 completed • {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
            </p>
          </div>
        </div>
        <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>→</span>
      </button>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      {/* Header */}
      <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <h3 className="font-medium">Weekly Challenges</h3>
          </div>
          <button
            onClick={() => setExpanded(false)}
            className={`text-sm ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Collapse
          </button>
        </div>
        <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
        </p>
      </div>

      {/* Challenges list */}
      <div className="p-4 space-y-3">
        {challenges.map(({ challenge, progress }) => {
          const progressPercent = Math.min((progress.current / challenge.target) * 100, 100);

          return (
            <div
              key={challenge.id}
              className={`p-3 rounded-lg ${
                progress.completed
                  ? progress.claimedXP
                    ? isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'
                    : isDark ? 'bg-amber-900/30' : 'bg-amber-50'
                  : isDark ? 'bg-gray-700' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{challenge.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`font-medium ${progress.completed && progress.claimedXP ? 'line-through opacity-60' : ''}`}>
                      {challenge.title}
                    </p>
                    {progress.completed && !progress.claimedXP ? (
                      <button
                        onClick={() => handleClaimReward(challenge.id)}
                        className="text-xs bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600 transition-colors"
                      >
                        Claim +{challenge.xpReward} XP
                      </button>
                    ) : progress.claimedXP ? (
                      <span className="text-xs text-emerald-500">✓ Claimed</span>
                    ) : (
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        +{challenge.xpReward} XP
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {challenge.description}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                        {progress.current} / {challenge.target}
                      </span>
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                        {Math.round(progressPercent)}%
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
                      <div
                        className={`h-full rounded-full transition-all ${
                          progress.completed
                            ? 'bg-emerald-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`p-3 border-t text-center ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          New challenges every Sunday
        </p>
      </div>
    </div>
  );
}
