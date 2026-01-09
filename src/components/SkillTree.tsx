/**
 * Skill Tree Component
 *
 * Visual representation of the skill tree with categories and badges.
 */

import { useState, useMemo } from 'react';
import {
  SKILL_CATEGORIES,
  getSkillState,
  getSkillById,
  getCategoryById,
  calculateLevel,
  setFeaturedBadges,
  type SkillCategory,
  type SkillProgress,
} from '../utils/skills';

interface SkillTreeProps {
  onClose: () => void;
  isDark: boolean;
}

export function SkillTree({ onClose, isDark }: SkillTreeProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [skillState] = useState(() => getSkillState());

  const { level, currentXP, nextLevelXP } = useMemo(
    () => calculateLevel(skillState.totalXP),
    [skillState.totalXP]
  );

  const progressMap = useMemo(() => {
    const map = new Map<string, SkillProgress>();
    for (const p of skillState.skills) {
      map.set(p.skillId, p);
    }
    return map;
  }, [skillState.skills]);

  const getCategoryProgress = (category: SkillCategory): { unlocked: number; total: number } => {
    const total = category.skills.length;
    const unlocked = category.skills.filter(
      (s) => progressMap.get(s.id)?.unlockedAt
    ).length;
    return { unlocked, total };
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isDark ? 'bg-gray-900/90' : 'bg-black/50'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 p-4 border-b flex items-center justify-between"
          style={{
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            borderColor: isDark ? '#374151' : '#e5e7eb',
          }}
        >
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Skill Tree
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="px-2 py-0.5 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: '#10b981' }}
              >
                Level {level}
              </span>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {skillState.totalXP} XP
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <svg
              className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* XP Progress Bar */}
        <div className="px-4 py-3 border-b" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
          <div className="flex justify-between text-sm mb-1">
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              Progress to Level {level + 1}
            </span>
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              {currentXP} / {nextLevelXP} XP
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: isDark ? '#374151' : '#e5e7eb' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((currentXP / nextLevelXP) * 100, 100)}%`,
                backgroundColor: '#10b981',
              }}
            />
          </div>
        </div>

        {/* Category Grid or Detail View */}
        {selectedCategory ? (
          <CategoryDetail
            categoryId={selectedCategory}
            progressMap={progressMap}
            featuredBadges={skillState.featuredBadges}
            onBack={() => setSelectedCategory(null)}
            isDark={isDark}
          />
        ) : (
          <div className="p-4 grid grid-cols-2 gap-3">
            {SKILL_CATEGORIES.map((category) => {
              const { unlocked, total } = getCategoryProgress(category);
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`p-4 rounded-xl text-left transition-all hover:scale-[1.02] ${
                    isDark ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{category.icon}</span>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                  </div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {category.name}
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {category.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: isDark ? '#4b5563' : '#e5e7eb' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(unlocked / total) * 100}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {unlocked}/{total}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface CategoryDetailProps {
  categoryId: string;
  progressMap: Map<string, SkillProgress>;
  featuredBadges: string[];
  onBack: () => void;
  isDark: boolean;
}

function CategoryDetail({
  categoryId,
  progressMap,
  featuredBadges,
  onBack,
  isDark,
}: CategoryDetailProps) {
  const category = getCategoryById(categoryId);

  if (!category) {
    return (
      <div className="p-4">
        <button onClick={onBack}>Back</button>
        <p>Category not found</p>
      </div>
    );
  }

  const toggleFeatured = (skillId: string) => {
    const current = [...featuredBadges];
    const index = current.indexOf(skillId);
    if (index >= 0) {
      current.splice(index, 1);
    } else if (current.length < 3) {
      current.push(skillId);
    }
    setFeaturedBadges(current);
  };

  return (
    <div className="p-4">
      {/* Back button and header */}
      <button
        onClick={onBack}
        className={`flex items-center gap-1 mb-4 text-sm ${
          isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to categories
      </button>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">{category.icon}</span>
        <div>
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {category.name}
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {category.nameEs} · {category.description}
          </p>
        </div>
      </div>

      {/* Skills list */}
      <div className="space-y-3">
        {category.skills.map((skill) => {
          const progress = progressMap.get(skill.id);
          const isUnlocked = !!progress?.unlockedAt;
          const isFeatured = featuredBadges.includes(skill.id);
          const progressPercent = progress
            ? Math.min((progress.currentValue / progress.targetValue) * 100, 100)
            : 0;

          return (
            <div
              key={skill.id}
              className={`p-4 rounded-xl ${
                isUnlocked
                  ? isDark
                    ? 'bg-emerald-900/30 border border-emerald-700'
                    : 'bg-emerald-50 border border-emerald-200'
                  : isDark
                  ? 'bg-gray-700/50'
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                      isUnlocked ? 'shadow-lg' : 'opacity-50'
                    }`}
                    style={{
                      backgroundColor: isUnlocked ? category.color : isDark ? '#4b5563' : '#d1d5db',
                    }}
                  >
                    {isUnlocked ? '✓' : '🔒'}
                  </div>
                  <div>
                    <h4
                      className={`font-semibold ${
                        isUnlocked
                          ? isDark
                            ? 'text-emerald-400'
                            : 'text-emerald-700'
                          : isDark
                          ? 'text-white'
                          : 'text-gray-900'
                      }`}
                    >
                      {skill.name}
                    </h4>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {skill.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        +{skill.xp} XP
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        Tier {skill.tier}
                      </span>
                    </div>
                  </div>
                </div>

                {isUnlocked && (
                  <button
                    onClick={() => toggleFeatured(skill.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isFeatured
                        ? 'text-yellow-500'
                        : isDark
                        ? 'text-gray-500 hover:text-yellow-500'
                        : 'text-gray-400 hover:text-yellow-500'
                    }`}
                    title={isFeatured ? 'Remove from featured' : 'Add to featured'}
                  >
                    {isFeatured ? '★' : '☆'}
                  </button>
                )}
              </div>

              {/* Progress bar for locked skills */}
              {!isUnlocked && progress && progress.currentValue > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Progress</span>
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      {progress.currentValue} / {progress.targetValue}
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: isDark ? '#4b5563' : '#e5e7eb' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Badge component for displaying in other parts of the app
interface BadgeProps {
  skillId: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  isDark: boolean;
}

export function Badge({ skillId, size = 'medium', showLabel = false, isDark }: BadgeProps) {
  const skill = getSkillById(skillId);
  const category = skill ? getCategoryById(
    SKILL_CATEGORIES.find(c => c.skills.some(s => s.id === skillId))?.id || ''
  ) : null;

  if (!skill || !category) return null;

  const sizeClasses = {
    small: 'w-8 h-8 text-sm',
    medium: 'w-12 h-12 text-lg',
    large: 'w-16 h-16 text-2xl',
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizeClasses[size]} rounded-xl flex items-center justify-center shadow-lg`}
        style={{ backgroundColor: category.color }}
        title={`${skill.name}: ${skill.description}`}
      >
        {category.icon}
      </div>
      {showLabel && (
        <span
          className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
        >
          {skill.badgeName}
        </span>
      )}
    </div>
  );
}
