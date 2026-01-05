import { useState, useEffect, useMemo } from 'react';
import type { Page, Card } from '../types';
import { getAllCards } from '../db/cards';

interface DifficultyProps {
  onNavigate: (page: Page) => void;
  isDark: boolean;
}

interface CardWithDifficulty extends Card {
  difficultyScore: number;
  difficultyLabel: string;
}

// Calculate difficulty score based on card stats
function calculateDifficulty(card: Card): number {
  // Factors that indicate difficulty:
  // 1. Lower ease factor = harder (min 1.3, max ~2.5)
  // 2. More reviews with low interval = harder
  // 3. More lapses (if we tracked them) = harder
  // 4. Lower interval for cards with many reviews = harder

  const easeFactor = card.ease ?? 2.5;
  const reviewCount = card.reps ?? 0;
  const interval = card.intervalDays ?? 1;

  // Normalize ease factor (1.3 = 100 difficulty, 2.5 = 0 difficulty)
  const easeScore = Math.max(0, Math.min(100, ((2.5 - easeFactor) / 1.2) * 100));

  // Cards with more reviews but still short intervals are harder
  let retentionScore = 0;
  if (reviewCount > 3) {
    // If you've reviewed a lot but interval is still short, it's hard
    const expectedInterval = Math.min(reviewCount * 5, 90); // Expected days after N reviews
    retentionScore = Math.max(0, Math.min(100, ((expectedInterval - interval) / expectedInterval) * 100));
  }

  // Combine scores (ease factor is primary, retention is secondary)
  return Math.round(easeScore * 0.7 + retentionScore * 0.3);
}

function getDifficultyLabel(score: number): string {
  if (score >= 80) return 'Very Hard';
  if (score >= 60) return 'Hard';
  if (score >= 40) return 'Medium';
  if (score >= 20) return 'Easy';
  return 'Very Easy';
}

function getDifficultyColor(score: number, isDark: boolean): string {
  if (score >= 80) return 'text-red-500';
  if (score >= 60) return 'text-orange-500';
  if (score >= 40) return 'text-amber-500';
  if (score >= 20) return isDark ? 'text-emerald-400' : 'text-emerald-500';
  return isDark ? 'text-green-400' : 'text-green-500';
}

export function Difficulty({ onNavigate, isDark }: DifficultyProps) {
  const [cards, setCards] = useState<CardWithDifficulty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'hard' | 'easy'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // desc = hardest first

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const allCards = await getAllCards();

      // Only include cards that have been reviewed at least once
      const reviewedCards = allCards.filter(c => (c.reps ?? 0) >= 1);

      const cardsWithDifficulty: CardWithDifficulty[] = reviewedCards.map(card => {
        const score = calculateDifficulty(card);
        return {
          ...card,
          difficultyScore: score,
          difficultyLabel: getDifficultyLabel(score),
        };
      });

      setCards(cardsWithDifficulty);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSortedCards = useMemo(() => {
    let filtered = cards;

    if (filter === 'hard') {
      filtered = cards.filter(c => c.difficultyScore >= 60);
    } else if (filter === 'easy') {
      filtered = cards.filter(c => c.difficultyScore < 40);
    }

    return [...filtered].sort((a, b) =>
      sortOrder === 'desc'
        ? b.difficultyScore - a.difficultyScore
        : a.difficultyScore - b.difficultyScore
    );
  }, [cards, filter, sortOrder]);

  const stats = useMemo(() => {
    const hardCount = cards.filter(c => c.difficultyScore >= 60).length;
    const mediumCount = cards.filter(c => c.difficultyScore >= 40 && c.difficultyScore < 60).length;
    const easyCount = cards.filter(c => c.difficultyScore < 40).length;
    const avgDifficulty = cards.length > 0
      ? Math.round(cards.reduce((sum, c) => sum + c.difficultyScore, 0) / cards.length)
      : 0;
    return { hardCount, mediumCount, easyCount, avgDifficulty };
  }, [cards]);

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Card Difficulty</h2>
        <button
          onClick={() => onNavigate('home')}
          className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
        >
          Back
        </button>
      </div>

      {cards.length === 0 ? (
        <div className={`p-6 rounded-xl text-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <p className={`mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            No reviewed cards yet!
          </p>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Review some cards first to see difficulty rankings.
          </p>
        </div>
      ) : (
        <>
          {/* Stats overview */}
          <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="grid grid-cols-4 gap-2 text-center mb-4">
              <div>
                <p className={`text-2xl font-bold ${getDifficultyColor(stats.avgDifficulty, isDark)}`}>
                  {stats.avgDifficulty}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Avg Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{stats.hardCount}</p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Hard</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{stats.mediumCount}</p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Medium</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`}>
                  {stats.easyCount}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Easy</p>
              </div>
            </div>

            {/* Difficulty distribution bar */}
            <div className="h-3 rounded-full overflow-hidden flex">
              {stats.hardCount > 0 && (
                <div
                  className="bg-red-500"
                  style={{ width: `${(stats.hardCount / cards.length) * 100}%` }}
                />
              )}
              {stats.mediumCount > 0 && (
                <div
                  className="bg-amber-500"
                  style={{ width: `${(stats.mediumCount / cards.length) * 100}%` }}
                />
              )}
              {stats.easyCount > 0 && (
                <div
                  className="bg-emerald-500"
                  style={{ width: `${(stats.easyCount / cards.length) * 100}%` }}
                />
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {(['all', 'hard', 'easy'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    filter === f
                      ? 'bg-emerald-600 text-white'
                      : isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'hard' ? 'Hard Only' : 'Easy Only'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className={`px-3 py-1 rounded-lg text-sm ${
                isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {sortOrder === 'desc' ? '↓ Hardest' : '↑ Easiest'}
            </button>
          </div>

          {/* Card list */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filteredAndSortedCards.map((card) => (
              <div
                key={card.id}
                className={`p-3 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                      {card.front}
                    </p>
                    <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {card.back}
                    </p>
                    <div className={`flex gap-3 mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <span>{card.reps ?? 0} reviews</span>
                      <span>Ease: {((card.ease ?? 2.5) * 100).toFixed(0)}%</span>
                      <span>{card.intervalDays ?? 0}d interval</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold ${getDifficultyColor(card.difficultyScore, isDark)}`}>
                      {card.difficultyScore}
                    </p>
                    <p className={`text-xs ${getDifficultyColor(card.difficultyScore, isDark)}`}>
                      {card.difficultyLabel}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className={`text-xs text-center mt-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {filteredAndSortedCards.length} of {cards.length} cards shown
          </p>
        </>
      )}
    </div>
  );
}
