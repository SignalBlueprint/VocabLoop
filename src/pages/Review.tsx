import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Card, Grade, Page } from '../types';
import { getDueCards, updateCard } from '../db/cards';
import { logReview, getReviewedTodayCount } from '../db/reviews';
import { calculateSchedule, applySchedule } from '../scheduler';
import { GradeButtons } from '../components/GradeButtons';
import { Confetti, CelebrationModal } from '../components/Confetti';
import { SessionSummary, type SessionStats } from '../components/SessionSummary';
import { XPGainAnimation } from '../components/XPGainAnimation';
import { speak, isSpeechSupported, initVoices, hasSpanishVoice } from '../utils/speech';
import { handleError } from '../utils/errors';
import { getDailyGoalTarget, markCelebrationShown } from '../utils/dailyGoal';
import { useSwipe } from '../hooks/useSwipe';
import { getReviewDirection, setReviewDirection, DIRECTION_INFO, type ReviewDirection } from '../utils/reviewSettings';
import { startStudySession, endStudySession, recordReview } from '../utils/studyTime';
import { awardReviewXP, XP_REWARDS, addXP } from '../utils/xp';
import { updateQuestProgress } from '../utils/dailyQuests';
import { recordReviewSession } from '../utils/timeAnalytics';
import { getHint, HINT_COSTS } from '../utils/hints';
import { getTotalXP } from '../utils/xp';
import { playCorrectSound, playWrongSound, playFlipSound, playHintSound, resumeAudioContext } from '../utils/sounds';
import { incrementAchievementProgress } from '../utils/achievements';
import { saveUndoState, getUndoState, clearUndoState, getUndoTimeRemaining } from '../utils/undoReview';
import { ForgettingCurve } from '../components/ForgettingCurve';

// Helper to render cloze with blank or revealed word
function renderClozeQuestion(sentence: string, word: string, revealed: boolean, isDark: boolean): React.ReactNode {
  if (!word) return sentence;

  // Find the word in the sentence (case-insensitive)
  const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i');
  const parts = sentence.split(regex);

  if (parts.length === 1) {
    // Word not found in sentence, show blank at end
    return (
      <>
        {sentence}{' '}
        {revealed ? (
          <span className="text-emerald-600 font-bold">[{word}]</span>
        ) : (
          <span className={isDark ? 'bg-gray-700 px-4 py-1 rounded' : 'bg-gray-200 px-4 py-1 rounded'}>_____</span>
        )}
      </>
    );
  }

  return parts.map((part, i) =>
    part.toLowerCase() === word.toLowerCase() ? (
      revealed ? (
        <span key={i} className="text-emerald-600 font-bold">{part}</span>
      ) : (
        <span key={i} className={isDark ? 'bg-gray-700 px-4 py-1 rounded' : 'bg-gray-200 px-4 py-1 rounded'}>_____</span>
      )
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

interface ReviewProps {
  onNavigate: (page: Page) => void;
  showToast: (message: string) => void;
  isDark: boolean;
  immersionMode?: boolean;
}

type ReviewState = 'select-direction' | 'loading' | 'show-front' | 'show-answer' | 'complete' | 'error';

export function Review({ onNavigate, showToast, isDark, immersionMode = false }: ReviewProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, setState] = useState<ReviewState>('select-direction');
  const [isGrading, setIsGrading] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [hasSpanish, setHasSpanish] = useState(true);
  const [slowMode, setSlowMode] = useState(false);
  const [showGoalCelebration, setShowGoalCelebration] = useState(false);
  const [showSessionConfetti, setShowSessionConfetti] = useState(false);
  const [direction, setDirection] = useState<ReviewDirection>(getReviewDirection());
  const [cardDirections, setCardDirections] = useState<Map<string, boolean>>(new Map()); // true = reversed
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [hintLevel, setHintLevel] = useState(0); // 0 = no hint, 1-3 = hint levels
  const [canUndoReview, setCanUndoReview] = useState(false);
  const [undoTimeLeft, setUndoTimeLeft] = useState(0);
  const [xpGainAmount, setXpGainAmount] = useState(0); // For XP animation
  const [showCurve, setShowCurve] = useState(false); // For forgetting curve modal

  // Session tracking refs
  const sessionStartTime = useRef<number>(0);
  const sessionXP = useRef<number>(0);
  const sessionGrades = useRef<Record<Grade, number>>({ again: 0, hard: 0, good: 0, easy: 0 });

  const currentCard = cards[currentIndex];
  const remaining = cards.length - currentIndex;

  // Determine if current card is reversed (showing English first)
  const isCurrentCardReversed = useMemo(() => {
    if (!currentCard) return false;
    if (currentCard.type === 'CLOZE') return false; // Cloze cards don't reverse
    return cardDirections.get(currentCard.id) ?? false;
  }, [currentCard, cardDirections]);

  // Swipe gestures for grading (when showing answer)
  // Swipe left = Again, Swipe right = Good, Swipe up = Easy, Swipe down = Hard
  const [swipeState, swipeHandlers] = useSwipe({
    onSwipeLeft: () => {
      if (state === 'show-answer' && !isGrading) {
        handleGrade('again');
      }
    },
    onSwipeRight: () => {
      if (state === 'show-answer' && !isGrading) {
        handleGrade('good');
      } else if (state === 'show-front') {
        showAnswer();
      }
    },
    onSwipeUp: () => {
      if (state === 'show-answer' && !isGrading) {
        handleGrade('easy');
      }
    },
    onSwipeDown: () => {
      if (state === 'show-answer' && !isGrading) {
        handleGrade('hard');
      }
    },
    threshold: 60,
    enabled: state === 'show-front' || state === 'show-answer',
  });

  // Get swipe feedback color based on direction
  const getSwipeFeedback = () => {
    if (!swipeState.isSwiping || state !== 'show-answer') return null;
    const { direction, offsetX, offsetY } = swipeState;
    const threshold = 60;

    if (direction === 'left' && Math.abs(offsetX) > threshold / 2) {
      return { label: 'Again', color: 'text-red-500', opacity: Math.min(Math.abs(offsetX) / threshold, 1) };
    }
    if (direction === 'right' && Math.abs(offsetX) > threshold / 2) {
      return { label: 'Good', color: 'text-emerald-500', opacity: Math.min(Math.abs(offsetX) / threshold, 1) };
    }
    if (direction === 'up' && Math.abs(offsetY) > threshold / 2) {
      return { label: 'Easy', color: 'text-blue-500', opacity: Math.min(Math.abs(offsetY) / threshold, 1) };
    }
    if (direction === 'down' && Math.abs(offsetY) > threshold / 2) {
      return { label: 'Hard', color: 'text-orange-500', opacity: Math.min(Math.abs(offsetY) / threshold, 1) };
    }
    return null;
  };

  const swipeFeedback = getSwipeFeedback();

  // Initialize speech on mount
  useEffect(() => {
    initVoices().then(() => {
      setSpeechEnabled(isSpeechSupported());
      setHasSpanish(hasSpanishVoice());
    });
  }, []);

  // Track undo availability
  useEffect(() => {
    const checkUndo = () => {
      const timeLeft = getUndoTimeRemaining();
      setUndoTimeLeft(timeLeft);
      setCanUndoReview(timeLeft > 0);
    };

    checkUndo();
    const interval = setInterval(checkUndo, 1000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const handleSelectDirection = (dir: ReviewDirection) => {
    // Resume audio context on user interaction
    resumeAudioContext();
    setDirection(dir);
    setReviewDirection(dir);
    setState('loading');
    loadDueCards(dir);
  };

  const loadDueCards = async (dir: ReviewDirection) => {
    try {
      const dueCards = await getDueCards();
      if (dueCards.length === 0) {
        setState('complete');
      } else {
        // Shuffle cards for variety
        const shuffled = [...dueCards].sort(() => Math.random() - 0.5);
        setCards(shuffled);

        // Set card directions based on mode
        const directions = new Map<string, boolean>();
        for (const card of shuffled) {
          if (card.type === 'CLOZE') {
            directions.set(card.id, false); // Cloze cards always show Spanish
          } else if (dir === 'english-to-spanish') {
            directions.set(card.id, true); // All reversed
          } else if (dir === 'mixed') {
            directions.set(card.id, Math.random() > 0.5); // Random
          } else {
            directions.set(card.id, false); // Spanish to English (default)
          }
        }
        setCardDirections(directions);
        setState('show-front');

        // Start study session tracking
        startStudySession();
        sessionStartTime.current = Date.now();
        sessionXP.current = 0;
        sessionGrades.current = { again: 0, hard: 0, good: 0, easy: 0 };
      }
    } catch (error) {
      showToast(handleError(error, 'load-cards'));
      setState('error');
    }
  };

  const showAnswer = useCallback(() => {
    if (state === 'show-front') {
      playFlipSound();
      setState('show-answer');
    }
  }, [state]);

  const handleExit = useCallback(() => {
    // End study session before navigating away
    if (state === 'show-front' || state === 'show-answer') {
      endStudySession();
    }
    onNavigate('home');
  }, [state, onNavigate]);

  const handleUndo = useCallback(async () => {
    const undoState = getUndoState();
    if (!undoState || currentIndex === 0) return;

    try {
      // Restore the card to its previous state
      await updateCard(undoState.card);

      // Deduct XP that was earned
      if (undoState.xpEarned > 0) {
        addXP(-undoState.xpEarned);
        sessionXP.current -= undoState.xpEarned;
      }

      // Decrement session grades
      sessionGrades.current[undoState.grade]--;

      // Go back to previous card
      setCurrentIndex(i => i - 1);
      setState('show-front');
      setHintLevel(0);

      // Clear undo state
      clearUndoState();
      setCanUndoReview(false);

      showToast('Review undone');
    } catch (error) {
      showToast('Failed to undo review');
    }
  }, [currentIndex, showToast]);

  const handleGrade = useCallback(async (grade: Grade) => {
    if (!currentCard || isGrading) return;

    setIsGrading(true);

    // Play sound feedback based on grade
    if (grade === 'good' || grade === 'easy') {
      playCorrectSound();
    } else if (grade === 'again') {
      playWrongSound();
    }

    try {
      // Calculate new schedule
      const result = calculateSchedule(currentCard, grade);
      const updatedCard = applySchedule(currentCard, result);

      // Save undo state before applying changes
      const xpForGrade = grade === 'easy' ? 15 : grade === 'good' ? 10 : grade === 'hard' ? 5 : 0;
      saveUndoState(currentCard, grade, xpForGrade);

      // Save to database
      await updateCard(updatedCard);

      // Log the review
      await logReview(
        currentCard.id,
        grade,
        currentCard.intervalDays,
        result.newInterval,
        currentCard.dueAt,
        result.newDueAt
      );

      // Record this review for study time tracking
      recordReview();

      // Award XP for this review and track it
      const xpResult = awardReviewXP(grade);
      sessionXP.current += xpResult.xpEarned;
      sessionGrades.current[grade]++;

      // Trigger XP animation
      if (xpResult.xpEarned > 0) {
        setXpGainAmount(xpResult.xpEarned);
      }

      // Track review achievements
      incrementAchievementProgress('totalReviews', 1);
      incrementAchievementProgress('cardsReviewedInOneDay', 1);

      // Update daily quest progress
      updateQuestProgress('reviews', 1);
      if (grade === 'good' || grade === 'easy') {
        updateQuestProgress('perfect_reviews', 1);
      }
      updateQuestProgress('streak_maintain', 1);

      // Check if daily goal was just reached
      const todayCount = await getReviewedTodayCount();
      const goalTarget = getDailyGoalTarget();
      if (todayCount === goalTarget) {
        setShowGoalCelebration(true);
        markCelebrationShown();
        // Award bonus XP for completing daily goal
        addXP(XP_REWARDS.DAILY_GOAL);
        sessionXP.current += XP_REWARDS.DAILY_GOAL;
      }

      // Move to next card
      if (currentIndex + 1 >= cards.length) {
        // End study session
        endStudySession();

        // Check for perfect session bonus
        const isPerfect = sessionGrades.current.again === 0 && sessionGrades.current.hard === 0;
        if (isPerfect && cards.length >= 5) {
          addXP(XP_REWARDS.PERFECT_SESSION);
          sessionXP.current += XP_REWARDS.PERFECT_SESSION;
          incrementAchievementProgress('perfectSessions', 1);
        }

        // Record time analytics
        const correctCount = sessionGrades.current.good + sessionGrades.current.easy;
        recordReviewSession(cards.length, correctCount);

        // Create session stats
        setSessionStats({
          totalCards: cards.length,
          grades: { ...sessionGrades.current },
          xpEarned: sessionXP.current,
          startTime: sessionStartTime.current,
          endTime: Date.now(),
          perfectSession: isPerfect && cards.length >= 5,
        });

        setState('complete');
        setShowSessionConfetti(true);
      } else {
        setCurrentIndex(currentIndex + 1);
        setState('show-front');
        setHintLevel(0); // Reset hint for next card
      }
    } catch (error) {
      showToast(handleError(error, 'review'));
    } finally {
      setIsGrading(false);
    }
  }, [currentCard, isGrading, currentIndex, cards.length, showToast]);

  // Handle hint request
  const handleHint = useCallback(() => {
    if (state !== 'show-front' || hintLevel >= 3) return;

    const nextLevel = hintLevel + 1;
    const cost = HINT_COSTS[hintLevel];
    const currentXP = getTotalXP();

    if (currentXP < cost) {
      showToast(`Need ${cost} XP for hint (have ${currentXP})`);
      return;
    }

    addXP(-cost);
    setHintLevel(nextLevel);
    playHintSound();
    showToast(`Hint revealed! -${cost} XP`);
  }, [state, hintLevel, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when modal is open
      if (showCurve) return;

      if (state === 'show-front' && e.code === 'Space') {
        e.preventDefault();
        showAnswer();
      } else if (state === 'show-answer') {
        const gradeMap: Record<string, Grade> = {
          '1': 'again',
          '2': 'hard',
          '3': 'good',
          '4': 'easy',
        };
        if (gradeMap[e.key]) {
          e.preventDefault();
          handleGrade(gradeMap[e.key]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, showAnswer, handleGrade, currentCard, showCurve]);

  // Direction selection state
  if (state === 'select-direction') {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Review Session</h2>
          <button
            onClick={() => onNavigate('home')}
            className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
          >
            Back
          </button>
        </div>

        <div className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <h3 className={`font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            Choose Practice Direction
          </h3>

          <div className="space-y-3">
            {(Object.keys(DIRECTION_INFO) as ReviewDirection[]).map((dir) => {
              const info = DIRECTION_INFO[dir];
              const isSelected = direction === dir;

              return (
                <button
                  key={dir}
                  onClick={() => setDirection(dir)}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                      : isDark
                      ? 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{info.icon}</span>
                  <div className="text-left flex-1">
                    <p className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{info.label}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{info.description}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => handleSelectDirection(direction)}
          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors"
        >
          Start Review
        </button>
      </div>
    );
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="p-4 flex items-center justify-center min-h-[300px]">
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading cards...</p>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600 mb-4">Failed to load review session</p>
        <button
          onClick={() => onNavigate('home')}
          className="text-emerald-600 hover:underline"
        >
          Return home
        </button>
      </div>
    );
  }

  // Complete state
  if (state === 'complete') {
    return (
      <>
        <Confetti active={showSessionConfetti} onComplete={() => setShowSessionConfetti(false)} />
        <div className="p-4">
          {sessionStats ? (
            <SessionSummary
              stats={sessionStats}
              isDark={isDark}
              onClose={() => onNavigate('home')}
            />
          ) : (
            <div className="text-center">
              <div className={`rounded-xl shadow-sm p-8 mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <p className="text-5xl mb-4">🎉</p>
                <p className="text-2xl mb-2">All done!</p>
                <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>You've reviewed all due cards.</p>
              </div>
              <button
                onClick={() => onNavigate('home')}
                className="bg-emerald-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                Return Home
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  // Review state
  return (
    <div className="p-4">
      {/* XP Gain Animation */}
      {xpGainAmount > 0 && (
        <XPGainAnimation
          amount={xpGainAmount}
          onComplete={() => setXpGainAmount(0)}
        />
      )}

      {/* Progress */}
      <div className="mb-4 text-center">
        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`} aria-live="polite">
          {remaining} card{remaining !== 1 ? 's' : ''} remaining
        </p>
        <div
          className={`w-full rounded-full h-2 mt-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
          role="progressbar"
          aria-valuenow={currentIndex}
          aria-valuemin={0}
          aria-valuemax={cards.length}
          aria-label={`Review progress: ${currentIndex} of ${cards.length} cards completed`}
        >
          <div
            className="bg-emerald-600 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="card-flip-container mb-4">
        <div
          key={`${currentCard.id}-${state}`}
          className={`rounded-xl shadow-sm p-6 min-h-[200px] flex flex-col relative ${isDark ? 'bg-gray-800' : 'bg-white'} touch-pan-x touch-pan-y ${
            state === 'show-answer' ? 'card-flip' : 'card-enter'
          }`}
          {...swipeHandlers}
          style={{
            transform: swipeState.isSwiping
              ? `translate(${swipeState.offsetX * 0.3}px, ${swipeState.offsetY * 0.1}px) rotate(${swipeState.offsetX * 0.02}deg)`
              : undefined,
            transition: swipeState.isSwiping ? 'none' : 'transform 0.2s ease-out',
          }}
        >
        {/* Swipe feedback indicator */}
        {swipeFeedback && (
          <div
            className={`absolute inset-0 flex items-center justify-center rounded-xl pointer-events-none`}
            style={{ opacity: swipeFeedback.opacity * 0.8 }}
          >
            <span className={`text-4xl font-bold ${swipeFeedback.color}`}>
              {swipeFeedback.label}
            </span>
          </div>
        )}

        {/* Card type/direction indicator */}
        <div className="flex items-center gap-2 self-start mb-2">
          {currentCard.type === 'CLOZE' && (
            <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
              Cloze
            </div>
          )}
          {isCurrentCardReversed && !immersionMode && (
            <div className={`text-xs px-2 py-1 rounded ${isDark ? 'text-blue-400 bg-blue-900/30' : 'text-blue-600 bg-blue-50'}`}>
              EN → ES
            </div>
          )}
          {immersionMode && (
            <div className={`text-xs px-2 py-1 rounded ${isDark ? 'text-amber-400 bg-amber-900/30' : 'text-amber-600 bg-amber-50'}`}>
              Immersion
            </div>
          )}
        </div>

        {/* Front (question) */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {currentCard.type === 'CLOZE' && currentCard.clozeSentence ? (
            <p className="text-xl text-center">
              {renderClozeQuestion(currentCard.clozeSentence, currentCard.clozeWord || '', state === 'show-answer', isDark)}
            </p>
          ) : (
            <p className="text-2xl font-medium text-center">
              {/* In immersion mode, always show Spanish first */}
              {immersionMode
                ? currentCard.front
                : (isCurrentCardReversed ? currentCard.back : currentCard.front)}
            </p>
          )}

          {/* Hint display */}
          {state === 'show-front' && hintLevel > 0 && (
            <div className={`mt-4 text-center ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              <p className="text-xs uppercase tracking-wide mb-1">Hint</p>
              <p className="text-lg font-mono">
                {getHint(
                  isCurrentCardReversed ? currentCard.front : currentCard.back,
                  hintLevel
                )}
              </p>
            </div>
          )}
        </div>

        {/* Answer (when revealed) */}
        {state === 'show-answer' && (
          <div className="border-t pt-4 mt-4 answer-reveal">
            {currentCard.type === 'CLOZE' ? (
              <div className="text-center">
                <p className="text-xl text-emerald-600 font-medium">{currentCard.clozeWord}</p>
                {currentCard.back && !immersionMode && (
                  <p className="text-sm text-gray-500 mt-2">{currentCard.back}</p>
                )}
              </div>
            ) : (
              <p className={`text-xl text-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {isCurrentCardReversed
                  ? currentCard.front
                  : (immersionMode ? '...' : currentCard.back)}
              </p>
            )}

            {/* Speak button and chart button */}
            <div className="mt-4 flex items-center justify-center gap-4">
              {speechEnabled && hasSpanish && (
                <>
                  <button
                    onClick={() => speak(currentCard.type === 'CLOZE' ? (currentCard.clozeSentence || currentCard.front) : currentCard.front, slowMode)}
                    className="text-2xl hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded"
                    aria-label="Speak Spanish text aloud"
                  >
                    🔊
                  </button>
                  <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <input
                      type="checkbox"
                      checked={slowMode}
                      onChange={(e) => setSlowMode(e.target.checked)}
                      className="rounded focus:ring-emerald-500"
                      aria-label="Enable slow speech mode"
                    />
                    Slow
                  </label>
                </>
              )}
              <button
                onClick={() => setShowCurve(true)}
                className="text-2xl hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                aria-label="View retention curve"
                title="View retention curve"
              >
                📈
              </button>
            </div>
            {speechEnabled && !hasSpanish && (
              <p className={`mt-4 text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Spanish voices not available on this browser
              </p>
            )}

            {/* Example sentences if present */}
            {currentCard.exampleEs && (
              <div className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <p className="italic">{currentCard.exampleEs}</p>
                {currentCard.exampleEn && !immersionMode && (
                  <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>{currentCard.exampleEn}</p>
                )}
              </div>
            )}

            {/* Immersion mode indicator */}
            {immersionMode && (
              <p className={`mt-4 text-xs text-center ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                Immersion mode - English hidden
              </p>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Actions */}
      {state === 'show-front' ? (
        <div className="space-y-3">
          <button
            onClick={showAnswer}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            aria-label="Show Answer. Keyboard shortcut: Space"
          >
            Show Answer
            <span className="text-sm opacity-80 ml-2" aria-hidden="true">(Space)</span>
          </button>

          {/* Hint button */}
          {hintLevel < 3 && (
            <button
              onClick={handleHint}
              className={`w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                isDark
                  ? 'bg-gray-700 text-amber-400 hover:bg-gray-600'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
              aria-label={`Get hint for ${HINT_COSTS[hintLevel]} XP`}
            >
              <span>💡</span>
              <span>
                {hintLevel === 0 ? 'Need a hint?' : 'More help?'}
                <span className={`ml-2 text-sm ${isDark ? 'text-amber-500/70' : 'text-amber-600/70'}`}>
                  (-{HINT_COSTS[hintLevel]} XP)
                </span>
              </span>
            </button>
          )}
          {hintLevel === 3 && (
            <p className={`text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              All hints revealed
            </p>
          )}
        </div>
      ) : (
        <>
          <GradeButtons
            card={currentCard}
            onGrade={handleGrade}
            disabled={isGrading}
          />
          {/* Swipe hint for mobile */}
          <p className={`text-xs text-center mt-2 ${isDark ? 'text-gray-600' : 'text-gray-400'} sm:hidden`} aria-hidden="true">
            Swipe: ← Again · → Good · ↑ Easy · ↓ Hard
          </p>
        </>
      )}

      {/* Undo and Exit buttons */}
      <div className="flex gap-2 mt-4">
        {canUndoReview && currentIndex > 0 && (
          <button
            onClick={handleUndo}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors ${
              isDark
                ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <span>↩</span>
            <span>Undo ({undoTimeLeft}s)</span>
          </button>
        )}
        <button
          onClick={handleExit}
          className={`${canUndoReview && currentIndex > 0 ? 'flex-1' : 'w-full'} py-2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
        >
          End session
        </button>
      </div>

      {/* Daily goal celebration */}
      {showGoalCelebration && (
        <CelebrationModal
          title="Daily Goal Complete!"
          message="You've reached your daily review goal. Keep up the great work!"
          icon="🎯"
          onClose={() => setShowGoalCelebration(false)}
          isDark={isDark}
        />
      )}

      {/* Forgetting Curve modal */}
      {showCurve && currentCard && (
        <ForgettingCurve
          cardId={currentCard.id}
          onClose={() => setShowCurve(false)}
          isDark={isDark}
        />
      )}
    </div>
  );
}
