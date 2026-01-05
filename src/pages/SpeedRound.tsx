import { useState, useEffect, useCallback, useRef } from 'react';
import type { Page, Card } from '../types';
import { getAllCards } from '../db/cards';
import { addXP } from '../utils/xp';
import { Confetti } from '../components/Confetti';
import { incrementAchievementProgress } from '../utils/achievements';

interface SpeedRoundProps {
  onNavigate: (page: Page) => void;
  showToast: (message: string) => void;
  isDark: boolean;
}

type GameState = 'setup' | 'playing' | 'paused' | 'finished';

interface RoundStats {
  correct: number;
  wrong: number;
  skipped: number;
  totalTime: number;
  avgTime: number;
  bestStreak: number;
}

const TIME_LIMIT = 5000; // 5 seconds per card
const XP_PER_CORRECT = 15;
const STREAK_BONUS_XP = 5; // Extra XP per streak card

export function SpeedRound({ onNavigate, showToast, isDark }: SpeedRoundProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>('setup');
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(TIME_LIMIT);
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [stats, setStats] = useState<RoundStats>({
    correct: 0,
    wrong: 0,
    skipped: 0,
    totalTime: 0,
    avgTime: 0,
    bestStreak: 0,
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [roundSize, setRoundSize] = useState(10);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const currentCard = cards[currentIndex];

  useEffect(() => {
    loadCards();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadCards = async () => {
    try {
      const allCards = await getAllCards();
      // Filter to only basic cards (cloze and verb require different UI)
      const basicCards = allCards.filter(c => c.type === 'BASIC');
      // Shuffle
      const shuffled = [...basicCards].sort(() => Math.random() - 0.5);
      setCards(shuffled);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = useCallback(() => {
    if (cards.length === 0) return;

    // Shuffle and take roundSize cards
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled.slice(0, roundSize));
    setCurrentIndex(0);
    setStats({ correct: 0, wrong: 0, skipped: 0, totalTime: 0, avgTime: 0, bestStreak: 0 });
    setCurrentStreak(0);
    setTimeRemaining(TIME_LIMIT);
    setShowAnswer(false);
    setGameState('playing');
    startTimeRef.current = Date.now();

    // Start timer
    timerRef.current = window.setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 100;
        if (newTime <= 0) {
          handleTimeout();
          return TIME_LIMIT;
        }
        return newTime;
      });
    }, 100);
  }, [cards, roundSize]);

  const handleTimeout = useCallback(() => {
    setShowAnswer(true);
    setCurrentStreak(0);
    setTimeout(() => moveToNext('skip'), 1000);
  }, []);

  const moveToNext = useCallback((result: 'correct' | 'wrong' | 'skip') => {
    const timeTaken = TIME_LIMIT - timeRemaining;

    setStats(prev => {
      const newStats = { ...prev };
      if (result === 'correct') newStats.correct++;
      else if (result === 'wrong') newStats.wrong++;
      else newStats.skipped++;

      newStats.totalTime += timeTaken;
      const totalAnswered = newStats.correct + newStats.wrong;
      newStats.avgTime = totalAnswered > 0 ? Math.round(newStats.totalTime / totalAnswered) : 0;

      return newStats;
    });

    setShowAnswer(false);
    setTimeRemaining(TIME_LIMIT);
    startTimeRef.current = Date.now();

    if (currentIndex + 1 >= cards.length) {
      // Game over
      if (timerRef.current) clearInterval(timerRef.current);
      setGameState('finished');

      // Calculate XP earned
      const baseXP = stats.correct * XP_PER_CORRECT;
      const streakXP = stats.bestStreak * STREAK_BONUS_XP;
      const totalXP = baseXP + streakXP + (result === 'correct' ? XP_PER_CORRECT : 0);

      // Track achievements
      incrementAchievementProgress('gamesPlayed', 1);
      incrementAchievementProgress('speedRoundsCompleted', 1);

      if (totalXP > 0) {
        addXP(totalXP);
        showToast(`Speed round complete! +${totalXP} XP`);
      }

      if ((stats.correct + (result === 'correct' ? 1 : 0)) >= Math.floor(cards.length * 0.8)) {
        setShowConfetti(true);
      }
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, cards.length, timeRemaining, stats, showToast]);

  const handleAnswer = useCallback((correct: boolean) => {
    if (gameState !== 'playing') return;

    if (correct) {
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      setStats(prev => ({
        ...prev,
        bestStreak: Math.max(prev.bestStreak, newStreak),
      }));
      moveToNext('correct');
    } else {
      setShowAnswer(true);
      setCurrentStreak(0);
      setTimeout(() => moveToNext('wrong'), 1500);
    }
  }, [gameState, currentStreak, moveToNext]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing' || showAnswer) return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleAnswer(true); // Know it
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleAnswer(false); // Don't know
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, showAnswer, handleAnswer]);

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
          <h2 className="text-xl font-semibold">Speed Round</h2>
          <button
            onClick={() => onNavigate('home')}
            className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
          >
            Back
          </button>
        </div>

        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="text-center mb-6">
            <span className="text-5xl mb-2 block">⚡</span>
            <h3 className="text-2xl font-bold mb-2">Speed Round</h3>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Answer as fast as you can! You have 5 seconds per card.
            </p>
          </div>

          {cards.length < 5 ? (
            <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
              <p className={isDark ? 'text-amber-400' : 'text-amber-700'}>
                You need at least 5 basic cards to play Speed Round.
              </p>
              <p className={`text-sm mt-2 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>
                Add more cards to your deck first!
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Cards per round
                </label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map(size => (
                    <button
                      key={size}
                      onClick={() => setRoundSize(Math.min(size, cards.length))}
                      disabled={cards.length < size}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        roundSize === size
                          ? 'bg-emerald-600 text-white'
                          : cards.length < size
                          ? isDark
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isDark
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h4 className={`font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  How to play
                </h4>
                <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <li>• See the Spanish word, answer if you know the English</li>
                  <li>• Tap "Know it" or press → if you got it right</li>
                  <li>• Tap "Don't know" or press ← if you need to see it</li>
                  <li>• Build streaks for bonus XP!</li>
                </ul>
              </div>

              <button
                onClick={startGame}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors"
              >
                Start Speed Round
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Playing state
  if (gameState === 'playing' && currentCard) {
    const progress = (currentIndex / cards.length) * 100;
    const timeProgress = (timeRemaining / TIME_LIMIT) * 100;
    const isLowTime = timeRemaining <= 2000;

    return (
      <div className="p-4">
        {/* Header with progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {currentIndex + 1} / {cards.length}
            </span>
            {currentStreak > 1 && (
              <span className="text-sm text-orange-500 font-bold">
                🔥 {currentStreak} streak!
              </span>
            )}
            <span className={`text-sm font-mono ${isLowTime ? 'text-red-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {(timeRemaining / 1000).toFixed(1)}s
            </span>
          </div>

          {/* Progress bar */}
          <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className="h-2 rounded-full bg-emerald-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Timer bar */}
          <div className={`h-1 mt-1 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className={`h-1 rounded-full transition-all ${isLowTime ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${timeProgress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className={`rounded-xl p-8 mb-6 min-h-[250px] flex flex-col items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <p className="text-3xl font-bold text-center mb-4">
            {currentCard.front}
          </p>

          {showAnswer && (
            <div className="mt-4 text-center animate-pulse">
              <p className={`text-xl ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {currentCard.back}
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}
        {!showAnswer && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleAnswer(false)}
              className={`py-4 rounded-xl font-semibold text-lg transition-colors ${
                isDark
                  ? 'bg-red-900/50 text-red-400 hover:bg-red-900/70'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              Don't know
              <span className="block text-xs opacity-75">← key</span>
            </button>
            <button
              onClick={() => handleAnswer(true)}
              className="bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors"
            >
              Know it!
              <span className="block text-xs opacity-75">→ key</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Finished state
  if (gameState === 'finished') {
    const accuracy = cards.length > 0 ? Math.round((stats.correct / cards.length) * 100) : 0;
    const baseXP = stats.correct * XP_PER_CORRECT;
    const streakXP = stats.bestStreak * STREAK_BONUS_XP;
    const totalXP = baseXP + streakXP;

    return (
      <div className="p-4">
        <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Speed Round Complete!</h2>
          <button
            onClick={() => onNavigate('home')}
            className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
          >
            Done
          </button>
        </div>

        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          {/* Big accuracy display */}
          <div className="text-center mb-6">
            <p className="text-6xl font-bold mb-2" style={{
              color: accuracy >= 80 ? '#10b981' : accuracy >= 60 ? '#f59e0b' : '#ef4444'
            }}>
              {accuracy}%
            </p>
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Accuracy</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-500">{stats.correct}</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Correct</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{stats.wrong}</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Wrong</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-500">{stats.skipped}</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Skipped</p>
            </div>
          </div>

          {/* Additional stats */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex justify-between mb-2">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Best streak</span>
              <span className="font-bold text-orange-500">🔥 {stats.bestStreak}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Avg time</span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                {(stats.avgTime / 1000).toFixed(1)}s
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>XP earned</span>
              <span className="font-bold text-emerald-500">+{totalXP} XP</span>
            </div>
          </div>
        </div>

        {/* Play again buttons */}
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
