import { useState, useEffect } from 'react';
import {
  getAchievementsByCategory,
  getAchievementStats,
  getTierInfo,
  getCategoryInfo,
  markAllAchievementsSeen,
  getUnseenAchievements,
  type Achievement,
  type AchievementCategory,
  type AchievementTier,
} from '../utils/achievements';
import { playStreakSound } from '../utils/sounds';

interface AchievementsProps {
  isDark: boolean;
  compact?: boolean;
  onOpenFull?: () => void;
}

export function Achievements({ isDark, compact = false, onOpenFull }: AchievementsProps) {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [achievements, setAchievements] = useState<Record<AchievementCategory, (Achievement & { unlocked: boolean })[]> | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof getAchievementStats> | null>(null);

  useEffect(() => {
    setAchievements(getAchievementsByCategory());
    setStats(getAchievementStats());
  }, []);

  if (!achievements || !stats) {
    return null;
  }

  const categories: AchievementCategory[] = ['streak', 'cards', 'reviews', 'mastery', 'games', 'special'];
  const tierOrder: AchievementTier[] = ['bronze', 'silver', 'gold', 'platinum'];

  // Compact view for home/stats page
  if (compact) {
    const recentUnlocked = Object.values(achievements)
      .flat()
      .filter(a => a.unlocked)
      .slice(0, 6);

    return (
      <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            Achievements
          </h3>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {stats.unlocked}/{stats.total} ({stats.percentage}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className={`h-2 rounded-full mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>

        {/* Tier counts */}
        <div className="flex gap-2 mb-3">
          {tierOrder.map(tier => {
            const tierInfo = getTierInfo(tier);
            const tierStats = stats.byTier[tier];
            if (tierStats.unlocked === 0) return null;
            return (
              <div
                key={tier}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${isDark ? tierInfo.bgDark : tierInfo.bgLight}`}
              >
                <span className={tierInfo.color}>{tierStats.unlocked}</span>
                <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{tierInfo.label}</span>
              </div>
            );
          })}
        </div>

        {/* Recent unlocked */}
        {recentUnlocked.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {recentUnlocked.map(achievement => (
              <AchievementBadge
                key={achievement.id}
                achievement={achievement}
                unlocked
                isDark={isDark}
                size="small"
              />
            ))}
          </div>
        )}

        {/* View all button */}
        {onOpenFull && (
          <button
            onClick={onOpenFull}
            className={`w-full text-center text-sm py-2 rounded-lg transition-colors ${
              isDark
                ? 'text-emerald-400 hover:bg-gray-700'
                : 'text-emerald-600 hover:bg-gray-100'
            }`}
          >
            View All Achievements
          </button>
        )}
      </div>
    );
  }

  const filteredAchievements = selectedCategory === 'all'
    ? categories.flatMap(cat => achievements[cat])
    : achievements[selectedCategory];

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-emerald-500">{stats.unlocked}</p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Unlocked</p>
          </div>
          <div className="text-center flex-1">
            <p className={`text-2xl font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{stats.total}</p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Total</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-amber-500">{stats.percentage}%</p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Complete</p>
          </div>
        </div>

        {/* Tier breakdown */}
        <div className="flex gap-2">
          {tierOrder.map(tier => {
            const tierInfo = getTierInfo(tier);
            const tierStats = stats.byTier[tier];
            return (
              <div
                key={tier}
                className={`flex-1 text-center py-2 rounded-lg ${isDark ? tierInfo.bgDark : tierInfo.bgLight}`}
              >
                <p className={`text-sm font-bold ${tierInfo.color}`}>
                  {tierStats.unlocked}/{tierStats.total}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{tierInfo.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category filter */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 min-w-max pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white'
                : isDark
                ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({stats.unlocked}/{stats.total})
          </button>
          {categories.map(cat => {
            const catInfo = getCategoryInfo(cat);
            const catAchievements = achievements[cat];
            const unlockedCount = catAchievements.filter(a => a.unlocked).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : isDark
                    ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {catInfo.icon} {catInfo.label} ({unlockedCount})
              </button>
            );
          })}
        </div>
      </div>

      {/* Achievement list */}
      <div className="space-y-3">
        {filteredAchievements.map(achievement => {
          const tierInfo = getTierInfo(achievement.tier);
          return (
            <div
              key={achievement.id}
              className={`p-3 rounded-xl border transition-all ${
                achievement.unlocked
                  ? isDark
                    ? `border-emerald-700 ${tierInfo.bgDark}`
                    : `border-emerald-300 ${tierInfo.bgLight}`
                  : isDark
                  ? 'border-gray-700 bg-gray-800 opacity-60'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`text-3xl ${!achievement.unlocked && 'grayscale'}`}>
                  {achievement.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                      {achievement.name}
                    </p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? tierInfo.bgDark : tierInfo.bgLight} ${tierInfo.color}`}>
                      {tierInfo.label}
                    </span>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {achievement.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {achievement.unlocked ? (
                    <span className="text-emerald-500 text-xl">✓</span>
                  ) : (
                    <span className={`text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      +{achievement.xpReward} XP
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Badge component
interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  isDark: boolean;
  size?: 'small' | 'medium' | 'large';
}

function AchievementBadge({ achievement, unlocked, isDark, size = 'medium' }: AchievementBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tierInfo = getTierInfo(achievement.tier);

  const sizeClasses = {
    small: 'w-8 h-8 text-base',
    medium: 'w-10 h-10 text-lg',
    large: 'w-12 h-12 text-xl',
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip(true)}
      onTouchEnd={() => setShowTooltip(false)}
    >
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
          unlocked
            ? `${isDark ? tierInfo.bgDark : tierInfo.bgLight} shadow-md ring-2 ${
                achievement.tier === 'platinum' ? 'ring-cyan-400' :
                achievement.tier === 'gold' ? 'ring-yellow-400' :
                achievement.tier === 'silver' ? 'ring-gray-400' :
                'ring-amber-400'
              }`
            : isDark
            ? 'bg-gray-700 grayscale opacity-50'
            : 'bg-gray-200 grayscale opacity-50'
        }`}
        role="img"
        aria-label={`${achievement.name}: ${achievement.description}${unlocked ? ' (Unlocked)' : ' (Locked)'}`}
      >
        {achievement.icon}
      </div>

      {showTooltip && (
        <div
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg shadow-lg whitespace-nowrap z-10 ${
            isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-800 text-white'
          }`}
        >
          <p className="font-medium">{achievement.name}</p>
          <p className={isDark ? 'text-gray-400' : 'text-gray-300'}>{achievement.description}</p>
          {unlocked ? (
            <p className="text-emerald-400 mt-1">Unlocked!</p>
          ) : (
            <p className="text-amber-400 mt-1">+{achievement.xpReward} XP</p>
          )}
        </div>
      )}
    </div>
  );
}

// Achievement unlock notification
interface AchievementNotificationProps {
  achievement: Achievement;
  onClose: () => void;
  isDark: boolean;
}

export function AchievementNotification({ achievement, onClose, isDark }: AchievementNotificationProps) {
  const tierInfo = getTierInfo(achievement.tier);

  useEffect(() => {
    playStreakSound();
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border-2 animate-slide-down cursor-pointer ${
        isDark ? 'bg-gray-800' : 'bg-white'
      } ${
        achievement.tier === 'platinum' ? 'border-cyan-400' :
        achievement.tier === 'gold' ? 'border-yellow-400' :
        achievement.tier === 'silver' ? 'border-gray-400' :
        'border-amber-400'
      }`}
      onClick={onClose}
      role="alert"
    >
      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-lg ${isDark ? tierInfo.bgDark : tierInfo.bgLight}`}>
        {achievement.icon}
      </div>
      <div className="flex-1">
        <p className={`text-xs uppercase tracking-wide font-medium ${
          achievement.tier === 'platinum' ? 'text-cyan-400' :
          achievement.tier === 'gold' ? 'text-yellow-500' :
          achievement.tier === 'silver' ? 'text-gray-400' :
          'text-amber-500'
        }`}>
          {tierInfo.label} Achievement Unlocked!
        </p>
        <p className={`font-bold text-lg ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          {achievement.name}
        </p>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {achievement.description}
        </p>
      </div>
      <div className="text-right">
        <p className="text-emerald-500 font-bold text-lg">+{achievement.xpReward}</p>
        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>XP</p>
      </div>
    </div>
  );
}

// Hook to check for unseen achievements
export function useAchievementNotifications(
  _isDark: boolean,
  _showToast: (message: string) => void
): { notification: Achievement | null; dismissNotification: () => void } {
  const [notification, setNotification] = useState<Achievement | null>(null);

  useEffect(() => {
    const unseen = getUnseenAchievements();
    if (unseen.length > 0) {
      setNotification(unseen[0]);
    }
  }, []);

  const dismissNotification = () => {
    if (notification) {
      markAllAchievementsSeen();
      setNotification(null);
    }
  };

  return { notification, dismissNotification };
}
