import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Card, Grade, Page } from '../types';
import { getAllCards, updateCard } from '../db/cards';
import { logReview } from '../db/reviews';
import { calculateSchedule, applySchedule } from '../scheduler';
import { GradeButtons } from '../components/GradeButtons';
import { Confetti } from '../components/Confetti';
import { speak, isSpeechSupported, initVoices, hasSpanishVoice } from '../utils/speech';
import { playCorrectSound, playWrongSound, playFlipSound, resumeAudioContext } from '../utils/sounds';
import { awardReviewXP } from '../utils/xp';
import { incrementAchievementProgress } from '../utils/achievements';

interface CustomStudyProps {
  onNavigate: (page: Page) => void;
  showToast: (message: string) => void;
  isDark: boolean;
}

type StudyMode = 'setup' | 'studying' | 'complete';
type DifficultyFilter = 'all' | 'hard' | 'medium' | 'easy' | 'new';
type SortOption = 'random' | 'due-first' | 'hardest-first' | 'newest-first' | 'oldest-first';

interface StudyFilters {
  tags: string[];
  difficulty: DifficultyFilter;
  cardTypes: ('BASIC' | 'CLOZE' | 'VERB')[];
  maxCards: number;
  sort: SortOption;
  includeNotDue: boolean;
}

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

function getDifficultyLevel(card: Card): 'new' | 'hard' | 'medium' | 'easy' {
  if (card.reps === 0) return 'new';
  if (card.ease < 2.0 || card.lapses >= 3) return 'hard';
  if (card.ease >= 2.8 && card.intervalDays >= 21) return 'easy';
  return 'medium';
}

export function CustomStudy({ onNavigate, showToast, isDark }: CustomStudyProps) {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [studyCards, setStudyCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<StudyMode>('setup');
  const [isLoading, setIsLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [hasSpanish, setHasSpanish] = useState(true);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0, xp: 0 });

  const [filters, setFilters] = useState<StudyFilters>({
    tags: [],
    difficulty: 'all',
    cardTypes: ['BASIC', 'CLOZE', 'VERB'],
    maxCards: 20,
    sort: 'random',
    includeNotDue: true,
  });

  const currentCard = studyCards[currentIndex];

  // Get all unique tags from cards
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allCards.forEach(card => card.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [allCards]);

  // Preview of filtered cards
  const filteredPreview = useMemo(() => {
    let filtered = [...allCards];

    // Filter by tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter(card =>
        filters.tags.some(tag => card.tags.includes(tag))
      );
    }

    // Filter by difficulty
    if (filters.difficulty !== 'all') {
      filtered = filtered.filter(card => getDifficultyLevel(card) === filters.difficulty);
    }

    // Filter by card type
    filtered = filtered.filter(card => filters.cardTypes.includes(card.type));

    // Filter by due status
    if (!filters.includeNotDue) {
      const now = Date.now();
      filtered = filtered.filter(card => card.dueAt <= now);
    }

    return filtered;
  }, [allCards, filters]);

  useEffect(() => {
    loadCards();
    initVoices().then(() => {
      setSpeechEnabled(isSpeechSupported());
      setHasSpanish(hasSpanishVoice());
    });
  }, []);

  const loadCards = async () => {
    try {
      const cards = await getAllCards();
      setAllCards(cards);
    } catch (error) {
      console.error('Failed to load cards:', error);
      showToast('Failed to load cards');
    } finally {
      setIsLoading(false);
    }
  };

  const startStudySession = useCallback(() => {
    resumeAudioContext();
    let cards = [...filteredPreview];

    // Sort cards
    switch (filters.sort) {
      case 'random':
        cards.sort(() => Math.random() - 0.5);
        break;
      case 'due-first':
        cards.sort((a, b) => a.dueAt - b.dueAt);
        break;
      case 'hardest-first':
        cards.sort((a, b) => a.ease - b.ease);
        break;
      case 'newest-first':
        cards.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest-first':
        cards.sort((a, b) => a.createdAt - b.createdAt);
        break;
    }

    // Limit cards
    cards = cards.slice(0, filters.maxCards);

    if (cards.length === 0) {
      showToast('No cards match your filters');
      return;
    }

    setStudyCards(cards);
    setCurrentIndex(0);
    setShowAnswer(false);
    setSessionStats({ correct: 0, total: 0, xp: 0 });
    setMode('studying');
  }, [filteredPreview, filters, showToast]);

  const handleShowAnswer = useCallback(() => {
    playFlipSound();
    setShowAnswer(true);
  }, []);

  const handleGrade = useCallback(async (grade: Grade) => {
    if (!currentCard || isGrading) return;
    setIsGrading(true);

    // Play sound feedback
    if (grade === 'good' || grade === 'easy') {
      playCorrectSound();
    } else if (grade === 'again') {
      playWrongSound();
    }

    try {
      const result = calculateSchedule(currentCard, grade);
      const updatedCard = applySchedule(currentCard, result);
      await updateCard(updatedCard);

      await logReview(
        currentCard.id,
        grade,
        currentCard.intervalDays,
        result.newInterval,
        currentCard.dueAt,
        result.newDueAt
      );

      // Award XP and track stats
      const xpResult = awardReviewXP(grade);
      const isCorrect = grade === 'good' || grade === 'easy';

      setSessionStats(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
        xp: prev.xp + xpResult.xpEarned,
      }));

      // Track achievements
      incrementAchievementProgress('totalReviews', 1);

      // Move to next card
      if (currentIndex + 1 >= studyCards.length) {
        setMode('complete');
        if (sessionStats.correct + (isCorrect ? 1 : 0) >= studyCards.length * 0.8) {
          setShowConfetti(true);
        }
      } else {
        setCurrentIndex(i => i + 1);
        setShowAnswer(false);
      }
    } catch (error) {
      showToast('Failed to save review');
    } finally {
      setIsGrading(false);
    }
  }, [currentCard, isGrading, currentIndex, studyCards.length, sessionStats.correct, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'studying') return;

      if (!showAnswer && e.code === 'Space') {
        e.preventDefault();
        handleShowAnswer();
      } else if (showAnswer) {
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
  }, [mode, showAnswer, handleShowAnswer, handleGrade]);

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading...</p>
      </div>
    );
  }

  // Setup screen
  if (mode === 'setup') {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Custom Study</h2>
          <button
            onClick={() => onNavigate('home')}
            className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
          >
            Back
          </button>
        </div>

        <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="text-center mb-4">
            <span className="text-4xl">🎯</span>
            <h3 className="text-lg font-semibold mt-2">Build Your Session</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Customize what you want to study
            </p>
          </div>

          {/* Tags filter */}
          {allTags.length > 0 && (
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      setFilters(f => ({
                        ...f,
                        tags: f.tags.includes(tag)
                          ? f.tags.filter(t => t !== tag)
                          : [...f.tags, tag],
                      }));
                    }}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.tags.includes(tag)
                        ? 'bg-emerald-600 text-white'
                        : isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {filters.tags.length > 0 && (
                <button
                  onClick={() => setFilters(f => ({ ...f, tags: [] }))}
                  className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                >
                  Clear tags
                </button>
              )}
            </div>
          )}

          {/* Difficulty filter */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Difficulty
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'all', label: 'All', color: 'gray' },
                { value: 'new', label: 'New', color: 'blue' },
                { value: 'hard', label: 'Hard', color: 'red' },
                { value: 'medium', label: 'Medium', color: 'yellow' },
                { value: 'easy', label: 'Easy', color: 'green' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFilters(f => ({ ...f, difficulty: value }))}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    filters.difficulty === value
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

          {/* Card type filter */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Card Types
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'BASIC', label: 'Basic' },
                { value: 'CLOZE', label: 'Cloze' },
                { value: 'VERB', label: 'Verb' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    setFilters(f => ({
                      ...f,
                      cardTypes: f.cardTypes.includes(value)
                        ? f.cardTypes.filter(t => t !== value)
                        : [...f.cardTypes, value],
                    }));
                  }}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    filters.cardTypes.includes(value)
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

          {/* Sort option */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Sort By
            </label>
            <select
              value={filters.sort}
              onChange={(e) => setFilters(f => ({ ...f, sort: e.target.value as SortOption }))}
              className={`w-full p-2 rounded-lg border ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                  : 'bg-white border-gray-300 text-gray-700'
              }`}
            >
              <option value="random">Random</option>
              <option value="due-first">Due First</option>
              <option value="hardest-first">Hardest First</option>
              <option value="newest-first">Newest First</option>
              <option value="oldest-first">Oldest First</option>
            </select>
          </div>

          {/* Max cards slider */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Number of Cards: {filters.maxCards}
            </label>
            <input
              type="range"
              min="5"
              max={Math.min(100, filteredPreview.length || 100)}
              value={filters.maxCards}
              onChange={(e) => setFilters(f => ({ ...f, maxCards: parseInt(e.target.value) }))}
              className="w-full"
            />
            <div className={`flex justify-between text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <span>5</span>
              <span>{Math.min(100, filteredPreview.length || 100)}</span>
            </div>
          </div>

          {/* Include not due option */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.includeNotDue}
                onChange={(e) => setFilters(f => ({ ...f, includeNotDue: e.target.checked }))}
                className="rounded"
              />
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Include cards not yet due
              </span>
            </label>
          </div>
        </div>

        {/* Preview */}
        <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="flex items-center justify-between">
            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
              Cards matching filters:
            </span>
            <span className="text-2xl font-bold text-emerald-500">
              {filteredPreview.length}
            </span>
          </div>
          {filteredPreview.length > 0 && (
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Will study {Math.min(filters.maxCards, filteredPreview.length)} cards
            </p>
          )}
        </div>

        <button
          onClick={startStudySession}
          disabled={filteredPreview.length === 0}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${
            filteredPreview.length === 0
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          Start Session ({Math.min(filters.maxCards, filteredPreview.length)} cards)
        </button>
      </div>
    );
  }

  // Studying screen
  if (mode === 'studying' && currentCard) {
    const progress = ((currentIndex + 1) / studyCards.length) * 100;
    const difficulty = getDifficultyLevel(currentCard);

    return (
      <div className="p-4">
        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {currentIndex + 1} / {studyCards.length}
            </span>
            <span className={`text-xs px-2 py-1 rounded ${
              difficulty === 'new' ? 'bg-blue-100 text-blue-700' :
              difficulty === 'hard' ? 'bg-red-100 text-red-700' :
              difficulty === 'easy' ? 'bg-green-100 text-green-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </span>
          </div>
          <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className="h-2 rounded-full bg-emerald-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className={`rounded-xl p-6 mb-4 min-h-[200px] flex flex-col ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          {/* Tags */}
          {currentCard.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {currentCard.tags.map(tag => (
                <span
                  key={tag}
                  className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Question */}
          <div className="flex-1 flex items-center justify-center">
            {currentCard.type === 'CLOZE' && currentCard.clozeSentence ? (
              <p className="text-xl text-center">
                {renderClozeQuestion(currentCard.clozeSentence, currentCard.clozeWord || '', showAnswer, isDark)}
              </p>
            ) : (
              <p className="text-2xl font-medium text-center">{currentCard.front}</p>
            )}
          </div>

          {/* Answer */}
          {showAnswer && (
            <div className="border-t pt-4 mt-4">
              {currentCard.type === 'CLOZE' ? (
                <div className="text-center">
                  <p className="text-xl text-emerald-600 font-medium">{currentCard.clozeWord}</p>
                  {currentCard.back && (
                    <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{currentCard.back}</p>
                  )}
                </div>
              ) : (
                <p className={`text-xl text-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {currentCard.back}
                </p>
              )}

              {/* Speak button */}
              {speechEnabled && hasSpanish && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => speak(currentCard.type === 'CLOZE' ? (currentCard.clozeSentence || currentCard.front) : currentCard.front)}
                    className="text-2xl hover:scale-110 transition-transform"
                    aria-label="Speak"
                  >
                    🔊
                  </button>
                </div>
              )}

              {/* Example */}
              {currentCard.exampleEs && (
                <div className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <p className="italic">{currentCard.exampleEs}</p>
                  {currentCard.exampleEn && <p>{currentCard.exampleEn}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {!showAnswer ? (
          <button
            onClick={handleShowAnswer}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors"
          >
            Show Answer <span className="opacity-70">(Space)</span>
          </button>
        ) : (
          <GradeButtons card={currentCard} onGrade={handleGrade} disabled={isGrading} />
        )}

        {/* Exit */}
        <button
          onClick={() => setMode('setup')}
          className={`w-full mt-4 py-2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
        >
          End session
        </button>
      </div>
    );
  }

  // Complete screen
  if (mode === 'complete') {
    const accuracy = studyCards.length > 0 ? Math.round((sessionStats.correct / studyCards.length) * 100) : 0;

    return (
      <div className="p-4">
        <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Session Complete!</h2>
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
              color: accuracy >= 80 ? '#10b981' : accuracy >= 60 ? '#f59e0b' : '#ef4444'
            }}>
              {accuracy}%
            </p>
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              {sessionStats.correct} / {studyCards.length} correct
            </p>
          </div>

          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex justify-between">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>XP Earned</span>
              <span className="font-bold text-emerald-500">+{sessionStats.xp} XP</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={startStudySession}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors"
          >
            Study Again
          </button>
          <button
            onClick={() => setMode('setup')}
            className={`w-full py-3 rounded-xl font-medium transition-colors ${
              isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Change Filters
          </button>
        </div>
      </div>
    );
  }

  return null;
}
