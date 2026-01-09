/**
 * Word Highlight Component
 *
 * Highlights vocabulary words within text content.
 */

import { useState, useCallback } from 'react';
import type { HighlightConfig, VocabWord, WidgetTheme } from '../types';
import { getAPIClient } from '../utils/api';
import { eventEmitter } from '../utils/events';

interface WordHighlightProps {
  config: Omit<HighlightConfig, 'container'>;
  children: string;
}

const defaultTheme: WidgetTheme = {
  primaryColor: '#10b981',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  borderRadius: 8,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

interface HighlightedWord {
  word: string;
  start: number;
  end: number;
  vocabWord?: VocabWord;
}

export function WordHighlight({ config, children }: WordHighlightProps) {
  const {
    style = 'underline',
    clickAction = 'popup',
    theme: customTheme,
  } = config;

  const theme = { ...defaultTheme, ...customTheme };

  const [vocabulary, setVocabulary] = useState<VocabWord[]>([]);
  const [selectedWord, setSelectedWord] = useState<HighlightedWord | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load vocabulary on mount
  useState(() => {
    const loadVocabulary = async () => {
      const api = getAPIClient();
      if (!api.isAuthenticated()) {
        setLoaded(true);
        return;
      }

      try {
        const result = await api.getVocabulary();
        if (result.success && result.data) {
          setVocabulary(result.data);
        }
      } catch (error) {
        console.error('Failed to load vocabulary:', error);
      } finally {
        setLoaded(true);
      }
    };

    loadVocabulary();
  });

  // Find vocabulary words in the text
  const findHighlightedWords = useCallback((): HighlightedWord[] => {
    if (!loaded || vocabulary.length === 0) return [];

    const words: HighlightedWord[] = [];
    const text = children.toLowerCase();

    for (const vocabWord of vocabulary) {
      const wordLower = vocabWord.word.toLowerCase();
      let index = 0;

      while ((index = text.indexOf(wordLower, index)) !== -1) {
        // Check word boundaries
        const before = index === 0 || /\W/.test(text[index - 1]);
        const after = index + wordLower.length >= text.length || /\W/.test(text[index + wordLower.length]);

        if (before && after) {
          words.push({
            word: children.slice(index, index + wordLower.length),
            start: index,
            end: index + wordLower.length,
            vocabWord,
          });
        }
        index += wordLower.length;
      }
    }

    // Sort by position and remove overlaps
    words.sort((a, b) => a.start - b.start);
    const filtered: HighlightedWord[] = [];
    let lastEnd = 0;

    for (const word of words) {
      if (word.start >= lastEnd) {
        filtered.push(word);
        lastEnd = word.end;
      }
    }

    return filtered;
  }, [children, vocabulary, loaded]);

  const handleWordClick = (word: HighlightedWord, event: React.MouseEvent) => {
    if (clickAction === 'popup') {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      setPopupPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
      setSelectedWord(word);
    } else if (clickAction === 'add' && word.vocabWord) {
      eventEmitter.emit('word-added', {
        word: word.vocabWord.word,
        translation: word.vocabWord.translation,
      });
    }
  };

  const closePopup = () => {
    setSelectedWord(null);
    setPopupPosition(null);
  };

  const highlightedWords = findHighlightedWords();

  // Build rendered content
  const renderContent = () => {
    if (highlightedWords.length === 0) {
      return children;
    }

    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;

    for (const hw of highlightedWords) {
      // Add text before highlight
      if (hw.start > lastIndex) {
        parts.push(children.slice(lastIndex, hw.start));
      }

      // Add highlighted word
      const highlightStyle: React.CSSProperties = {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      };

      if (style === 'underline') {
        highlightStyle.textDecoration = 'underline';
        highlightStyle.textDecorationColor = theme.primaryColor;
        highlightStyle.textUnderlineOffset = '2px';
      } else if (style === 'background') {
        highlightStyle.backgroundColor = `${theme.primaryColor}20`;
        highlightStyle.borderRadius = 2;
        highlightStyle.padding = '0 2px';
      } else if (style === 'bold') {
        highlightStyle.fontWeight = 600;
        highlightStyle.color = theme.primaryColor;
      }

      parts.push(
        <span
          key={`${hw.start}-${hw.word}`}
          style={highlightStyle}
          onClick={(e) => handleWordClick(hw, e)}
          onMouseEnter={(e) => {
            if (style === 'underline') {
              (e.target as HTMLElement).style.textDecorationThickness = '2px';
            } else if (style === 'background') {
              (e.target as HTMLElement).style.backgroundColor = `${theme.primaryColor}40`;
            }
          }}
          onMouseLeave={(e) => {
            if (style === 'underline') {
              (e.target as HTMLElement).style.textDecorationThickness = '1px';
            } else if (style === 'background') {
              (e.target as HTMLElement).style.backgroundColor = `${theme.primaryColor}20`;
            }
          }}
        >
          {hw.word}
        </span>
      );

      lastIndex = hw.end;
    }

    // Add remaining text
    if (lastIndex < children.length) {
      parts.push(children.slice(lastIndex));
    }

    return parts;
  };

  return (
    <>
      <span style={{ fontFamily: theme.fontFamily }}>{renderContent()}</span>

      {/* Popup */}
      {selectedWord && popupPosition && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
            }}
            onClick={closePopup}
          />

          {/* Popup card */}
          <div
            style={{
              position: 'fixed',
              left: popupPosition.x,
              top: popupPosition.y,
              transform: 'translateX(-50%)',
              zIndex: 9999,
              padding: 16,
              borderRadius: theme.borderRadius,
              backgroundColor: theme.backgroundColor,
              color: theme.textColor,
              fontFamily: theme.fontFamily,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb',
              minWidth: 200,
              maxWidth: 300,
            }}
          >
            {selectedWord.vocabWord ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                  {selectedWord.vocabWord.word}
                </div>
                {selectedWord.vocabWord.translation && (
                  <div style={{ fontSize: 14, color: theme.primaryColor, marginBottom: 8 }}>
                    {selectedWord.vocabWord.translation}
                  </div>
                )}
                {selectedWord.vocabWord.context && (
                  <div style={{ fontSize: 12, opacity: 0.7, fontStyle: 'italic' }}>
                    "{selectedWord.vocabWord.context}"
                  </div>
                )}
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor:
                        selectedWord.vocabWord.grade >= 4
                          ? '#dcfce7'
                          : selectedWord.vocabWord.grade >= 2
                          ? '#fef3c7'
                          : '#fee2e2',
                      color:
                        selectedWord.vocabWord.grade >= 4
                          ? '#166534'
                          : selectedWord.vocabWord.grade >= 2
                          ? '#92400e'
                          : '#991b1b',
                    }}
                  >
                    {selectedWord.vocabWord.grade >= 4
                      ? 'Mastered'
                      : selectedWord.vocabWord.grade >= 2
                      ? 'Learning'
                      : 'New'}
                  </span>
                  <span style={{ opacity: 0.5 }}>
                    Reviewed {selectedWord.vocabWord.reviewCount}x
                  </span>
                </div>
              </>
            ) : (
              <div>Word not in vocabulary</div>
            )}
          </div>
        </>
      )}
    </>
  );
}
