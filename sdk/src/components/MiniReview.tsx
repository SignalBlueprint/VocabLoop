/**
 * Mini Review Widget Component
 *
 * Compact review session that can be embedded anywhere.
 */

import { useState, useEffect, useCallback } from 'react';
import type { MiniReviewConfig, VocabWord, ReviewResults, WidgetTheme } from '../types';
import { getAPIClient } from '../utils/api';
import { eventEmitter } from '../utils/events';

interface MiniReviewProps {
  config: Omit<MiniReviewConfig, 'container'>;
}

const defaultTheme: WidgetTheme = {
  primaryColor: '#10b981',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  borderRadius: 12,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

export function MiniReview({ config }: MiniReviewProps) {
  const {
    size = 'medium',
    cardCount = 5,
    theme: customTheme,
    onComplete,
    onError,
  } = config;

  const theme = { ...defaultTheme, ...customTheme };

  const [state, setState] = useState<'loading' | 'ready' | 'reviewing' | 'complete'>('loading');
  const [cards, setCards] = useState<VocabWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<ReviewResults>({
    cardsReviewed: 0,
    correct: 0,
    incorrect: 0,
    timeSpentMs: 0,
  });
  const [startTime, setStartTime] = useState(0);
  const [cardStartTime, setCardStartTime] = useState(0);

  // Load cards on mount
  useEffect(() => {
    const loadCards = async () => {
      const api = getAPIClient();

      if (!api.isAuthenticated()) {
        setState('ready');
        return;
      }

      try {
        const loadedCards: VocabWord[] = [];
        for (let i = 0; i < cardCount; i++) {
          const result = await api.getRandomCard();
          if (result.success && result.data) {
            loadedCards.push(result.data);
          }
        }

        if (loadedCards.length > 0) {
          setCards(loadedCards);
          setState('ready');
        } else {
          onError?.(new Error('No cards available'));
          setState('ready');
        }
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Failed to load cards'));
        setState('ready');
      }
    };

    loadCards();
  }, [cardCount, onError]);

  const startReview = useCallback(() => {
    setState('reviewing');
    setStartTime(Date.now());
    setCardStartTime(Date.now());
  }, []);

  const handleReveal = useCallback(() => {
    setRevealed(true);
  }, []);

  const handleGrade = useCallback(
    async (grade: 'again' | 'hard' | 'good' | 'easy') => {
      const timeMs = Date.now() - cardStartTime;
      const isCorrect = grade !== 'again';

      // Update results
      setResults((prev) => ({
        ...prev,
        cardsReviewed: prev.cardsReviewed + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
        incorrect: prev.incorrect + (isCorrect ? 0 : 1),
        timeSpentMs: prev.timeSpentMs + timeMs,
      }));

      // Move to next card or complete
      if (currentIndex < cards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setRevealed(false);
        setCardStartTime(Date.now());
      } else {
        const finalResults: ReviewResults = {
          cardsReviewed: results.cardsReviewed + 1,
          correct: results.correct + (isCorrect ? 1 : 0),
          incorrect: results.incorrect + (isCorrect ? 0 : 1),
          timeSpentMs: Date.now() - startTime,
        };

        setState('complete');
        onComplete?.(finalResults);
        eventEmitter.emit('review-complete', finalResults);
      }
    },
    [currentIndex, cards.length, cardStartTime, results, startTime, onComplete]
  );

  const currentCard = cards[currentIndex];

  // Size-based styling
  const sizeStyles = {
    small: { width: 200, height: 150, fontSize: 14, padding: 12 },
    medium: { width: 300, height: 250, fontSize: 16, padding: 16 },
    large: { width: 400, height: 300, fontSize: 18, padding: 20 },
  };

  const styles = sizeStyles[size];

  const containerStyle: React.CSSProperties = {
    width: styles.width,
    height: styles.height,
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    borderRadius: theme.borderRadius,
    fontFamily: theme.fontFamily,
    fontSize: styles.fontSize,
    padding: styles.padding,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  // Loading state
  if (state === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Loading...
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!getAPIClient().isAuthenticated()) {
    return (
      <div style={containerStyle}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <p style={{ marginBottom: 12 }}>Connect your VocabLoop account to review</p>
          <a
            href="https://vocabloop.app/connect"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 16px',
              backgroundColor: theme.primaryColor,
              color: 'white',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Connect
          </a>
        </div>
      </div>
    );
  }

  // Ready state - show start button
  if (state === 'ready') {
    return (
      <div style={containerStyle}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ marginBottom: 12 }}>
            {cards.length} cards ready
          </p>
          <button
            onClick={startReview}
            style={{
              padding: '12px 24px',
              backgroundColor: theme.primaryColor,
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: styles.fontSize,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Start Review
          </button>
        </div>
      </div>
    );
  }

  // Complete state
  if (state === 'complete') {
    const accuracy = Math.round((results.correct / results.cardsReviewed) * 100);
    return (
      <div style={containerStyle}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: styles.fontSize * 1.5, fontWeight: 700, marginBottom: 8 }}>
            {accuracy}%
          </p>
          <p style={{ marginBottom: 4 }}>
            {results.correct}/{results.cardsReviewed} correct
          </p>
          <p style={{ fontSize: styles.fontSize * 0.85, opacity: 0.7 }}>
            {Math.round(results.timeSpentMs / 1000)}s
          </p>
        </div>
      </div>
    );
  }

  // Reviewing state
  return (
    <div style={containerStyle}>
      {/* Progress */}
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            height: 4,
            backgroundColor: '#e5e7eb',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${((currentIndex + 1) / cards.length) * 100}%`,
              height: '100%',
              backgroundColor: theme.primaryColor,
              transition: 'width 0.3s',
            }}
          />
        </div>
        <div style={{ fontSize: styles.fontSize * 0.75, opacity: 0.6, marginTop: 4 }}>
          {currentIndex + 1} / {cards.length}
        </div>
      </div>

      {/* Card */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: styles.fontSize * 1.3, fontWeight: 600, marginBottom: 12 }}>
          {currentCard?.word}
        </p>

        {revealed ? (
          <p style={{ fontSize: styles.fontSize, opacity: 0.8 }}>
            {currentCard?.english}
          </p>
        ) : (
          <button
            onClick={handleReveal}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: styles.fontSize * 0.9,
            }}
          >
            Show Answer
          </button>
        )}
      </div>

      {/* Grade buttons */}
      {revealed && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {(['again', 'hard', 'good', 'easy'] as const).map((grade) => {
            const colors = {
              again: '#ef4444',
              hard: '#f97316',
              good: '#22c55e',
              easy: '#3b82f6',
            };
            return (
              <button
                key={grade}
                onClick={() => handleGrade(grade)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  backgroundColor: colors[grade],
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: styles.fontSize * 0.8,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {grade}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
