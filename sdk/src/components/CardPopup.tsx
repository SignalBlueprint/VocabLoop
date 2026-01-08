/**
 * Card Popup Component
 *
 * Modal popup for displaying flashcard-style vocabulary cards.
 */

import { useState, useEffect, useCallback } from 'react';
import type { CardPopupConfig, VocabWord, WidgetTheme } from '../types';
import { getAPIClient } from '../utils/api';
import { eventEmitter } from '../utils/events';

interface CardPopupProps {
  config: Omit<CardPopupConfig, 'container'>;
  word: VocabWord;
  onClose: () => void;
}

const defaultTheme: WidgetTheme = {
  primaryColor: '#10b981',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  borderRadius: 12,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

export function CardPopup({ config, word, onClose }: CardPopupProps) {
  const {
    showExample = true,
    allowFlip = true,
    theme: customTheme,
  } = config;

  const theme = { ...defaultTheme, ...customTheme };

  const [isFlipped, setIsFlipped] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === ' ' && allowFlip) {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allowFlip, handleClose]);

  const handleReview = async (grade: 0 | 1 | 2 | 3 | 4 | 5) => {
    const api = getAPIClient();
    try {
      const result = await api.submitReview(word.id, grade);
      if (result.success) {
        eventEmitter.emit('review-complete', {
          wordsReviewed: 1,
          score: grade >= 3 ? 1 : 0,
          totalScore: 1,
        });
        handleClose();
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      eventEmitter.emit('error', {
        code: 'REVIEW_FAILED',
        message: 'Failed to submit review',
      });
    }
  };

  const gradeLabels = ['Again', 'Hard', 'Good', 'Easy'];
  const gradeColors = ['#ef4444', '#f59e0b', '#10b981', '#06b6d4'];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        opacity: isClosing ? 0 : 1,
        transition: 'opacity 0.2s ease',
        fontFamily: theme.fontFamily,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: '90%',
          maxWidth: 400,
          backgroundColor: theme.backgroundColor,
          borderRadius: theme.borderRadius,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
          transform: isClosing ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 0.2s ease',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: theme.primaryColor,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              V
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.textColor }}>
              VocabLoop
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.textColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card Content */}
        <div
          style={{
            padding: 32,
            minHeight: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: allowFlip ? 'pointer' : 'default',
            perspective: 1000,
          }}
          onClick={() => allowFlip && setIsFlipped(!isFlipped)}
        >
          <div
            style={{
              width: '100%',
              textAlign: 'center',
              transition: 'transform 0.5s ease',
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
            }}
          >
            {/* Front - Word */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                display: isFlipped ? 'none' : 'block',
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: theme.textColor,
                  marginBottom: 8,
                }}
              >
                {word.word}
              </div>
              {allowFlip && (
                <div style={{ fontSize: 14, color: '#9ca3af' }}>
                  Click or press Space to reveal
                </div>
              )}
            </div>

            {/* Back - Translation */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                display: isFlipped ? 'block' : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: theme.primaryColor,
                  marginBottom: 16,
                }}
              >
                {word.translation}
              </div>
              {showExample && word.context && (
                <div
                  style={{
                    fontSize: 14,
                    color: '#6b7280',
                    fontStyle: 'italic',
                    padding: '12px 16px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: 8,
                    maxWidth: 300,
                    margin: '0 auto',
                  }}
                >
                  "{word.context}"
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grade Buttons - Show when flipped */}
        {isFlipped && (
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: 8,
            }}
          >
            {gradeLabels.map((label, index) => (
              <button
                key={label}
                onClick={() => handleReview((index + 1) as 1 | 2 | 3 | 4)}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: `${gradeColors[index]}15`,
                  color: gradeColors[index],
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = gradeColors[index];
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = `${gradeColors[index]}15`;
                  e.currentTarget.style.color = gradeColors[index];
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#f9fafb',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#9ca3af',
          }}
        >
          <span>
            Reviewed {word.reviewCount} times
          </span>
          <span>
            Press Esc to close
          </span>
        </div>
      </div>
    </div>
  );
}

// Standalone function to show a card popup
export function showCardPopup(word: VocabWord, config?: Partial<CardPopupConfig>): void {
  const container = document.createElement('div');
  container.id = 'vocabloop-card-popup';
  document.body.appendChild(container);

  const cleanup = () => {
    container.remove();
  };

  // Dynamically import React and render
  import('react-dom/client').then(({ createRoot }) => {
    const root = createRoot(container);
    root.render(
      <CardPopup
        config={config || {}}
        word={word}
        onClose={() => {
          root.unmount();
          cleanup();
        }}
      />
    );
  });
}
