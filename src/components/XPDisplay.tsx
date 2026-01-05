import { useState, useEffect } from 'react';
import { getTotalXP, getCurrentLevel, getLevelProgress, getXPToNextLevel, formatXP, getAllLevels } from '../utils/xp';

interface XPDisplayProps {
  isDark: boolean;
  compact?: boolean;
}

export function XPDisplay({ isDark, compact = false }: XPDisplayProps) {
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(getCurrentLevel());
  const [progress, setProgress] = useState(0);
  const [xpToNext, setXPToNext] = useState(0);
  const [showLevels, setShowLevels] = useState(false);

  useEffect(() => {
    refreshStats();

    // Refresh periodically to catch XP updates
    const interval = setInterval(refreshStats, 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshStats = () => {
    setXP(getTotalXP());
    setLevel(getCurrentLevel());
    setProgress(getLevelProgress());
    setXPToNext(getXPToNextLevel());
  };

  if (compact) {
    return (
      <button
        onClick={() => setShowLevels(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isDark
            ? 'bg-gray-700/50 hover:bg-gray-700'
            : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        <span className="text-lg">⭐</span>
        <div className="text-left">
          <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Lvl {level.level}
          </p>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {formatXP(xp)} XP
          </p>
        </div>
      </button>
    );
  }

  return (
    <>
      <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            <div>
              <p className="font-medium">{level.title}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Level {level.level}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold text-amber-500`}>{formatXP(xp)} XP</p>
            {xpToNext > 0 && (
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {formatXP(xpToNext)} to next level
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className={`text-xs text-center mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {progress}% to Level {level.level + 1}
        </p>

        {/* View all levels button */}
        <button
          onClick={() => setShowLevels(true)}
          className={`w-full mt-3 text-xs text-center ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
        >
          View all levels →
        </button>
      </div>

      {/* Levels modal */}
      {showLevels && (
        <LevelsModal
          isDark={isDark}
          currentLevel={level.level}
          currentXP={xp}
          onClose={() => setShowLevels(false)}
        />
      )}
    </>
  );
}

interface LevelsModalProps {
  isDark: boolean;
  currentLevel: number;
  currentXP: number;
  onClose: () => void;
}

function LevelsModal({ isDark, currentLevel, currentXP, onClose }: LevelsModalProps) {
  const levels = getAllLevels();

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`rounded-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="text-lg font-semibold">Level Progress</h2>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {levels.map((level) => {
              const isUnlocked = currentXP >= level.minXP;
              const isCurrent = level.level === currentLevel;

              return (
                <div
                  key={level.level}
                  className={`p-3 rounded-lg flex items-center gap-3 ${
                    isCurrent
                      ? 'bg-amber-500/20 border-2 border-amber-500'
                      : isUnlocked
                      ? isDark ? 'bg-gray-700' : 'bg-gray-100'
                      : isDark ? 'bg-gray-700/50 opacity-50' : 'bg-gray-50 opacity-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    isUnlocked ? 'bg-amber-500 text-white' : isDark ? 'bg-gray-600' : 'bg-gray-300'
                  }`}>
                    {isUnlocked ? '⭐' : '🔒'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${isCurrent ? 'text-amber-500' : ''}`}>
                        Level {level.level}: {level.title}
                      </p>
                      {isCurrent && (
                        <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatXP(level.minXP)} XP
                      {level.maxXP !== Infinity && ` - ${formatXP(level.maxXP)} XP`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`p-4 border-t text-center ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Earn XP by reviewing cards and maintaining streaks!
          </p>
        </div>
      </div>
    </div>
  );
}
