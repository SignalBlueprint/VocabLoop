import { useState, useEffect, useCallback } from 'react';
import type { Page, Card } from '../types';
import { getAllCards } from '../db/cards';
import { addXP } from '../utils/xp';
import { Confetti } from '../components/Confetti';
import { playMatchSound, playWrongSound, playCelebrationSound, resumeAudioContext } from '../utils/sounds';
import { incrementAchievementProgress } from '../utils/achievements';

interface MatchingGameProps {
  onNavigate: (page: Page) => void;
  showToast: (message: string) => void;
  isDark: boolean;
}

interface GameTile {
  id: string;
  text: string;
  cardId: string;
  type: 'spanish' | 'english';
  matched: boolean;
  selected: boolean;
}

type GameState = 'setup' | 'playing' | 'finished';

const GRID_SIZES = [
  { pairs: 4, label: '4 pairs', cols: 4 },
  { pairs: 6, label: '6 pairs', cols: 4 },
  { pairs: 8, label: '8 pairs', cols: 4 },
];

const XP_PER_MATCH = 5;
const TIME_BONUS_THRESHOLD = 60; // seconds
const TIME_BONUS_XP = 25;

export function MatchingGame({ onNavigate, showToast, isDark }: MatchingGameProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [tiles, setTiles] = useState<GameTile[]>([]);
  const [gameState, setGameState] = useState<GameState>('setup');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTile, setSelectedTile] = useState<GameTile | null>(null);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pairCount, setPairCount] = useState(6);
  const [showConfetti, setShowConfetti] = useState(false);
  const [incorrectPair, setIncorrectPair] = useState<string[]>([]);

  useEffect(() => {
    loadCards();
  }, []);

  // Timer
  useEffect(() => {
    let interval: number | null = null;
    if (gameState === 'playing') {
      interval = window.setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, startTime]);

  const loadCards = async () => {
    try {
      const allCards = await getAllCards();
      const basicCards = allCards.filter(c => c.type === 'BASIC');
      setCards(basicCards);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = useCallback(() => {
    if (cards.length < pairCount) return;

    // Shuffle and select cards
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, pairCount);

    // Create tiles (one Spanish, one English per card)
    const gameTiles: GameTile[] = [];
    selected.forEach(card => {
      gameTiles.push({
        id: `${card.id}-es`,
        text: card.front,
        cardId: card.id,
        type: 'spanish',
        matched: false,
        selected: false,
      });
      gameTiles.push({
        id: `${card.id}-en`,
        text: card.back,
        cardId: card.id,
        type: 'english',
        matched: false,
        selected: false,
      });
    });

    // Shuffle tiles
    const shuffledTiles = gameTiles.sort(() => Math.random() - 0.5);

    setTiles(shuffledTiles);
    setMatchedPairs(0);
    setMoves(0);
    setSelectedTile(null);
    setStartTime(Date.now());
    setElapsedTime(0);
    setIncorrectPair([]);
    setGameState('playing');
    resumeAudioContext();
  }, [cards, pairCount]);

  const handleTileClick = useCallback((tile: GameTile) => {
    if (tile.matched || tile.selected || incorrectPair.length > 0) return;

    if (!selectedTile) {
      // First selection
      setSelectedTile(tile);
      setTiles(prev => prev.map(t =>
        t.id === tile.id ? { ...t, selected: true } : t
      ));
    } else {
      // Second selection
      setMoves(m => m + 1);

      if (selectedTile.cardId === tile.cardId && selectedTile.id !== tile.id) {
        // Match!
        playMatchSound();
        setTiles(prev => prev.map(t =>
          t.cardId === tile.cardId ? { ...t, matched: true, selected: false } : t
        ));
        setMatchedPairs(m => m + 1);
        setSelectedTile(null);

        // Check if game is complete
        if (matchedPairs + 1 === pairCount) {
          const finalTime = Math.floor((Date.now() - startTime) / 1000);
          const baseXP = pairCount * XP_PER_MATCH;
          const timeBonus = finalTime <= TIME_BONUS_THRESHOLD ? TIME_BONUS_XP : 0;
          const totalXP = baseXP + timeBonus;

          addXP(totalXP);
          setGameState('finished');
          setShowConfetti(true);
          playCelebrationSound();

          // Track achievements
          incrementAchievementProgress('gamesPlayed', 1);
          incrementAchievementProgress('matchingGamesWon', 1);

          if (timeBonus > 0) {
            showToast(`Perfect! +${totalXP} XP (includes time bonus!)`);
          } else {
            showToast(`Complete! +${totalXP} XP`);
          }
        }
      } else {
        // No match - show both briefly, then hide
        playWrongSound();
        setTiles(prev => prev.map(t =>
          t.id === tile.id ? { ...t, selected: true } : t
        ));
        setIncorrectPair([selectedTile.id, tile.id]);

        setTimeout(() => {
          setTiles(prev => prev.map(t =>
            t.id === selectedTile.id || t.id === tile.id
              ? { ...t, selected: false }
              : t
          ));
          setSelectedTile(null);
          setIncorrectPair([]);
        }, 800);
      }
    }
  }, [selectedTile, matchedPairs, pairCount, startTime, incorrectPair, showToast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading...</p>
      </div>
    );
  }

  // Setup screen
  if (gameState === 'setup') {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Matching Game</h2>
          <button
            onClick={() => onNavigate('home')}
            className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
          >
            Back
          </button>
        </div>

        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="text-center mb-6">
            <span className="text-5xl mb-2 block">🎯</span>
            <h3 className="text-2xl font-bold mb-2">Matching Game</h3>
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              Match Spanish words with their English translations!
            </p>
          </div>

          {cards.length < 4 ? (
            <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
              <p className={isDark ? 'text-amber-400' : 'text-amber-700'}>
                You need at least 4 basic cards to play.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Grid size
                </label>
                <div className="flex gap-2">
                  {GRID_SIZES.map(size => (
                    <button
                      key={size.pairs}
                      onClick={() => setPairCount(Math.min(size.pairs, cards.length))}
                      disabled={cards.length < size.pairs}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        pairCount === size.pairs
                          ? 'bg-emerald-600 text-white'
                          : cards.length < size.pairs
                          ? isDark
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isDark
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h4 className={`font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  How to play
                </h4>
                <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <li>• Tap tiles to reveal words</li>
                  <li>• Match Spanish with English translations</li>
                  <li>• Complete under 60s for a time bonus!</li>
                  <li>• Earn {XP_PER_MATCH} XP per match</li>
                </ul>
              </div>

              <button
                onClick={startGame}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors"
              >
                Start Game
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Playing state
  if (gameState === 'playing') {
    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {matchedPairs}/{pairCount} pairs
            </span>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {moves} moves
            </span>
          </div>
          <span className={`text-lg font-mono ${elapsedTime > TIME_BONUS_THRESHOLD ? 'text-red-500' : 'text-emerald-500'}`}>
            {formatTime(elapsedTime)}
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-4 gap-2">
          {tiles.map(tile => {
            const isIncorrect = incorrectPair.includes(tile.id);
            return (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile)}
                disabled={tile.matched}
                className={`aspect-square rounded-lg font-medium text-sm p-2 transition-all duration-200 ${
                  tile.matched
                    ? 'bg-emerald-500 text-white scale-95 opacity-60'
                    : tile.selected
                    ? isIncorrect
                      ? 'bg-red-500 text-white scale-105'
                      : tile.type === 'spanish'
                      ? 'bg-blue-500 text-white scale-105'
                      : 'bg-purple-500 text-white scale-105'
                    : isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {tile.selected || tile.matched ? (
                  <span className="break-words text-xs leading-tight">{tile.text}</span>
                ) : (
                  <span className="text-2xl">?</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Spanish</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-500" />
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>English</span>
          </div>
        </div>
      </div>
    );
  }

  // Finished state
  if (gameState === 'finished') {
    const baseXP = pairCount * XP_PER_MATCH;
    const timeBonus = elapsedTime <= TIME_BONUS_THRESHOLD ? TIME_BONUS_XP : 0;
    const totalXP = baseXP + timeBonus;
    const efficiency = Math.round((pairCount / moves) * 100);

    return (
      <div className="p-4">
        <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Game Complete!</h2>
          <button
            onClick={() => onNavigate('home')}
            className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
          >
            Done
          </button>
        </div>

        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="text-center mb-6">
            <span className="text-5xl mb-2 block">🎉</span>
            <p className="text-4xl font-bold text-emerald-500">{formatTime(elapsedTime)}</p>
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Time</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">{moves}</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Moves</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-500">{pairCount}</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Pairs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">{efficiency}%</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Efficiency</p>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex justify-between mb-2">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Match bonus</span>
              <span className="text-emerald-500">+{baseXP} XP</span>
            </div>
            {timeBonus > 0 && (
              <div className="flex justify-between mb-2">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Time bonus</span>
                <span className="text-amber-500">+{timeBonus} XP</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-600">
              <span className="font-medium">Total</span>
              <span className="font-bold text-emerald-500">+{totalXP} XP</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={startGame}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={() => setGameState('setup')}
            className={`w-full py-3 rounded-xl font-medium transition-colors ${
              isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Change Settings
          </button>
        </div>
      </div>
    );
  }

  return null;
}
