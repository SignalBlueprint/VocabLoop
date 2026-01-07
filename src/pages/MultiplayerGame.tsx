import { useState, useEffect, useRef, useCallback } from 'react';
import type { Page } from '../types';
import { useMultiplayer } from '../hooks/useMultiplayer';

interface MultiplayerGameProps {
  onNavigate: (page: Page) => void;
  isDark: boolean;
  showToast: (message: string) => void;
}

export function MultiplayerGame({ onNavigate, isDark, showToast }: MultiplayerGameProps) {
  const [answer, setAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    roomState,
    cards,
    currentCardIndex,
    timeRemaining,
    myScore,
    opponentScore,
    currentPlayer,
    opponent,
    lastAnswerResult,
    submitAnswer,
    leaveRoom,
    playerId,
  } = useMultiplayer();

  const currentCard = cards[currentCardIndex];

  // Focus input on card change
  useEffect(() => {
    if (currentCard && inputRef.current && !answerLocked) {
      inputRef.current.focus();
    }
  }, [currentCardIndex, answerLocked]);

  // Reset answer on new card
  useEffect(() => {
    setAnswer('');
    setShowFeedback(null);
    setAnswerLocked(false);
  }, [currentCardIndex]);

  // Handle answer result
  useEffect(() => {
    if (lastAnswerResult && lastAnswerResult.playerId === playerId) {
      setShowFeedback(lastAnswerResult.correct ? 'correct' : 'incorrect');
      if (lastAnswerResult.correct) {
        setAnswerLocked(true);
      }
      // Clear feedback after brief delay
      const timeout = setTimeout(() => {
        if (!lastAnswerResult.correct) {
          setShowFeedback(null);
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [lastAnswerResult, playerId]);

  // Navigate to results when game ends
  useEffect(() => {
    if (roomState === 'FINISHED') {
      onNavigate('multiplayer-results');
    }
  }, [roomState, onNavigate]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || answerLocked) return;
    submitAnswer(answer.trim());
    setAnswer('');
  }, [answer, answerLocked, submitAnswer]);

  const handleLeave = () => {
    leaveRoom();
    onNavigate('home');
    showToast('Left the game');
  };

  // Format time as M:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get progress bar color based on time
  const getTimeColor = () => {
    if (timeRemaining <= 10) return 'bg-red-500';
    if (timeRemaining <= 20) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  if (!currentCard) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex flex-col`}>
      {/* Header */}
      <div className={`p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        {/* Timer bar */}
        <div className="mb-3">
          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className={`h-full transition-all duration-1000 ${getTimeColor()}`}
              style={{ width: `${(timeRemaining / 60) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className={`text-sm font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {formatTime(timeRemaining)}
            </span>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Card {currentCardIndex + 1}/{cards.length}
            </span>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="flex items-center justify-between">
          {/* My score */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-medium">
              {currentPlayer?.name?.charAt(0)?.toUpperCase() || 'Y'}
            </div>
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {currentPlayer?.name || 'You'}
              </p>
              <p className="text-lg font-bold text-emerald-500">{myScore}</p>
            </div>
          </div>

          {/* VS */}
          <div className={`text-xl font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            VS
          </div>

          {/* Opponent score */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {opponent?.name || 'Opponent'}
              </p>
              <p className="text-lg font-bold text-blue-500">{opponentScore}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
              {opponent?.name?.charAt(0)?.toUpperCase() || 'O'}
            </div>
          </div>
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Spanish word card */}
        <div
          className={`w-full max-w-md rounded-2xl p-8 mb-6 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          } shadow-lg`}
        >
          <p className={`text-sm font-medium mb-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Translate to English:
          </p>
          <p className={`text-3xl font-bold text-center ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            {currentCard.spanish}
          </p>
        </div>

        {/* Answer input */}
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              disabled={answerLocked}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className={`w-full px-4 py-4 rounded-xl text-lg border-2 outline-none transition-colors ${
                showFeedback === 'correct'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : showFeedback === 'incorrect'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : answerLocked
                      ? isDark
                        ? 'border-gray-600 bg-gray-700 text-gray-400'
                        : 'border-gray-300 bg-gray-100 text-gray-500'
                      : isDark
                        ? 'border-gray-600 bg-gray-800 text-gray-100 focus:border-emerald-500'
                        : 'border-gray-300 bg-white text-gray-900 focus:border-emerald-500'
              }`}
            />
            {showFeedback && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {showFeedback === 'correct' ? (
                  <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!answer.trim() || answerLocked}
            className={`w-full mt-4 py-4 rounded-xl font-medium text-lg transition-colors ${
              !answer.trim() || answerLocked
                ? isDark
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            {answerLocked ? 'Answered!' : 'Submit'}
          </button>
        </form>

        {/* Feedback message */}
        {lastAnswerResult && lastAnswerResult.playerId === playerId && (
          <div className={`mt-4 text-center ${lastAnswerResult.correct ? 'text-emerald-500' : 'text-red-500'}`}>
            {lastAnswerResult.correct ? (
              <p className="font-medium">+{lastAnswerResult.points} point{lastAnswerResult.points !== 1 ? 's' : ''}!</p>
            ) : (
              <p className="text-sm">Try again!</p>
            )}
          </div>
        )}

        {/* Show correct answer if locked and opponent got it */}
        {answerLocked && lastAnswerResult && lastAnswerResult.playerId !== playerId && (
          <div className={`mt-4 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <p className="text-sm">Correct: {lastAnswerResult.correctAnswer}</p>
          </div>
        )}
      </div>

      {/* Leave button */}
      <div className="p-4">
        <button
          onClick={handleLeave}
          className={`w-full py-2 rounded-lg text-sm transition-colors ${
            isDark
              ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          Leave Game
        </button>
      </div>
    </div>
  );
}
