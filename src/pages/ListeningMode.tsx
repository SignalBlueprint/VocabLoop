import { useState, useEffect, useCallback, useRef } from 'react';
import type { Page, Card } from '../types';
import { getAllCards } from '../db/cards';
import { addXP } from '../utils/xp';
import { Confetti } from '../components/Confetti';
import { speak, isSpeechSupported, initVoices, hasSpanishVoice, stop as stopSpeech } from '../utils/speech';
import { playCorrectSound, playWrongSound, playCelebrationSound, resumeAudioContext } from '../utils/sounds';
import { incrementAchievementProgress } from '../utils/achievements';

interface ListeningModeProps {
  onNavigate: (page: Page) => void;
  showToast: (message: string) => void;
  isDark: boolean;
}

type GameState = 'setup' | 'playing' | 'finished';
type GameMode = 'multiple-choice' | 'typing';

const XP_PER_CORRECT = 15;
const PERFECT_BONUS = 75;

export function ListeningMode({ onNavigate, showToast, isDark }: ListeningModeProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [gameCards, setGameCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>('setup');
  const [isLoading, setIsLoading] = useState(true);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [hasSpanish, setHasSpanish] = useState(false);
  const [score, setScore] = useState(0);
  const [wordCount, setWordCount] = useState(10);
  const [gameMode, setGameMode] = useState<GameMode>('multiple-choice');
  const [showConfetti, setShowConfetti] = useState(false);
  const [slowMode, setSlowMode] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hasPlayed, setHasPlayed] = useState(false);

  // Multiple choice state
  const [choices, setChoices] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Typing state
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentCard = gameCards[currentIndex];

  useEffect(() => {
    loadCards();
    initVoices().then(() => {
      setSpeechAvailable(isSpeechSupported());
      setHasSpanish(hasSpanishVoice());
    });

    return () => {
      stopSpeech();
    };
  }, []);

  const loadCards = async () => {
    try {
      const allCards = await getAllCards();
      // Only use basic cards for listening
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
    setSelectedAnswer(null);
    setIsCorrect(null);
    setUserInput('');
    setShowAnswer(false);
    setHasPlayed(false);
    setGameState('playing');
  }, [cards, wordCount]);

  // Generate multiple choice options
  useEffect(() => {
    if (gameState === 'playing' && currentCard && gameMode === 'multiple-choice') {
      const correctAnswer = currentCard.back;
      const otherCards = cards.filter(c => c.id !== currentCard.id);
      const shuffledOthers = [...otherCards].sort(() => Math.random() - 0.5);
      const wrongAnswers = shuffledOthers.slice(0, 3).map(c => c.back);

      const allChoices = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
      setChoices(allChoices);
      setSelectedAnswer(null);
      setIsCorrect(null);
    }
  }, [currentCard, gameState, gameMode, cards]);

  // Auto-play audio when card changes
  useEffect(() => {
    if (gameState === 'playing' && currentCard && autoPlay && !hasPlayed) {
      const timer = setTimeout(() => {
        speak(currentCard.front, slowMode);
        setHasPlayed(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentCard, gameState, autoPlay, slowMode, hasPlayed]);

  // Focus input for typing mode
  useEffect(() => {
    if (gameState === 'playing' && gameMode === 'typing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState, gameMode, currentIndex]);

  const playAudio = () => {
    if (currentCard) {
      speak(currentCard.front, slowMode);
      setHasPlayed(true);
    }
  };

  const handleChoice = (choice: string) => {
    if (selectedAnswer !== null) return;

    const correct = choice === currentCard.back;
    setSelectedAnswer(choice);
    setIsCorrect(correct);

    if (correct) {
      playCorrectSound();
      setScore(s => s + 1);
    } else {
      playWrongSound();
    }

    setTimeout(() => {
      moveToNext();
    }, 1500);
  };

  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const checkTypingAnswer = () => {
    if (showAnswer) return;

    const correct = normalizeText(userInput) === normalizeText(currentCard.back);

    if (correct) {
      playCorrectSound();
      setScore(s => s + 1);
      setIsCorrect(true);
    } else {
      playWrongSound();
      setIsCorrect(false);
    }

    setShowAnswer(true);

    setTimeout(() => {
      moveToNext();
    }, 2000);
  };

  const skipWord = () => {
    setShowAnswer(true);
    setIsCorrect(false);

    setTimeout(() => {
      moveToNext();
    }, 1500);
  };

  const moveToNext = () => {
    if (currentIndex + 1 >= gameCards.length) {
      finishGame();
    } else {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setUserInput('');
      setShowAnswer(false);
      setHasPlayed(false);
    }
  };

  const finishGame = () => {
    const isPerfect = score === gameCards.length || (score + 1 === gameCards.length && isCorrect);
    const finalScore = score + (isCorrect ? 1 : 0);
    const baseXP = finalScore * XP_PER_CORRECT;
    const perfectBonus = isPerfect ? PERFECT_BONUS : 0;
    const totalXP = baseXP + perfectBonus;

    addXP(totalXP);

    // Track achievements
    incrementAchievementProgress('gamesPlayed', 1);

    setGameState('finished');
    playCelebrationSound();

    if (isPerfect) {
      setShowConfetti(true);
      showToast(`Perfect listening! +${totalXP} XP`);
    } else {
      showToast(`Listening complete! +${totalXP} XP`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showAnswer && userInput.trim()) {
      e.preventDefault();
      checkTypingAnswer();
    }
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
          <h2 className="text-xl font-semibold">Listening Mode</h2>
          <button
            onClick={() => onNavigate('home')}
            className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
          >
            Back
          </button>
        </div>

        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="text-center mb-6">
            <span className="text-5xl mb-2 block">🎧</span>
            <h3 className="text-2xl font-bold mb-2">Listening Mode</h3>
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              Listen and identify the Spanish word
            </p>
          </div>

          {!speechAvailable ? (
            <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <p className={isDark ? 'text-red-400' : 'text-red-700'}>
                Speech synthesis is not supported in your browser.
              </p>
            </div>
          ) : !hasSpanish ? (
            <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
              <p className={isDark ? 'text-amber-400' : 'text-amber-700'}>
                No Spanish voices available. The mode may not work properly.
              </p>
            </div>
          ) : cards.length < 4 ? (
            <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
              <p className={isDark ? 'text-amber-400' : 'text-amber-700'}>
                You need at least 4 basic cards to play.
              </p>
            </div>
          ) : (
            <>
              {/* Game mode */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Answer Mode
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGameMode('multiple-choice')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      gameMode === 'multiple-choice'
                        ? 'bg-emerald-600 text-white'
                        : isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Multiple Choice
                  </button>
                  <button
                    onClick={() => setGameMode('typing')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      gameMode === 'typing'
                        ? 'bg-emerald-600 text-white'
                        : isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Typing
                  </button>
                </div>
              </div>

              {/* Word count */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Number of words
                </label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map(count => (
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

              {/* Options */}
              <div className="space-y-3 mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slowMode}
                    onChange={(e) => setSlowMode(e.target.checked)}
                    className="rounded"
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Slow speech mode
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPlay}
                    onChange={(e) => setAutoPlay(e.target.checked)}
                    className="rounded"
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Auto-play audio
                  </span>
                </label>
              </div>

              <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <li>• Listen to the Spanish word</li>
                  <li>• Select or type the English translation</li>
                  <li>• Tap the speaker to hear again</li>
                  <li>• Earn {XP_PER_CORRECT} XP per correct answer</li>
                </ul>
              </div>

              <button
                onClick={startGame}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors"
              >
                Start Listening
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

    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {currentIndex + 1} / {gameCards.length}
          </span>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Score: {score}
          </span>
        </div>

        {/* Progress bar */}
        <div className={`h-2 rounded-full mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-2 rounded-full bg-emerald-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Audio player card */}
        <div className={`rounded-xl p-8 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="text-center">
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Listen and identify:
            </p>

            {/* Large play button */}
            <button
              onClick={playAudio}
              className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 transition-all ${
                isDark
                  ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-95'
                  : 'bg-emerald-500 hover:bg-emerald-400 active:scale-95'
              } text-white shadow-lg`}
              aria-label="Play audio"
            >
              🔊
            </button>

            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Tap to listen{slowMode ? ' (slow)' : ''}
            </p>

            {/* Show Spanish text after answer */}
            {(selectedAnswer !== null || showAnswer) && (
              <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className={`text-xl font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {currentCard.front}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Multiple choice answers */}
        {gameMode === 'multiple-choice' && (
          <div className="grid grid-cols-2 gap-3">
            {choices.map((choice, i) => {
              const isSelected = selectedAnswer === choice;
              const isTheCorrect = choice === currentCard.back;
              const showResult = selectedAnswer !== null;

              return (
                <button
                  key={i}
                  onClick={() => handleChoice(choice)}
                  disabled={selectedAnswer !== null}
                  className={`p-4 rounded-xl text-center font-medium transition-all ${
                    showResult
                      ? isTheCorrect
                        ? 'bg-emerald-500 text-white'
                        : isSelected
                        ? 'bg-red-500 text-white'
                        : isDark
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-gray-100 text-gray-400'
                      : isDark
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 active:scale-95'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
                  }`}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        )}

        {/* Typing input */}
        {gameMode === 'typing' && (
          <div>
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={showAnswer}
              placeholder="Type the English translation..."
              className={`w-full p-4 text-lg rounded-xl border-2 transition-colors mb-4 ${
                showAnswer
                  ? isCorrect
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : isDark
                  ? 'border-gray-600 bg-gray-700 text-white focus:border-emerald-500'
                  : 'border-gray-300 bg-white focus:border-emerald-500'
              } focus:outline-none`}
              autoComplete="off"
              autoCapitalize="off"
            />

            {showAnswer && (
              <div className={`p-4 rounded-xl mb-4 text-center ${
                isCorrect
                  ? isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'
                  : isDark ? 'bg-red-900/30' : 'bg-red-100'
              }`}>
                {isCorrect ? (
                  <p className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>
                    Correct!
                  </p>
                ) : (
                  <div>
                    <p className={isDark ? 'text-red-400' : 'text-red-700'}>
                      Incorrect
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Correct answer: <span className="font-medium">{currentCard.back}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={checkTypingAnswer}
                disabled={showAnswer || !userInput.trim()}
                className={`flex-1 py-4 rounded-xl font-semibold text-lg transition-colors ${
                  showAnswer || !userInput.trim()
                    ? isDark
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                Check
              </button>
              <button
                onClick={skipWord}
                disabled={showAnswer}
                className={`px-4 py-4 rounded-xl font-medium transition-colors ${
                  showAnswer
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
          </div>
        )}
      </div>
    );
  }

  // Finished state
  if (gameState === 'finished') {
    const finalScore = score;
    const percentage = Math.round((finalScore / gameCards.length) * 100);
    const isPerfect = finalScore === gameCards.length;
    const baseXP = finalScore * XP_PER_CORRECT;
    const perfectBonus = isPerfect ? PERFECT_BONUS : 0;
    const totalXP = baseXP + perfectBonus;

    return (
      <div className="p-4">
        <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Listening Complete!</h2>
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
              {finalScore} / {gameCards.length} correct
            </p>
          </div>

          {/* XP Breakdown */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex justify-between mb-2">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Correct answers</span>
              <span className="text-emerald-500">+{baseXP} XP</span>
            </div>
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
                Perfect Listening!
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
