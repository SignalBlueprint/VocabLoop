import { useState, useEffect, useCallback, useRef } from 'react';
import type { Page, Card } from '../types';
import { getAllCards } from '../db/cards';
import { addXP } from '../utils/xp';
import { Confetti } from '../components/Confetti';
import { playCorrectSound, playWrongSound, playCelebrationSound, resumeAudioContext } from '../utils/sounds';
import { incrementAchievementProgress } from '../utils/achievements';

interface TypingChallengeProps {
  onNavigate: (page: Page) => void;
  showToast: (message: string) => void;
  isDark: boolean;
}

type GameState = 'setup' | 'playing' | 'finished';
type ChallengeDirection = 'es-to-en' | 'en-to-es';

const WORD_COUNTS = [5, 10, 15, 20];
const XP_PER_CORRECT = 15; // Higher than quiz since typing is harder
const PERFECT_BONUS = 75;
const STREAK_BONUS = 5; // Extra XP per word in streak

export function TypingChallenge({ onNavigate, showToast, isDark }: TypingChallengeProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [gameCards, setGameCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>('setup');
  const [isLoading, setIsLoading] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [wordCount, setWordCount] = useState(10);
  const [direction, setDirection] = useState<ChallengeDirection>('es-to-en');
  const [showConfetti, setShowConfetti] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentCard = gameCards[currentIndex];

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

  // Focus input when playing
  useEffect(() => {
    if (gameState === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState, currentIndex]);

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
    resumeAudioContext();
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(wordCount, cards.length));
    setGameCards(selected);
    setCurrentIndex(0);
    setScore(0);
    setUserInput('');
    setStreak(0);
    setBestStreak(0);
    setFeedback(null);
    setStartTime(Date.now());
    setElapsedTime(0);
    setGameState('playing');
  }, [cards, wordCount]);

  // Normalize text for comparison (lowercase, trim, handle accents)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      // Normalize accented characters for lenient comparison
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const checkAnswer = useCallback(() => {
    if (!currentCard || feedback !== null) return;

    const expectedAnswer = direction === 'es-to-en' ? currentCard.back : currentCard.front;
    const isCorrect = normalizeText(userInput) === normalizeText(expectedAnswer);

    if (isCorrect) {
      playCorrectSound();
      setScore(s => s + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak(b => Math.max(b, newStreak));
      setFeedback('correct');
    } else {
      playWrongSound();
      setStreak(0);
      setFeedback('wrong');
    }

    // Move to next after brief delay
    setTimeout(() => {
      if (currentIndex + 1 >= gameCards.length) {
        // Game over
        finishGame(isCorrect ? score + 1 : score);
      } else {
        setCurrentIndex(i => i + 1);
        setUserInput('');
        setFeedback(null);
      }
    }, 1500);
  }, [currentCard, direction, userInput, feedback, streak, currentIndex, gameCards.length, score]);

  const finishGame = (finalScore: number) => {
    const baseXP = finalScore * XP_PER_CORRECT;
    const isPerfect = finalScore === gameCards.length;
    const perfectBonus = isPerfect ? PERFECT_BONUS : 0;
    const streakBonus = bestStreak >= 3 ? (bestStreak - 2) * STREAK_BONUS : 0;
    const totalXP = baseXP + perfectBonus + streakBonus;

    addXP(totalXP);
    setGameState('finished');
    playCelebrationSound();

    // Track achievements
    incrementAchievementProgress('gamesPlayed', 1);
    incrementAchievementProgress('typingChallengesWon', 1);

    if (isPerfect) {
      setShowConfetti(true);
      showToast(`Perfect! +${totalXP} XP`);
    } else {
      showToast(`Challenge complete! +${totalXP} XP`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && feedback === null) {
      e.preventDefault();
      checkAnswer();
    }
  };

  const skipWord = () => {
    if (feedback !== null) return;
    setStreak(0);
    setFeedback('wrong');

    setTimeout(() => {
      if (currentIndex + 1 >= gameCards.length) {
        finishGame(score);
      } else {
        setCurrentIndex(i => i + 1);
        setUserInput('');
        setFeedback(null);
      }
    }, 1500);
  };

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
          <h2 className="text-xl font-semibold">Typing Challenge</h2>
          <button
            onClick={() => onNavigate('home')}
            className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
          >
            Back
          </button>
        </div>

        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="text-center mb-6">
            <span className="text-5xl mb-2 block">⌨️</span>
            <h3 className="text-2xl font-bold mb-2">Typing Challenge</h3>
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              Type the correct translation as fast as you can!
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
              {/* Word count */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Number of words
                </label>
                <div className="flex gap-2">
                  {WORD_COUNTS.map(count => (
                    <button
                      key={count}
                      onClick={() => setWordCount(Math.min(count, cards.length))}
                      disabled={cards.length < count}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        wordCount === count
                          ? 'bg-emerald-600 text-white'
                          : cards.length < count
                          ? isDark
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isDark
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Translation direction
                </label>
                <div className="flex gap-2">
                  {([
                    { value: 'es-to-en', label: 'Spanish → English', desc: 'See Spanish, type English' },
                    { value: 'en-to-es', label: 'English → Spanish', desc: 'See English, type Spanish' },
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setDirection(value)}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        direction === value
                          ? 'bg-emerald-600 text-white'
                          : isDark
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <li>• Type the translation and press Enter</li>
                  <li>• Accents are optional (e.g., "espanol" = "español")</li>
                  <li>• Build streaks for bonus XP!</li>
                  <li>• Earn {XP_PER_CORRECT} XP per correct answer</li>
                </ul>
              </div>

              <button
                onClick={startGame}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors"
              >
                Start Challenge
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Playing state
  if (gameState === 'playing' && currentCard) {
    const progress = ((currentIndex + 1) / gameCards.length) * 100;
    const questionWord = direction === 'es-to-en' ? currentCard.front : currentCard.back;
    const correctAnswer = direction === 'es-to-en' ? currentCard.back : currentCard.front;

    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {currentIndex + 1} / {gameCards.length}
          </span>
          {streak > 1 && (
            <span className="text-sm text-orange-500 font-bold">
              🔥 {streak} streak!
            </span>
          )}
          <span className={`text-sm font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {formatTime(elapsedTime)}
          </span>
        </div>

        {/* Progress bar */}
        <div className={`h-2 rounded-full mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-2 rounded-full bg-emerald-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question */}
        <div className={`rounded-xl p-6 mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <p className={`text-sm mb-2 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {direction === 'es-to-en' ? 'Translate to English:' : 'Translate to Spanish:'}
          </p>
          <p className="text-3xl font-bold text-center py-4">
            {questionWord}
          </p>
        </div>

        {/* Input */}
        <div className="mb-4">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={feedback !== null}
            placeholder="Type your answer..."
            className={`w-full p-4 text-xl rounded-xl border-2 transition-colors ${
              feedback === 'correct'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : feedback === 'wrong'
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : isDark
                ? 'border-gray-600 bg-gray-700 text-white focus:border-emerald-500'
                : 'border-gray-300 bg-white focus:border-emerald-500'
            } focus:outline-none`}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>

        {/* Feedback */}
        {feedback !== null && (
          <div className={`p-4 rounded-xl mb-4 text-center ${
            feedback === 'correct'
              ? isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'
              : isDark ? 'bg-red-900/30' : 'bg-red-100'
          }`}>
            {feedback === 'correct' ? (
              <p className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>
                ✓ Correct!
              </p>
            ) : (
              <div>
                <p className={isDark ? 'text-red-400' : 'text-red-700'}>
                  ✗ Incorrect
                </p>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Correct answer: <span className="font-medium">{correctAnswer}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={checkAnswer}
            disabled={feedback !== null || userInput.trim() === ''}
            className={`flex-1 py-4 rounded-xl font-semibold text-lg transition-colors ${
              feedback !== null || userInput.trim() === ''
                ? isDark
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            Check (Enter)
          </button>
          <button
            onClick={skipWord}
            disabled={feedback !== null}
            className={`px-4 py-4 rounded-xl font-medium transition-colors ${
              feedback !== null
                ? isDark
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Skip
          </button>
        </div>

        {/* Score */}
        <div className="mt-4 text-center">
          <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Score: {score} / {currentIndex + (feedback === 'correct' ? 1 : 0)}
          </span>
        </div>
      </div>
    );
  }

  // Finished state
  if (gameState === 'finished') {
    const percentage = Math.round((score / gameCards.length) * 100);
    const baseXP = score * XP_PER_CORRECT;
    const isPerfect = score === gameCards.length;
    const perfectBonus = isPerfect ? PERFECT_BONUS : 0;
    const streakBonus = bestStreak >= 3 ? (bestStreak - 2) * STREAK_BONUS : 0;
    const totalXP = baseXP + perfectBonus + streakBonus;
    const avgTimePerWord = gameCards.length > 0 ? Math.round(elapsedTime / gameCards.length) : 0;

    return (
      <div className="p-4">
        <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Challenge Complete!</h2>
          <button
            onClick={() => onNavigate('home')}
            className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
          >
            Done
          </button>
        </div>

        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="text-center mb-6">
            <p className="text-6xl font-bold mb-2" style={{
              color: percentage >= 80 ? '#10b981' : percentage >= 60 ? '#f59e0b' : '#ef4444'
            }}>
              {percentage}%
            </p>
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              {score} / {gameCards.length} correct
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">🔥 {bestStreak}</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Best Streak</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">{formatTime(elapsedTime)}</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Total Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-500">{avgTimePerWord}s</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Avg/Word</p>
            </div>
          </div>

          {/* XP Breakdown */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex justify-between mb-2">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Correct answers</span>
              <span className="text-emerald-500">+{baseXP} XP</span>
            </div>
            {streakBonus > 0 && (
              <div className="flex justify-between mb-2">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Streak bonus</span>
                <span className="text-orange-500">+{streakBonus} XP</span>
              </div>
            )}
            {perfectBonus > 0 && (
              <div className="flex justify-between mb-2">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Perfect bonus</span>
                <span className="text-amber-500">+{perfectBonus} XP</span>
              </div>
            )}
            <div className={`flex justify-between pt-2 border-t ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
              <span className="font-medium">Total</span>
              <span className="font-bold text-emerald-500">+{totalXP} XP</span>
            </div>
          </div>

          {isPerfect && (
            <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
              <p className={`text-center font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                🎉 Perfect Score!
              </p>
            </div>
          )}
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
