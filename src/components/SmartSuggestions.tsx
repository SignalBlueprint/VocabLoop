import { useState, useEffect } from 'react';
import { getAllCards } from '../db/cards';
import { getMasteryLevel } from '../utils/mastery';
import type { Card, Page } from '../types';

interface SmartSuggestionsProps {
  isDark: boolean;
  onNavigate: (page: Page) => void;
  showToast: (message: string) => void;
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: Page;
  priority: number;
  color: string;
}

export function SmartSuggestions({ isDark, onNavigate }: SmartSuggestionsProps) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    analyzeLearning();
  }, []);

  const analyzeLearning = async () => {
    try {
      const cards = await getAllCards();
      if (cards.length === 0) return;

      const suggestions: Suggestion[] = [];

      // Count cards by mastery level
      const masteryCount = { new: 0, learning: 0, reviewing: 0, known: 0, mastered: 0 };
      cards.forEach((card: Card) => {
        const level = getMasteryLevel(card);
        masteryCount[level]++;
      });

      // Find struggling cards (low ease factor or high lapses)
      const strugglingCards = cards.filter((card: Card) =>
        card.ease < 2.0 || (card.lapses && card.lapses >= 3)
      );

      // Check for cards that haven't been reviewed in a while
      const now = Date.now();
      const staleCards = cards.filter((card: Card) => {
        const lastReview = card.lastReviewedAt || 0;
        const daysSinceReview = (now - lastReview) / (1000 * 60 * 60 * 24);
        return daysSinceReview > 14 && card.reps > 0;
      });

      // Generate suggestions based on analysis
      if (strugglingCards.length >= 5) {
        suggestions.push({
          id: 'struggling',
          title: `${strugglingCards.length} cards need attention`,
          description: 'Practice your weakest vocabulary with a focused session',
          icon: '🎯',
          action: 'custom-study',
          priority: 1,
          color: 'amber',
        });
      }

      if (masteryCount.new >= 10) {
        suggestions.push({
          id: 'new-cards',
          title: `${masteryCount.new} new cards to learn`,
          description: 'Start learning your new vocabulary today',
          icon: '✨',
          action: 'review',
          priority: 2,
          color: 'blue',
        });
      }

      if (staleCards.length >= 5) {
        suggestions.push({
          id: 'stale',
          title: `${staleCards.length} cards getting rusty`,
          description: "Review cards you haven't seen in a while",
          icon: '🔄',
          action: 'custom-study',
          priority: 3,
          color: 'orange',
        });
      }

      if (masteryCount.learning >= 10) {
        suggestions.push({
          id: 'quiz-time',
          title: 'Test your knowledge',
          description: `${masteryCount.learning} cards in progress - try a quiz!`,
          icon: '🧠',
          action: 'quiz',
          priority: 4,
          color: 'cyan',
        });
      }

      // Pick the highest priority suggestion
      if (suggestions.length > 0) {
        suggestions.sort((a, b) => a.priority - b.priority);
        setSuggestion(suggestions[0]);
      }
    } catch (error) {
      console.error('Failed to analyze learning:', error);
    }
  };

  if (!suggestion || dismissed) {
    return null;
  }

  const colorClasses = {
    amber: {
      bg: isDark ? 'bg-amber-900/30 border-amber-700/50' : 'bg-amber-50 border-amber-200',
      text: isDark ? 'text-amber-300' : 'text-amber-700',
      button: isDark ? 'bg-amber-600 hover:bg-amber-500' : 'bg-amber-500 hover:bg-amber-600',
    },
    blue: {
      bg: isDark ? 'bg-blue-900/30 border-blue-700/50' : 'bg-blue-50 border-blue-200',
      text: isDark ? 'text-blue-300' : 'text-blue-700',
      button: isDark ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600',
    },
    orange: {
      bg: isDark ? 'bg-orange-900/30 border-orange-700/50' : 'bg-orange-50 border-orange-200',
      text: isDark ? 'text-orange-300' : 'text-orange-700',
      button: isDark ? 'bg-orange-600 hover:bg-orange-500' : 'bg-orange-500 hover:bg-orange-600',
    },
    cyan: {
      bg: isDark ? 'bg-cyan-900/30 border-cyan-700/50' : 'bg-cyan-50 border-cyan-200',
      text: isDark ? 'text-cyan-300' : 'text-cyan-700',
      button: isDark ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-cyan-500 hover:bg-cyan-600',
    },
  };

  const colors = colorClasses[suggestion.color as keyof typeof colorClasses] || colorClasses.amber;

  return (
    <div className={`rounded-xl p-4 mb-4 border ${colors.bg}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0" aria-hidden="true">{suggestion.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${colors.text}`}>{suggestion.title}</p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {suggestion.description}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => onNavigate(suggestion.action)}
              className={`${colors.button} text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors`}
            >
              Start Session
            </button>
            <button
              onClick={() => setDismissed(true)}
              className={`text-sm ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-500'}`}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
