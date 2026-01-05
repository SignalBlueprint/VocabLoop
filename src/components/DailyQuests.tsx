import { useState, useEffect } from 'react';
import {
  getDailyQuests,
  claimQuestReward,
  getTimeUntilReset,
  type Quest,
  type QuestProgress,
} from '../utils/dailyQuests';

interface DailyQuestsProps {
  isDark: boolean;
  showToast: (message: string) => void;
}

export function DailyQuests({ isDark, showToast }: DailyQuestsProps) {
  const [quests, setQuests] = useState<Array<{ quest: Quest; progress: QuestProgress }>>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [resetTime, setResetTime] = useState({ hours: 0, minutes: 0 });

  useEffect(() => {
    loadQuests();
    updateResetTime();

    // Update reset time every minute
    const interval = setInterval(updateResetTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadQuests = () => {
    setQuests(getDailyQuests());
  };

  const updateResetTime = () => {
    setResetTime(getTimeUntilReset());
  };

  const handleClaim = (questId: string) => {
    const xp = claimQuestReward(questId);
    if (xp > 0) {
      showToast(`+${xp} XP claimed!`);
      loadQuests();
    }
  };

  const claimedCount = quests.filter(q => q.progress.claimed).length;

  return (
    <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            Daily Quests
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            claimedCount === 3
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : isDark
              ? 'bg-gray-700 text-gray-400'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {claimedCount}/3
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Resets in {resetTime.hours}h {resetTime.minutes}m
          </span>
          <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Quest List */}
      {isExpanded && (
        <div className="mt-4 space-y-3">
          {quests.map(({ quest, progress }) => {
            const isComplete = progress.current >= quest.target;
            const isClaimed = progress.claimed;
            const percentage = Math.min((progress.current / quest.target) * 100, 100);

            return (
              <div
                key={quest.id}
                className={`p-3 rounded-lg border ${
                  isClaimed
                    ? isDark
                      ? 'bg-emerald-900/20 border-emerald-700/30'
                      : 'bg-emerald-50 border-emerald-200'
                    : isComplete
                    ? isDark
                      ? 'bg-amber-900/20 border-amber-700/30'
                      : 'bg-amber-50 border-amber-200'
                    : isDark
                    ? 'bg-gray-700/50 border-gray-600'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{quest.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-medium text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        {quest.title}
                      </h4>
                      {!isClaimed && (
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          +{quest.xpReward} XP
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {quest.description}
                    </p>

                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {progress.current}/{quest.target}
                        </span>
                        {isClaimed && (
                          <span className="text-xs text-emerald-500">Claimed</span>
                        )}
                      </div>
                      <div className={`h-1.5 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            isClaimed
                              ? 'bg-emerald-500'
                              : isComplete
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Claim button */}
                  {isComplete && !isClaimed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClaim(quest.id);
                      }}
                      className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      Claim
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* All complete message */}
          {claimedCount === 3 && (
            <div className={`text-center py-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <p className="text-sm">All quests complete! Come back tomorrow for more.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
