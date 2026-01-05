import { useState, useEffect, useCallback } from 'react';
import type { Page, Card } from '../types';
import { getAllCards } from '../db/cards';
import { addXP } from '../utils/xp';
import { Confetti } from '../components/Confetti';
import { playCorrectSound, playWrongSound, playCelebrationSound, resumeAudioContext } from '../utils/sounds';
import { incrementAchievementProgress } from '../utils/achievements';

interface QuizProps {
  onNavigate: (page: Page) => void;
  showToast: (message: string) => void;
  isDark: boolean;
}

interface QuizQuestion {
  card: Card;
  options: string[];
  correctIndex: number;
}

type GameState = 'setup' | 'playing' | 'feedback' | 'finished';
type QuizDirection = 'es-to-en' | 'en-to-es' | 'mixed';

const QUESTION_COUNTS = [5, 10, 15, 20];
const XP_PER_CORRECT = 10;
const PERFECT_BONUS = 50;

export function Quiz({ onNavigate, showToast, isDark }: QuizProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>('setup');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(10);
  const [direction, setDirection] = useState<QuizDirection>('es-to-en');
  const [showConfetti, setShowConfetti] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    loadCards();
  }, []);

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

  const generateQuestions = useCallback((): QuizQuestion[] => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(questionCount, cards.length));

    return selected.map(card => {
      // Determine direction for this question
      const isEsToEn = direction === 'es-to-en' || (direction === 'mixed' && Math.random() > 0.5);

      // Get wrong answers from other cards
      const otherCards = cards.filter(c => c.id !== card.id);
      const wrongAnswers = otherCards
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(c => isEsToEn ? c.back : c.front);

      // Combine correct and wrong answers
      const correctAnswer = isEsToEn ? card.back : card.front;
      const allOptions = [correctAnswer, ...wrongAnswers];

      // Shuffle options
      const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
      const correctIndex = shuffledOptions.indexOf(correctAnswer);

      return {
        card: { ...card, front: isEsToEn ? card.front : card.back, back: isEsToEn ? card.back : card.front },
        options: shuffledOptions,
        correctIndex,
      };
    });
  }, [cards, questionCount, direction]);

  const startGame = useCallback(() => {
    resumeAudioContext();
    const newQuestions = generateQuestions();
    setQuestions(newQuestions);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setStreak(0);
    setBestStreak(0);
    setGameState('playing');
  }, [generateQuestions]);

  const handleAnswer = useCallback((index: number) => {
    if (gameState !== 'playing' || selectedAnswer !== null) return;

    setSelectedAnswer(index);
    const isCorrect = index === currentQuestion.correctIndex;

    if (isCorrect) {
      playCorrectSound();
      setScore(s => s + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak(b => Math.max(b, newStreak));
    } else {
      playWrongSound();
      setStreak(0);
    }

    setGameState('feedback');
  }, [gameState, selectedAnswer, currentQuestion, streak]);

  const nextQuestion = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      // Game over
      const finalScore = score + (selectedAnswer === currentQuestion?.correctIndex ? 1 : 0);
      const baseXP = finalScore * XP_PER_CORRECT;
      const isPerfect = finalScore === questions.length;
      const perfectBonus = isPerfect ? PERFECT_BONUS : 0;
      const totalXP = baseXP + perfectBonus;

      addXP(totalXP);
      setGameState('finished');
      playCelebrationSound();

      // Track achievements
      incrementAchievementProgress('gamesPlayed', 1);
      if (isPerfect) {
        incrementAchievementProgress('quizzesPerfect', 1);
        setShowConfetti(true);
        showToast(`Perfect score! +${totalXP} XP`);
      } else {
        showToast(`Quiz complete! +${totalXP} XP`);
      }
    } else {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
      setGameState('playing');
    }
  }, [currentIndex, questions.length, score, selectedAnswer, currentQuestion, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'playing' && selectedAnswer === null) {
        const keyMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
        if (keyMap[e.key] !== undefined && keyMap[e.key] < currentQuestion?.options.length) {
          handleAnswer(keyMap[e.key]);
        }
      } else if (gameState === 'feedback') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          nextQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, selectedAnswer, currentQuestion, handleAnswer, nextQuestion]);

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
          <h2 className="text-xl font-semibold">Multiple Choice Quiz</h2>
          <button
            onClick={() => onNavigate('home')}
            className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
          >
            Back
          </button>
        </div>

        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="text-center mb-6">
            <span className="text-5xl mb-2 block">🧠</span>
            <h3 className="text-2xl font-bold mb-2">Quiz Mode</h3>
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              Test your knowledge with multiple choice questions!
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
              {/* Question count */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Questions
                </label>
                <div className="flex gap-2">
                  {QUESTION_COUNTS.map(count => (
                    <button
                      key={count}
                      onClick={() => setQuestionCount(Math.min(count, cards.length))}
                      disabled={cards.length < count}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        questionCount === count
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
                  Quiz direction
                </label>
                <div className="flex gap-2">
                  {([
                    { value: 'es-to-en', label: 'ES → EN' },
                    { value: 'en-to-es', label: 'EN → ES' },
                    { value: 'mixed', label: 'Mixed' },
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
                  <li>• Choose the correct translation from 4 options</li>
                  <li>• Press 1-4 or tap to answer</li>
                  <li>• Earn {XP_PER_CORRECT} XP per correct answer</li>
                  <li>• Perfect score bonus: +{PERFECT_BONUS} XP!</li>
                </ul>
              </div>

              <button
                onClick={startGame}
                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors"
              >
                Start Quiz
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Playing/Feedback state
  if ((gameState === 'playing' || gameState === 'feedback') && currentQuestion) {
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {currentIndex + 1} / {questions.length}
          </span>
          {streak > 1 && (
            <span className="text-sm text-orange-500 font-bold">
              🔥 {streak} streak!
            </span>
          )}
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

        {/* Question */}
        <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <p className={`text-sm mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            What is the translation of:
          </p>
          <p className="text-2xl font-bold text-center py-4">
            {currentQuestion.card.front}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === currentQuestion.correctIndex;
            const showResult = gameState === 'feedback';

            let buttonClass = '';
            if (showResult) {
              if (isCorrect) {
                buttonClass = 'bg-emerald-500 text-white border-emerald-500';
              } else if (isSelected && !isCorrect) {
                buttonClass = 'bg-red-500 text-white border-red-500';
              } else {
                buttonClass = isDark
                  ? 'bg-gray-700 text-gray-400 border-gray-600'
                  : 'bg-gray-100 text-gray-400 border-gray-200';
              }
            } else {
              buttonClass = isDark
                ? 'bg-gray-700 text-gray-200 border-gray-600 hover:border-emerald-500'
                : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-500';
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={gameState === 'feedback'}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${buttonClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    showResult && isCorrect
                      ? 'bg-white/20'
                      : isDark ? 'bg-gray-600' : 'bg-gray-200'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="flex-1">{option}</span>
                  {showResult && isCorrect && <span>✓</span>}
                  {showResult && isSelected && !isCorrect && <span>✗</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue button */}
        {gameState === 'feedback' && (
          <button
            onClick={nextQuestion}
            className="w-full mt-6 bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors"
          >
            {currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question'}
            <span className="text-sm opacity-75 ml-2">(Space)</span>
          </button>
        )}
      </div>
    );
  }

  // Finished state
  if (gameState === 'finished') {
    const percentage = Math.round((score / questions.length) * 100);
    const baseXP = score * XP_PER_CORRECT;
    const isPerfect = score === questions.length;
    const perfectBonus = isPerfect ? PERFECT_BONUS : 0;
    const totalXP = baseXP + perfectBonus;

    return (
      <div className="p-4">
        <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Quiz Complete!</h2>
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
              {score} / {questions.length} correct
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">🔥 {bestStreak}</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Best Streak</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-500">+{totalXP}</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>XP Earned</p>
            </div>
          </div>

          {isPerfect && (
            <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
              <p className={`text-center font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                🎉 Perfect Score! +{PERFECT_BONUS} XP Bonus!
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
