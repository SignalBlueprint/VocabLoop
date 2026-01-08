import { useState } from 'react';
import type { Page } from '../types';

interface GameHubProps {
  isDark: boolean;
  onNavigate: (page: Page) => void;
  hasCards: boolean;
}

interface GameInfo {
  id: Page;
  name: string;
  description: string;
  icon: string;
  color: {
    light: string;
    dark: string;
  };
  featured?: boolean;
}

const GAMES: GameInfo[] = [
  {
    id: 'smart-session',
    name: 'Smart Session',
    description: 'Adaptive review mix',
    icon: '🧠',
    color: {
      light: 'from-purple-500 to-indigo-500',
      dark: 'from-purple-600 to-indigo-600',
    },
    featured: true,
  },
  {
    id: 'multiplayer-lobby',
    name: 'Multiplayer',
    description: 'Race a friend!',
    icon: '🏃',
    color: {
      light: 'from-green-500 to-emerald-500',
      dark: 'from-green-600 to-emerald-600',
    },
    featured: true,
  },
  {
    id: 'speedround',
    name: 'Speed Round',
    description: '5 seconds per card!',
    icon: '⚡',
    color: {
      light: 'from-red-500 to-orange-500',
      dark: 'from-red-600 to-orange-600',
    },
    featured: true,
  },
  {
    id: 'matching',
    name: 'Matching',
    description: 'Memory match pairs',
    icon: '🃏',
    color: {
      light: 'from-pink-500 to-rose-500',
      dark: 'from-pink-600 to-rose-600',
    },
    featured: true,
  },
  {
    id: 'quiz',
    name: 'Quiz Mode',
    description: 'Multiple choice',
    icon: '🧠',
    color: {
      light: 'from-cyan-500 to-blue-500',
      dark: 'from-cyan-600 to-blue-600',
    },
  },
  {
    id: 'typing',
    name: 'Typing',
    description: 'Type translations',
    icon: '⌨️',
    color: {
      light: 'from-indigo-500 to-purple-500',
      dark: 'from-indigo-600 to-purple-600',
    },
  },
  {
    id: 'listening',
    name: 'Listening',
    description: 'Audio practice',
    icon: '🎧',
    color: {
      light: 'from-violet-500 to-purple-500',
      dark: 'from-violet-600 to-purple-600',
    },
  },
  {
    id: 'verbs',
    name: 'Verb Drill',
    description: '70+ conjugations',
    icon: '🔤',
    color: {
      light: 'from-amber-500 to-yellow-500',
      dark: 'from-amber-600 to-yellow-600',
    },
  },
  {
    id: 'custom-study',
    name: 'Custom Study',
    description: 'Build your session',
    icon: '🎯',
    color: {
      light: 'from-emerald-500 to-teal-500',
      dark: 'from-emerald-600 to-teal-600',
    },
  },
];

export function GameHub({ isDark, onNavigate, hasCards }: GameHubProps) {
  const [showAll, setShowAll] = useState(false);

  if (!hasCards) {
    return null;
  }

  const featuredGames = GAMES.filter(g => g.featured);
  const allGames = GAMES;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          <span className="mr-1">🎮</span> Games & Practice
        </h3>
        <button
          onClick={() => setShowAll(!showAll)}
          className={`text-xs font-medium ${isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'}`}
        >
          {showAll ? 'Show less' : `+${allGames.length - featuredGames.length} more`}
        </button>
      </div>

      {/* Featured Games - Large Cards */}
      {!showAll && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          {featuredGames.map((game) => (
            <button
              key={game.id}
              onClick={() => onNavigate(game.id)}
              className={`relative overflow-hidden rounded-xl p-4 text-white transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isDark ? 'focus:ring-offset-gray-900' : ''
              } focus:ring-white/50 bg-gradient-to-br ${isDark ? game.color.dark : game.color.light}`}
            >
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative flex flex-col items-center text-center">
                <span className="text-3xl mb-1">{game.icon}</span>
                <span className="font-bold text-sm">{game.name}</span>
                <span className="text-xs opacity-90">{game.description}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* All Games Grid */}
      {showAll && (
        <div className="grid grid-cols-2 gap-2">
          {allGames.map((game) => (
            <button
              key={game.id}
              onClick={() => onNavigate(game.id)}
              className={`relative overflow-hidden rounded-xl p-3 text-white transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isDark ? 'focus:ring-offset-gray-900' : ''
              } focus:ring-white/50 bg-gradient-to-br ${isDark ? game.color.dark : game.color.light}`}
            >
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative flex items-center gap-3">
                <span className="text-2xl">{game.icon}</span>
                <div className="text-left">
                  <span className="font-bold text-sm block">{game.name}</span>
                  <span className="text-xs opacity-90">{game.description}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Motivational micro-copy */}
      <p className={`text-center text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        Games reinforce your vocabulary through active recall
      </p>
    </div>
  );
}
