import { useState, useEffect } from 'react';
import type { Card } from '../types';
import { getAllCards } from '../db/cards';
import { getAllReviews } from '../db/reviews';

interface WeakAreasReportProps {
  isDark: boolean;
  onClose: () => void;
}

interface CardStats {
  card: Card;
  successRate: number;
  lapses: number;
  totalReviews: number;
}

interface TagStats {
  tag: string;
  successRate: number;
  cardCount: number;
  totalLapses: number;
}

export function WeakAreasReport({ isDark, onClose }: WeakAreasReportProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [weakCards, setWeakCards] = useState<CardStats[]>([]);
  const [weakTags, setWeakTags] = useState<TagStats[]>([]);
  const [activeTab, setActiveTab] = useState<'cards' | 'tags'>('cards');

  useEffect(() => {
    loadWeakAreas();
  }, []);

  const loadWeakAreas = async () => {
    try {
      const [cards, reviews] = await Promise.all([
        getAllCards(),
        getAllReviews(),
      ]);

      // Calculate success rate per card
      // Success rate = 1 - (lapses / total reviews)
      // Also consider cards that have been reviewed but have high lapse counts
      const cardStats: CardStats[] = cards
        .filter(card => card.reps > 0) // Only cards that have been reviewed
        .map(card => {
          const cardReviews = reviews.filter(r => r.cardId === card.id);
          const failedReviews = cardReviews.filter(r => r.grade === 'again').length;
          const totalReviews = cardReviews.length;
          const successRate = totalReviews > 0
            ? Math.round(((totalReviews - failedReviews) / totalReviews) * 100)
            : 100;

          return {
            card,
            successRate,
            lapses: card.lapses,
            totalReviews,
          };
        })
        // Sort by success rate (ascending), then by lapses (descending)
        .sort((a, b) => {
          if (a.successRate !== b.successRate) return a.successRate - b.successRate;
          return b.lapses - a.lapses;
        })
        // Take top 10 weakest
        .slice(0, 10);

      setWeakCards(cardStats);

      // Calculate success rate per tag
      const tagMap = new Map<string, { cards: Card[]; lapses: number; reviews: number; failed: number }>();

      for (const card of cards) {
        for (const tag of card.tags) {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, { cards: [], lapses: 0, reviews: 0, failed: 0 });
          }
          const stats = tagMap.get(tag)!;
          stats.cards.push(card);
          stats.lapses += card.lapses;

          // Count reviews for this card
          const cardReviews = reviews.filter(r => r.cardId === card.id);
          stats.reviews += cardReviews.length;
          stats.failed += cardReviews.filter(r => r.grade === 'again').length;
        }
      }

      const tagStats: TagStats[] = Array.from(tagMap.entries())
        .filter(([, stats]) => stats.reviews > 0) // Only tags with reviews
        .map(([tag, stats]) => ({
          tag,
          successRate: stats.reviews > 0
            ? Math.round(((stats.reviews - stats.failed) / stats.reviews) * 100)
            : 100,
          cardCount: stats.cards.length,
          totalLapses: stats.lapses,
        }))
        // Sort by success rate (ascending)
        .sort((a, b) => a.successRate - b.successRate)
        // Take top 10 weakest
        .slice(0, 10);

      setWeakTags(tagStats);
    } catch (error) {
      console.error('Failed to load weak areas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSuccessRateColor = (rate: number): string => {
    if (rate < 50) return 'text-red-500';
    if (rate < 70) return 'text-orange-500';
    if (rate < 85) return 'text-yellow-500';
    return 'text-emerald-500';
  };

  const getSuccessRateBar = (rate: number): string => {
    if (rate < 50) return 'bg-red-500';
    if (rate < 70) return 'bg-orange-500';
    if (rate < 85) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weak-areas-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <h2 id="weak-areas-title" className="text-lg font-semibold">Weak Areas</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Focus on these to improve retention
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'cards'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : isDark
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Weakest Cards
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'tags'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : isDark
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Weakest Tags
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Analyzing...</p>
            </div>
          ) : activeTab === 'cards' ? (
            weakCards.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">✨</p>
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  No weak cards found! Keep practicing.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {weakCards.map(({ card, successRate, lapses, totalReviews }) => (
                  <div
                    key={card.id}
                    className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{card.front}</p>
                        <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {card.back}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <p className={`text-lg font-bold ${getSuccessRateColor(successRate)}`}>
                          {successRate}%
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          success
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className={`h-1.5 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
                      <div
                        className={`h-full rounded-full ${getSuccessRateBar(successRate)}`}
                        style={{ width: `${successRate}%` }}
                      />
                    </div>
                    <div className={`flex justify-between text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <span>{totalReviews} reviews</span>
                      <span>{lapses} lapses</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            weakTags.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">✨</p>
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  No weak tags found! All categories are doing well.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {weakTags.map(({ tag, successRate, cardCount, totalLapses }) => (
                  <div
                    key={tag}
                    className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-sm ${isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
                          {tag}
                        </span>
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {cardCount} cards
                        </span>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${getSuccessRateColor(successRate)}`}>
                          {successRate}%
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className={`h-1.5 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
                      <div
                        className={`h-full rounded-full ${getSuccessRateBar(successRate)}`}
                        style={{ width: `${successRate}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {totalLapses} total lapses
                    </p>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div className={`p-4 border-t text-center ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Tip: Review these cards more frequently to improve retention
          </p>
        </div>
      </div>
    </div>
  );
}
