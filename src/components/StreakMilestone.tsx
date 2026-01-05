import { useState, useEffect } from 'react';
import { Confetti, CelebrationModal } from './Confetti';
import {
  getUnclaimedMilestone,
  claimMilestone,
  getNextMilestone,
  getMilestoneProgress,
  getAllMilestonesWithStatus,
  type StreakMilestone as MilestoneType,
} from '../utils/streakMilestones';

interface StreakMilestoneCelebrationProps {
  currentStreak: number;
  isDark: boolean;
  showToast: (message: string) => void;
}

export function StreakMilestoneCelebration({ currentStreak, isDark, showToast }: StreakMilestoneCelebrationProps) {
  const [milestone, setMilestone] = useState<MilestoneType | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Check for unclaimed milestones when streak changes
    const unclaimed = getUnclaimedMilestone(currentStreak);
    if (unclaimed) {
      setMilestone(unclaimed);
      setShowCelebration(true);
      setShowConfetti(true);
    }
  }, [currentStreak]);

  const handleClaim = () => {
    if (!milestone) return;

    const result = claimMilestone(milestone.days);
    if (result) {
      showToast(`+${result.xpAwarded} XP for ${milestone.days}-day streak!`);
    }

    setShowCelebration(false);
    setMilestone(null);
  };

  if (!showCelebration || !milestone) return null;

  return (
    <>
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      <CelebrationModal
        title={milestone.title}
        message={`${milestone.message}\n\n+${milestone.xpReward} XP Bonus!`}
        icon={milestone.icon}
        onClose={handleClaim}
        isDark={isDark}
      />
    </>
  );
}

interface StreakProgressProps {
  currentStreak: number;
  isDark: boolean;
}

export function StreakProgress({ currentStreak, isDark }: StreakProgressProps) {
  const progress = getMilestoneProgress(currentStreak);
  const next = getNextMilestone(currentStreak);

  if (!progress || !next) return null;

  return (
    <div className={`mt-2 p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Next milestone
        </span>
        <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {next.icon} {next.days} days
        </span>
      </div>
      <div className={`h-2 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
        <div
          className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      <p className={`text-xs mt-1 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {next.days - currentStreak} days to go
      </p>
    </div>
  );
}

interface StreakMilestonesListProps {
  currentStreak: number;
  isDark: boolean;
  onClose: () => void;
}

export function StreakMilestonesList({ currentStreak, isDark, onClose }: StreakMilestonesListProps) {
  const milestones = getAllMilestonesWithStatus(currentStreak);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`rounded-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <h2 className="text-lg font-semibold">Streak Milestones</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Current streak: {currentStreak} days
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <div
                key={milestone.days}
                className={`p-4 rounded-lg border ${
                  milestone.status === 'claimed'
                    ? isDark
                      ? 'bg-emerald-900/20 border-emerald-700/50'
                      : 'bg-emerald-50 border-emerald-200'
                    : milestone.status === 'available'
                    ? isDark
                      ? 'bg-amber-900/20 border-amber-700/50'
                      : 'bg-amber-50 border-amber-200'
                    : isDark
                    ? 'bg-gray-700/50 border-gray-600 opacity-50'
                    : 'bg-gray-50 border-gray-200 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{milestone.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        {milestone.title}
                      </h3>
                      <span className={`text-sm font-medium ${
                        milestone.status === 'claimed'
                          ? 'text-emerald-500'
                          : milestone.status === 'available'
                          ? 'text-amber-500'
                          : isDark ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {milestone.days} days
                      </span>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {milestone.message}
                    </p>
                    <p className={`text-xs mt-1 ${
                      milestone.status === 'claimed'
                        ? 'text-emerald-500'
                        : isDark ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {milestone.status === 'claimed' ? '✓ Claimed' : `+${milestone.xpReward} XP`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
