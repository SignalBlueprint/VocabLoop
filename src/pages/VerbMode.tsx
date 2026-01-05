import { useState, useEffect, useCallback } from 'react';
import type { Page } from '../types';
import verbData from '../data/verbs.json';
import { speak, isSpeechSupported, initVoices, hasSpanishVoice } from '../utils/speech';
import { getVerbStats, recordVerbPractice } from '../utils/verbStreak';
import { ConjugationTable } from '../components/ConjugationTable';
import { updateQuestProgress } from '../utils/dailyQuests';

interface VerbModeProps {
  onNavigate: (page: Page) => void;
  showToast: (message: string) => void;
  isDark: boolean;
}

interface ConjugationQuestion {
  infinitive: string;
  english: string;
  pronoun: string;
  answer: string;
  tense: string;
  tenseName: string;
}

type TenseKey = 'present' | 'preterite' | 'future';
type VerbModeState = 'select-tenses' | 'loading' | 'show-question' | 'show-answer' | 'complete';

const QUESTIONS_PER_SESSION = 10;

const TENSE_INFO: Record<TenseKey, { name: string; difficulty: 'easy' | 'medium' | 'hard'; color: string }> = {
  present: { name: 'Present', difficulty: 'easy', color: 'emerald' },
  preterite: { name: 'Preterite (Past)', difficulty: 'medium', color: 'amber' },
  future: { name: 'Future', difficulty: 'hard', color: 'purple' },
};

export function VerbMode({ onNavigate, showToast, isDark }: VerbModeProps) {
  const [questions, setQuestions] = useState<ConjugationQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, setState] = useState<VerbModeState>('select-tenses');
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [hasSpanish, setHasSpanish] = useState(true);
  const [slowMode, setSlowMode] = useState(false);
  const [verbStreak, setVerbStreak] = useState(0);
  const [selectedTenses, setSelectedTenses] = useState<Set<TenseKey>>(new Set(['present']));
  const [showConjugationTable, setShowConjugationTable] = useState(false);

  const currentQuestion = questions[currentIndex];
  const remaining = questions.length - currentIndex;

  // Initialize speech and load streak
  useEffect(() => {
    initVoices().then(() => {
      setSpeechEnabled(isSpeechSupported());
      setHasSpanish(hasSpanishVoice());
    });

    // Load current verb streak
    const stats = getVerbStats();
    setVerbStreak(stats.streak);
  }, []);

  const toggleTense = (tense: TenseKey) => {
    const newTenses = new Set(selectedTenses);
    if (newTenses.has(tense)) {
      // Don't allow deselecting the last tense
      if (newTenses.size > 1) {
        newTenses.delete(tense);
      }
    } else {
      newTenses.add(tense);
    }
    setSelectedTenses(newTenses);
  };

  const startSession = () => {
    setState('loading');
    generateQuestions();
  };

  const generateQuestions = () => {
    const allQuestions: ConjugationQuestion[] = [];
    const tenseKeys = Array.from(selectedTenses);

    // Generate all possible questions for selected tenses
    for (const verb of verbData.verbs) {
      for (const tense of tenseKeys) {
        const conjugations = verb[tense as keyof typeof verb] as string[];
        if (!conjugations || !Array.isArray(conjugations)) continue;

        for (let i = 0; i < verbData.pronouns.length; i++) {
          allQuestions.push({
            infinitive: verb.infinitive,
            english: verb.english,
            pronoun: verbData.pronouns[i],
            answer: conjugations[i],
            tense,
            tenseName: TENSE_INFO[tense].name,
          });
        }
      }
    }

    // Shuffle and take first N
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    setQuestions(shuffled.slice(0, QUESTIONS_PER_SESSION));
    setState('show-question');
  };

  const showAnswer = useCallback(() => {
    if (state === 'show-question') {
      setState('show-answer');
    }
  }, [state]);

  const handleGrade = (correct: boolean) => {
    if (correct) {
      setScore(s => ({ ...s, correct: s.correct + 1 }));
    } else {
      setScore(s => ({ ...s, incorrect: s.incorrect + 1 }));
    }

    // Update daily quest progress for verb practice
    updateQuestProgress('verbs', 1);

    if (currentIndex + 1 >= questions.length) {
      // Record completed session and update streak
      const newStats = recordVerbPractice();
      setVerbStreak(newStats.streak);
      setState('complete');
      showToast('Verb practice complete!');
    } else {
      setCurrentIndex(currentIndex + 1);
      setState('show-question');
    }
  };

  const handleSpeak = () => {
    if (currentQuestion) {
      speak(currentQuestion.answer, slowMode);
    }
  };

  const restartSession = () => {
    setScore({ correct: 0, incorrect: 0 });
    setCurrentIndex(0);
    setState('select-tenses');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state === 'show-question' && e.code === 'Space') {
        e.preventDefault();
        showAnswer();
      } else if (state === 'show-answer') {
        if (e.key === '1' || e.key === 'x') {
          e.preventDefault();
          handleGrade(false);
        } else if (e.key === '2' || e.key === 'c') {
          e.preventDefault();
          handleGrade(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, showAnswer, currentQuestion]);

  // Tense selection screen
  if (state === 'select-tenses') {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Verb Conjugation</h2>
          <button
            onClick={() => onNavigate('home')}
            className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
          >
            Back
          </button>
        </div>

        <div className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <h3 className={`font-medium mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            Select Tenses to Practice
          </h3>

          <div className="space-y-3">
            {(Object.keys(TENSE_INFO) as TenseKey[]).map((tense) => {
              const info = TENSE_INFO[tense];
              const isSelected = selectedTenses.has(tense);
              const difficultyColors = {
                easy: isDark ? 'text-emerald-400' : 'text-emerald-600',
                medium: isDark ? 'text-amber-400' : 'text-amber-600',
                hard: isDark ? 'text-purple-400' : 'text-purple-600',
              };

              const borderClass = isSelected
                ? info.color === 'emerald'
                  ? 'border-emerald-500'
                  : info.color === 'amber'
                  ? 'border-amber-500'
                  : 'border-purple-500'
                : isDark
                ? 'border-gray-700'
                : 'border-gray-200';

              const bgClass = isSelected
                ? info.color === 'emerald'
                  ? isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'
                  : info.color === 'amber'
                  ? isDark ? 'bg-amber-900/30' : 'bg-amber-50'
                  : isDark ? 'bg-purple-900/30' : 'bg-purple-50'
                : isDark
                ? 'bg-gray-700/50 hover:border-gray-600'
                : 'bg-gray-50 hover:border-gray-300';

              const checkBgClass = isSelected
                ? info.color === 'emerald'
                  ? 'border-emerald-500 bg-emerald-500'
                  : info.color === 'amber'
                  ? 'border-amber-500 bg-amber-500'
                  : 'border-purple-500 bg-purple-500'
                : isDark
                ? 'border-gray-500'
                : 'border-gray-400';

              return (
                <button
                  key={tense}
                  onClick={() => toggleTense(tense)}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${borderClass} ${bgClass}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${checkBgClass}`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{info.name}</p>
                      <p className={`text-xs ${difficultyColors[info.difficulty]}`}>
                        {info.difficulty.charAt(0).toUpperCase() + info.difficulty.slice(1)} difficulty
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <span className={`text-sm font-medium ${
                      info.color === 'emerald' ? 'text-emerald-500' :
                      info.color === 'amber' ? 'text-amber-500' : 'text-purple-500'
                    }`}>Selected</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Verb streak display */}
        {verbStreak > 0 && (
          <div className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <div>
                <p className={`text-sm ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Current Streak</p>
                <p className={`text-xl font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                  {verbStreak} day{verbStreak !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={startSession}
          className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-purple-700 transition-colors"
        >
          Start Practice ({selectedTenses.size} tense{selectedTenses.size !== 1 ? 's' : ''})
        </button>

        <p className={`text-xs text-center mt-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {QUESTIONS_PER_SESSION} questions per session
        </p>

        {/* Conjugation reference button */}
        <button
          onClick={() => setShowConjugationTable(true)}
          className={`w-full mt-4 p-4 rounded-xl flex items-center justify-between transition-colors ${
            isDark
              ? 'bg-gray-800 hover:bg-gray-700'
              : 'bg-white hover:bg-gray-50 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <div className="text-left">
              <p className="font-medium">Conjugation Reference</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                View complete conjugation tables
              </p>
            </div>
          </div>
          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>→</span>
        </button>

        {/* Conjugation table modal */}
        {showConjugationTable && (
          <ConjugationTable
            isDark={isDark}
            onClose={() => setShowConjugationTable(false)}
          />
        )}
      </div>
    );
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="p-4 flex items-center justify-center min-h-[300px]">
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading...</p>
      </div>
    );
  }

  // Complete state
  if (state === 'complete') {
    const percentage = Math.round((score.correct / questions.length) * 100);

    return (
      <div className="p-4 text-center">
        <div className={`rounded-xl shadow-sm p-8 mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <p className="text-2xl mb-2">Session Complete!</p>
          <p className="text-5xl font-bold text-emerald-600 mb-2">{percentage}%</p>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
            {score.correct} correct, {score.incorrect} incorrect
          </p>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Tenses practiced: {Array.from(selectedTenses).map(t => TENSE_INFO[t].name).join(', ')}
          </p>
        </div>

        {/* Verb streak display */}
        <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
          <p className={`text-sm mb-1 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Verb Practice Streak</p>
          <p className={`text-3xl font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>{verbStreak} day{verbStreak !== 1 ? 's' : ''}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={restartSession}
            className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Practice Again
          </button>
          <button
            onClick={() => onNavigate('home')}
            className={`w-full py-2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // Question/Answer states
  const currentTenseInfo = currentQuestion ? TENSE_INFO[currentQuestion.tense as TenseKey] : TENSE_INFO.present;
  const tenseBgClass = currentTenseInfo.color === 'emerald'
    ? 'bg-emerald-100 text-emerald-700'
    : currentTenseInfo.color === 'amber'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-purple-100 text-purple-700';

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Verb Conjugation</h2>
          {verbStreak > 0 && (
            <p className="text-xs text-purple-600">{verbStreak} day streak</p>
          )}
        </div>
        <button
          onClick={() => onNavigate('home')}
          className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
        >
          Exit
        </button>
      </div>

      {/* Progress */}
      <div className="mb-4 text-center">
        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {remaining} question{remaining !== 1 ? 's' : ''} remaining
        </p>
        <div className={`w-full rounded-full h-2 mt-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="bg-purple-600 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className={`rounded-xl shadow-sm p-6 mb-4 min-h-[200px] flex flex-col ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Tense indicator */}
        <div className={`self-center mb-4 px-3 py-1 rounded-full text-xs font-medium ${tenseBgClass}`}>
          {currentQuestion?.tenseName || 'Present'}
        </div>

        {/* Prompt */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Conjugate:</p>
          <p className={`text-2xl font-medium mb-1 ${isDark ? 'text-gray-100' : ''}`}>{currentQuestion.infinitive}</p>
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>({currentQuestion.english})</p>
          <p className="text-xl text-purple-600 font-medium">{currentQuestion.pronoun}</p>
        </div>

        {/* Answer (when revealed) */}
        {state === 'show-answer' && (
          <div className="border-t pt-4 mt-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{currentQuestion.answer}</p>

            {/* Speak button */}
            {speechEnabled && hasSpanish && (
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  onClick={handleSpeak}
                  className="text-2xl hover:scale-110 transition-transform"
                  title="Speak"
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
            {speechEnabled && !hasSpanish && (
              <p className={`mt-4 text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Spanish voices not available on this browser
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {state === 'show-question' ? (
        <button
          onClick={showAnswer}
          className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-purple-700 transition-colors"
        >
          Show Answer
          <span className="text-sm opacity-80 ml-2">(Space)</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleGrade(false)}
            className="bg-red-500 text-white py-4 px-4 rounded-xl font-medium hover:bg-red-600 transition-colors"
          >
            <span className="block">Incorrect</span>
            <span className="text-xs opacity-80">(1 or X)</span>
          </button>
          <button
            onClick={() => handleGrade(true)}
            className="bg-emerald-500 text-white py-4 px-4 rounded-xl font-medium hover:bg-emerald-600 transition-colors"
          >
            <span className="block">Correct</span>
            <span className="text-xs opacity-80">(2 or C)</span>
          </button>
        </div>
      )}

      {/* Score */}
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <span className="text-emerald-600">✓ {score.correct}</span>
        <span className="text-red-500">✗ {score.incorrect}</span>
      </div>
    </div>
  );
}
