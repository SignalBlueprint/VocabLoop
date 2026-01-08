import { useState, useEffect, useCallback, useRef } from 'react';
import type { Card, Grade, Page, SessionConfig, ReviewResult, SessionMode } from '../types';
import { getAllCards, updateCard } from '../db/cards';
import { getAllReviews, logReview } from '../db/reviews';
import { calculateSchedule, applySchedule } from '../scheduler';
import { GradeButtons } from '../components/GradeButtons';
import { Confetti } from '../components/Confetti';
import { SmartSessionSummary } from '../components/SmartSessionSummary';
import { XPGainAnimation } from '../components/XPGainAnimation';
import { speak, isSpeechSupported, initVoices, hasSpanishVoice } from '../utils/speech';
import { handleError } from '../utils/errors';
import { useSwipe } from '../hooks/useSwipe';
import { startStudySession, endStudySession, recordReview } from '../utils/studyTime';
import { awardReviewXP, XP_REWARDS, addXP } from '../utils/xp';
import { updateQuestProgress } from '../utils/dailyQuests';
import { playCorrectSound, playWrongSound, playFlipSound, resumeAudioContext } from '../utils/sounds';
import { incrementAchievementProgress } from '../utils/achievements';
import {
  createSessionState,
  updateSessionState,
  selectNextCard,
  calculateSessionStats,
  generateSessionInsights,
  analyzeSessionTagPerformance,
  SessionState,
  DEFAULT_WEIGHTS,
} from '../utils/curriculum';

// Helper to render cloze with blank or revealed word
function renderClozeQuestion(sentence: string, word: string, revealed: boolean, isDark: boolean): React.ReactNode {
  if (!word) return sentence;

  const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i');
  const parts = sentence.split(regex);

  if (parts.length === 1) {
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

interface SmartSessionProps {
  onNavigate: (page: Page) => void;
  showToast: (message: string) => void;
  isDark: boolean;
}

type SmartSessionState = 'configure' | 'loading' | 'show-front' | 'show-answer' | 'complete' | 'error';

const MODE_INFO: Record<SessionMode, { label: string; icon: string; description: string }> = {
  'smart': {
    label: 'Smart Mix',
    icon: '🧠',
    description: 'Adaptive mix of due cards, weak areas, and new cards',
  },
  'due-only': {
    label: 'Due Only',
    icon: '📋',
    description: 'Traditional SRS - only review due cards',
  },
  'tag-focus': {
    label: 'Tag Focus',
    icon: '🏷️',
    description: 'Focus on a specific topic/tag',
  },
};

export function SmartSession({ onNavigate, showToast, isDark }: SmartSessionProps) {
  // Configuration state
  const [config, setConfig] = useState<SessionConfig>({
    mode: 'smart',
    targetCards: 20,
    enableConfidenceRecovery: true,
  });
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Session state
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [state, setState] = useState<SmartSessionState>('configure');
  const [isGrading, setIsGrading] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [hasSpanish, setHasSpanish] = useState(true);
  const [slowMode, setSlowMode] = useState(false);
  const [showSessionConfetti, setShowSessionConfetti] = useState(false);
  const [xpGainAmount, setXpGainAmount] = useState(0);
  const [cardStartTime, setCardStartTime] = useState(0);

  // Summary data
  const [summaryData, setSummaryData] = useState<{
    stats: ReturnType<typeof calculateSessionStats>;
    insights: string[];
    tagPerformance: ReturnType<typeof analyzeSessionTagPerformance>;
    startTime: number;
    endTime: number;
  } | null>(null);

  // Session tracking refs
  const sessionStartTime = useRef<number>(0);
  const sessionXP = useRef<number>(0);
  const sessionGrades = useRef<Record<Grade, number>>({ again: 0, hard: 0, good: 0, easy: 0 });

  // Swipe gestures
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

  // Get swipe feedback
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

  // Initialize speech
  useEffect(() => {
    initVoices().then(() => {
      setSpeechEnabled(isSpeechSupported());
      setHasSpanish(hasSpanishVoice());
    });
  }, []);

  // Load available tags for configuration
  useEffect(() => {
    const loadTags = async () => {
      try {
        const cards = await getAllCards();
        const tags = new Set<string>();
        cards.forEach((c) => c.tags.forEach((t) => tags.add(t)));
        setAvailableTags(Array.from(tags).sort());
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    };
    loadTags();
  }, []);

  // Start the session
  const startSession = useCallback(async () => {
    resumeAudioContext();
    setState('loading');

    try {
      const [cards, reviews] = await Promise.all([getAllCards(), getAllReviews()]);

      if (cards.length === 0) {
        showToast('No cards available. Add some cards first!');
        setState('configure');
        return;
      }

      // Create session state with curriculum engine
      const newSessionState = createSessionState(config, cards, reviews);
      setSessionState(newSessionState);

      // Get first card
      const firstCard = selectNextCard(newSessionState);
      if (!firstCard) {
        showToast('No cards match your criteria.');
        setState('configure');
        return;
      }

      setCurrentCard(firstCard);
      setState('show-front');
      setCardStartTime(Date.now());

      // Start tracking
      startStudySession();
      sessionStartTime.current = Date.now();
      sessionXP.current = 0;
      sessionGrades.current = { again: 0, hard: 0, good: 0, easy: 0 };
    } catch (error) {
      showToast(handleError(error, 'start-session'));
      setState('error');
    }
  }, [config, showToast]);

  const showAnswer = useCallback(() => {
    if (state === 'show-front') {
      playFlipSound();
      setState('show-answer');
    }
  }, [state]);

  const handleExit = useCallback(() => {
    if (state === 'show-front' || state === 'show-answer') {
      endStudySession();
    }
    onNavigate('home');
  }, [state, onNavigate]);

  const handleGrade = useCallback(async (grade: Grade) => {
    if (!currentCard || !sessionState || isGrading) return;

    setIsGrading(true);

    // Play sound feedback
    if (grade === 'good' || grade === 'easy') {
      playCorrectSound();
    } else if (grade === 'again') {
      playWrongSound();
    }

    try {
      // Calculate new schedule
      const result = calculateSchedule(currentCard, grade);
      const updatedCard = applySchedule(currentCard, result);

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

      // Record for study time
      recordReview();

      // Award XP
      const xpResult = awardReviewXP(grade);
      sessionXP.current += xpResult.xpEarned;
      sessionGrades.current[grade]++;

      if (xpResult.xpEarned > 0) {
        setXpGainAmount(xpResult.xpEarned);
      }

      // Track achievements
      incrementAchievementProgress('totalReviews', 1);
      incrementAchievementProgress('cardsReviewedInOneDay', 1);

      // Update quests
      updateQuestProgress('reviews', 1);
      if (grade === 'good' || grade === 'easy') {
        updateQuestProgress('perfect_reviews', 1);
      }
      updateQuestProgress('streak_maintain', 1);

      // Create review result for curriculum tracking
      const reviewResult: ReviewResult = {
        cardId: currentCard.id,
        grade,
        timeMs: Date.now() - cardStartTime,
        wasRecoveryCard: sessionState.consecutiveFailures >= 2,
      };

      // Update session state with curriculum engine
      const newSessionState = updateSessionState(sessionState, reviewResult);
      setSessionState(newSessionState);

      // Check if session is complete
      if (newSessionState.reviewedInSession.size >= config.targetCards) {
        // End session
        endStudySession();

        // Check for perfect session bonus
        const isPerfect = sessionGrades.current.again === 0 && sessionGrades.current.hard === 0;
        if (isPerfect && newSessionState.sessionResults.length >= 5) {
          addXP(XP_REWARDS.PERFECT_SESSION);
          sessionXP.current += XP_REWARDS.PERFECT_SESSION;
          incrementAchievementProgress('perfectSessions', 1);
        }

        // Generate summary
        const stats = calculateSessionStats(newSessionState.sessionResults);
        const insights = generateSessionInsights(
          newSessionState.sessionResults,
          newSessionState.allCards,
          newSessionState.weakTags
        );
        const tagPerformance = analyzeSessionTagPerformance(
          newSessionState.sessionResults,
          newSessionState.allCards
        );

        setSummaryData({
          stats: { ...stats, recoveryCardsUsed: stats.recoveryCardsUsed },
          insights,
          tagPerformance,
          startTime: sessionStartTime.current,
          endTime: Date.now(),
        });

        setState('complete');
        setShowSessionConfetti(true);
      } else {
        // Get next card from curriculum engine
        const nextCard = selectNextCard(newSessionState);
        if (nextCard) {
          setCurrentCard(nextCard);
          setState('show-front');
          setCardStartTime(Date.now());
        } else {
          // No more cards available
          endStudySession();

          const stats = calculateSessionStats(newSessionState.sessionResults);
          const insights = generateSessionInsights(
            newSessionState.sessionResults,
            newSessionState.allCards,
            newSessionState.weakTags
          );
          const tagPerformance = analyzeSessionTagPerformance(
            newSessionState.sessionResults,
            newSessionState.allCards
          );

          setSummaryData({
            stats,
            insights,
            tagPerformance,
            startTime: sessionStartTime.current,
            endTime: Date.now(),
          });

          setState('complete');
          setShowSessionConfetti(true);
        }
      }
    } catch (error) {
      showToast(handleError(error, 'review'));
    } finally {
      setIsGrading(false);
    }
  }, [currentCard, sessionState, isGrading, cardStartTime, config.targetCards, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [state, showAnswer, handleGrade]);

  // Configuration screen
  if (state === 'configure') {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Smart Session</h2>
          <button
            onClick={() => onNavigate('home')}
            className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
          >
            Back
          </button>
        </div>

        {/* Mode selection */}
        <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <h3 className={`font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            Session Mode
          </h3>
          <div className="space-y-3">
            {(Object.keys(MODE_INFO) as SessionMode[]).map((mode) => {
              const info = MODE_INFO[mode];
              const isSelected = config.mode === mode;

              return (
                <button
                  key={mode}
                  onClick={() => setConfig({ ...config, mode, tagFocus: undefined })}
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

          {/* Tag selector for tag-focus mode */}
          {config.mode === 'tag-focus' && (
            <div className="mt-4">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Tag to Focus On
              </label>
              {availableTags.length > 0 ? (
                <select
                  value={config.tagFocus || ''}
                  onChange={(e) => setConfig({ ...config, tagFocus: e.target.value })}
                  className={`w-full p-3 rounded-lg border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">Select a tag...</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              ) : (
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  No tags available. Add tags to your cards first.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Card count slider */}
        <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <h3 className={`font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            Session Length
          </h3>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={config.targetCards}
              onChange={(e) => setConfig({ ...config, targetCards: parseInt(e.target.value) })}
              className="flex-1"
            />
            <span className={`font-bold text-lg min-w-[3rem] text-center ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {config.targetCards}
            </span>
          </div>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Number of cards to review in this session
          </p>
        </div>

        {/* Confidence recovery toggle */}
        <div className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableConfidenceRecovery !== false}
              onChange={(e) => setConfig({ ...config, enableConfidenceRecovery: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div className="flex-1">
              <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                Confidence Recovery
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Insert easier cards after consecutive failures
              </p>
            </div>
          </label>
        </div>

        {/* Start button */}
        <button
          onClick={startSession}
          disabled={config.mode === 'tag-focus' && !config.tagFocus}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${
            config.mode === 'tag-focus' && !config.tagFocus
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          Start Smart Session
        </button>

        {/* Info about smart mode */}
        {config.mode === 'smart' && (
          <p className={`text-xs text-center mt-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Smart mix: {DEFAULT_WEIGHTS.due}% due cards, {DEFAULT_WEIGHTS.weakTag}% weak areas, {DEFAULT_WEIGHTS.new}% new cards
          </p>
        )}
      </div>
    );
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="p-4 flex items-center justify-center min-h-[300px]">
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Preparing smart session...</p>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600 mb-4">Failed to start session</p>
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
  if (state === 'complete' && summaryData) {
    return (
      <>
        <Confetti active={showSessionConfetti} onComplete={() => setShowSessionConfetti(false)} />
        <div className="p-4">
          <SmartSessionSummary
            stats={summaryData.stats}
            insights={summaryData.insights}
            tagPerformance={summaryData.tagPerformance}
            startTime={summaryData.startTime}
            endTime={summaryData.endTime}
            xpEarned={sessionXP.current}
            isDark={isDark}
            onClose={() => onNavigate('home')}
          />
        </div>
      </>
    );
  }

  // Review state
  const progress = sessionState ? sessionState.reviewedInSession.size : 0;
  const total = config.targetCards;
  const remaining = total - progress;

  // Check if current card is a recovery card
  const isRecoveryCard = sessionState && sessionState.consecutiveFailures >= 2;

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
        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {remaining} card{remaining !== 1 ? 's' : ''} remaining
          {isRecoveryCard && (
            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
              Confidence Boost
            </span>
          )}
        </p>
        <div
          className={`w-full rounded-full h-2 mt-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
        >
          <div
            className="bg-emerald-600 h-2 rounded-full transition-all"
            style={{ width: `${(progress / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      {currentCard && (
        <div className="card-flip-container mb-4">
          <div
            className={`rounded-xl shadow-sm p-6 min-h-[200px] flex flex-col relative ${isDark ? 'bg-gray-800' : 'bg-white'} ${
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
            {/* Swipe feedback */}
            {swipeFeedback && (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-xl pointer-events-none"
                style={{ opacity: swipeFeedback.opacity * 0.8 }}
              >
                <span className={`text-4xl font-bold ${swipeFeedback.color}`}>
                  {swipeFeedback.label}
                </span>
              </div>
            )}

            {/* Card type indicator */}
            <div className="flex items-center gap-2 self-start mb-2">
              {currentCard.type === 'CLOZE' && (
                <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                  Cloze
                </div>
              )}
              {config.mode === 'smart' && (
                <div className={`text-xs px-2 py-1 rounded ${isDark ? 'text-emerald-400 bg-emerald-900/30' : 'text-emerald-600 bg-emerald-50'}`}>
                  Smart
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
                  {currentCard.front}
                </p>
              )}
            </div>

            {/* Answer */}
            {state === 'show-answer' && (
              <div className="border-t pt-4 mt-4 answer-reveal">
                {currentCard.type === 'CLOZE' ? (
                  <div className="text-center">
                    <p className="text-xl text-emerald-600 font-medium">{currentCard.clozeWord}</p>
                    {currentCard.back && (
                      <p className="text-sm text-gray-500 mt-2">{currentCard.back}</p>
                    )}
                  </div>
                ) : (
                  <p className={`text-xl text-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {currentCard.back}
                  </p>
                )}

                {/* Speak button */}
                {speechEnabled && hasSpanish && (
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <button
                      onClick={() => speak(currentCard.type === 'CLOZE' ? (currentCard.clozeSentence || currentCard.front) : currentCard.front, slowMode)}
                      className="text-2xl hover:scale-110 transition-transform"
                    >
                      🔊
                    </button>
                    <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <input
                        type="checkbox"
                        checked={slowMode}
                        onChange={(e) => setSlowMode(e.target.checked)}
                        className="rounded"
                      />
                      Slow
                    </label>
                  </div>
                )}

                {/* Example sentences */}
                {currentCard.exampleEs && (
                  <div className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <p className="italic">{currentCard.exampleEs}</p>
                    {currentCard.exampleEn && (
                      <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>{currentCard.exampleEn}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {state === 'show-front' ? (
        <button
          onClick={showAnswer}
          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors"
        >
          Show Answer
          <span className="text-sm opacity-80 ml-2">(Space)</span>
        </button>
      ) : (
        <>
          <GradeButtons
            card={currentCard!}
            onGrade={handleGrade}
            disabled={isGrading}
          />
          <p className={`text-xs text-center mt-2 ${isDark ? 'text-gray-600' : 'text-gray-400'} sm:hidden`}>
            Swipe: ← Again · → Good · ↑ Easy · ↓ Hard
          </p>
        </>
      )}

      {/* Exit button */}
      <button
        onClick={handleExit}
        className={`w-full mt-4 py-2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
      >
        End session
      </button>
    </div>
  );
}
