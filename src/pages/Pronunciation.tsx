import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Card, Page } from '../types';
import { getAllCards } from '../db/cards';
import { PronunciationCard } from '../components/PronunciationCard';
import { isSpeechRecognitionSupported, type PronunciationResult } from '../utils/speechRecognition';

interface PronunciationPageProps {
  onNavigate: (page: Page) => void;
  showToast: (message: string) => void;
  isDark: boolean;
}

interface SessionResult {
  cardId: string;
  word: string;
  attempts: number;
  passed: boolean;
  bestSimilarity: number;
}

type SessionState = 'setup' | 'practicing' | 'complete';

/**
 * Pronunciation practice page
 */
export function Pronunciation({
  onNavigate,
  showToast,
  isDark,
}: PronunciationPageProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>('setup');
  const [sessionSize, setSessionSize] = useState(10);
  const [currentAttempts, setCurrentAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const isSupported = isSpeechRecognitionSupported();

  // Load cards on mount
  useEffect(() => {
    const loadCardsData = async () => {
      setIsLoading(true);
      try {
        const allCards = await getAllCards();
        // Filter to BASIC and VERB cards only (single words)
        const eligibleCards = allCards.filter(
          (card) => card.type !== 'CLOZE' && !card.front.includes(' ')
        );
        setCards(eligibleCards);
      } catch (error) {
        console.error('Failed to load cards:', error);
        showToast('Failed to load cards');
      } finally {
        setIsLoading(false);
      }
    };
    loadCardsData();
  }, [showToast]);

  // Current card
  const currentCard = sessionCards[currentIndex] || null;

  // Score calculation
  const score = useMemo(() => {
    const passed = sessionResults.filter((r) => r.passed).length;
    return {
      passed,
      total: sessionResults.length,
      percentage: sessionResults.length > 0
        ? Math.round((passed / sessionResults.length) * 100)
        : 0,
    };
  }, [sessionResults]);

  // Start a new session
  const startSession = useCallback(() => {
    if (cards.length === 0) {
      showToast('No cards available for practice');
      return;
    }

    // Shuffle and select cards
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(sessionSize, shuffled.length));

    setSessionCards(selected);
    setCurrentIndex(0);
    setSessionResults([]);
    setCurrentAttempts(0);
    setSessionState('practicing');
  }, [cards, sessionSize, showToast]);

  // Handle pronunciation result
  const handleResult = useCallback(
    (result: PronunciationResult) => {
      if (!currentCard) return;

      setCurrentAttempts((prev) => prev + 1);

      // If passed, record result and move on
      if (result.match) {
        setSessionResults((prev) => [
          ...prev,
          {
            cardId: currentCard.id,
            word: currentCard.front,
            attempts: currentAttempts + 1,
            passed: true,
            bestSimilarity: result.similarity,
          },
        ]);

        // Check if session is complete
        if (currentIndex + 1 >= sessionCards.length) {
          setSessionState('complete');
          showToast('🎉 Session complete!');
        }
      }
    },
    [currentCard, currentIndex, sessionCards.length, currentAttempts, showToast]
  );

  // Skip current word (mark as failed)
  const handleSkip = useCallback(() => {
    if (!currentCard) return;

    setSessionResults((prev) => [
      ...prev,
      {
        cardId: currentCard.id,
        word: currentCard.front,
        attempts: currentAttempts,
        passed: false,
        bestSimilarity: 0,
      },
    ]);

    setCurrentAttempts(0);

    // Move to next card or complete session
    if (currentIndex + 1 >= sessionCards.length) {
      setSessionState('complete');
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentCard, currentIndex, sessionCards.length, currentAttempts]);

  // Move to next card after successful pronunciation
  const handleNext = useCallback(() => {
    setCurrentAttempts(0);
    if (currentIndex + 1 >= sessionCards.length) {
      setSessionState('complete');
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, sessionCards.length]);

  // Render setup screen
  const renderSetup = () => (
    <div className="max-w-md mx-auto p-4">
      <div className="text-center mb-8">
        <span className="text-6xl mb-4 block">🎤</span>
        <h1
          className={`text-2xl font-bold mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          Pronunciation Practice
        </h1>
        <p
          className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          Practice speaking Spanish words clearly
        </p>
      </div>

      {!isSupported ? (
        <div
          className={`rounded-xl p-6 text-center ${
            isDark ? 'bg-gray-800' : 'bg-gray-100'
          }`}
        >
          <span className="text-4xl mb-4 block">❌</span>
          <p
            className={`font-semibold mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            Not Supported
          </p>
          <p
            className={`text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Speech recognition requires Chrome or Edge browser.
            Firefox is not supported.
          </p>
          <button
            onClick={() => onNavigate('home')}
            className={`mt-4 px-6 py-2 rounded-full font-medium ${
              isDark
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Back to Home
          </button>
        </div>
      ) : cards.length === 0 && !isLoading ? (
        <div
          className={`rounded-xl p-6 text-center ${
            isDark ? 'bg-gray-800' : 'bg-gray-100'
          }`}
        >
          <span className="text-4xl mb-4 block">📚</span>
          <p
            className={`font-semibold mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            No Cards Available
          </p>
          <p
            className={`text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Add some vocabulary cards first to practice pronunciation.
          </p>
          <button
            onClick={() => onNavigate('add')}
            className={`mt-4 px-6 py-2 rounded-full font-medium ${
              isDark
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            Add Cards
          </button>
        </div>
      ) : (
        <div
          className={`rounded-xl p-6 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          } shadow-lg`}
        >
          {/* Session size slider */}
          <div className="mb-6">
            <label
              className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Words to Practice
            </label>
            <input
              type="range"
              min="5"
              max={Math.min(20, cards.length)}
              value={sessionSize}
              onChange={(e) => setSessionSize(parseInt(e.target.value))}
              className="w-full"
            />
            <div
              className={`text-center font-semibold mt-1 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              {sessionSize} words
            </div>
          </div>

          {/* How it works */}
          <div
            className={`rounded-lg p-4 mb-6 ${
              isDark ? 'bg-gray-700' : 'bg-gray-50'
            }`}
          >
            <h3
              className={`font-semibold mb-2 ${
                isDark ? 'text-gray-200' : 'text-gray-800'
              }`}
            >
              How it works
            </h3>
            <ol
              className={`text-sm space-y-1 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              <li>1. 👂 Listen to the native pronunciation</li>
              <li>2. 🎤 Record yourself saying the word</li>
              <li>3. ✅ Get instant feedback on accuracy</li>
            </ol>
          </div>

          {/* Start button */}
          <button
            onClick={startSession}
            disabled={isLoading || cards.length === 0}
            className={`w-full py-3 rounded-full font-medium transition-colors ${
              isDark
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? 'Loading...' : 'Start Practice'}
          </button>

          {/* Available cards count */}
          <p
            className={`text-center text-xs mt-3 ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            {cards.length} words available for practice
          </p>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => onNavigate('home')}
        className={`w-full mt-4 py-2 text-sm ${
          isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
        }`}
      >
        ← Back to Home
      </button>
    </div>
  );

  // Render practicing screen
  const renderPracticing = () => (
    <div className="max-w-md mx-auto p-4">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span
            className={`text-sm font-medium ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            Progress
          </span>
          <span
            className={`text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {currentIndex + 1} / {sessionCards.length}
          </span>
        </div>
        <div
          className={`h-2 rounded-full ${
            isDark ? 'bg-gray-700' : 'bg-gray-200'
          }`}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / sessionCards.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Current card */}
      {currentCard && (
        <PronunciationCard
          word={currentCard.front}
          translation={currentCard.back}
          onResult={handleResult}
          onSkip={handleNext}
          isDark={isDark}
        />
      )}

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className={`w-full mt-4 py-2 text-sm ${
          isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
        }`}
      >
        Skip this word →
      </button>

      {/* End session button */}
      <button
        onClick={() => setSessionState('complete')}
        className={`w-full mt-2 py-2 text-sm ${
          isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'
        }`}
      >
        End Session Early
      </button>
    </div>
  );

  // Render complete screen
  const renderComplete = () => (
    <div className="max-w-md mx-auto p-4">
      <div className="text-center mb-6">
        <span className="text-6xl mb-4 block">
          {score.percentage >= 80 ? '🎉' : score.percentage >= 50 ? '👍' : '💪'}
        </span>
        <h1
          className={`text-2xl font-bold mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          Session Complete!
        </h1>
        <p
          className={`text-lg ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          {score.passed} / {score.total} correct ({score.percentage}%)
        </p>
      </div>

      {/* Results breakdown */}
      <div
        className={`rounded-xl p-4 mb-6 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        } shadow-lg`}
      >
        <h3
          className={`font-semibold mb-3 ${
            isDark ? 'text-gray-200' : 'text-gray-800'
          }`}
        >
          Results
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {sessionResults.map((result, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-2 rounded-lg ${
                isDark ? 'bg-gray-700' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{result.passed ? '✅' : '❌'}</span>
                <span
                  className={`font-medium ${
                    isDark ? 'text-gray-200' : 'text-gray-800'
                  }`}
                >
                  {result.word}
                </span>
              </div>
              <span
                className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {result.attempts > 0
                  ? `${result.attempts} attempt${result.attempts > 1 ? 's' : ''}`
                  : 'skipped'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <button
          onClick={startSession}
          className={`w-full py-3 rounded-full font-medium ${
            isDark
              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          Practice Again
        </button>
        <button
          onClick={() => onNavigate('home')}
          className={`w-full py-3 rounded-full font-medium ${
            isDark
              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Back to Home
        </button>
      </div>

      {/* Encouragement */}
      <p
        className={`text-center text-sm mt-4 ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`}
      >
        {score.percentage >= 80
          ? '¡Excelente! Your pronunciation is great!'
          : score.percentage >= 50
          ? '¡Buen trabajo! Keep practicing to improve!'
          : "Don't give up! Regular practice makes perfect."}
      </p>
    </div>
  );

  // Main render
  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {sessionState === 'setup' && renderSetup()}
      {sessionState === 'practicing' && renderPracticing()}
      {sessionState === 'complete' && renderComplete()}
    </div>
  );
}
