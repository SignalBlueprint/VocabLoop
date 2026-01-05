import { useState, useEffect, useRef } from 'react';
import type { Page } from '../types';
import { getDueCount, getAllCards, getLearnedCardsCount } from '../db/cards';
import { getReviewedTodayCount, getAllReviews } from '../db/reviews';
import { calculateStreak } from '../utils/streak';
import { getVerbStats } from '../utils/verbStreak';
import { exportDeck, parseImportFile } from '../utils/export';
import { importMerge, importReplace } from '../utils/import';
import { StatsSkeleton } from '../components/Skeleton';
import { Achievements } from '../components/Achievements';
import { HeatmapCalendar } from '../components/HeatmapCalendar';
import { MasteryChart } from '../components/MasteryChart';
import { ShareCard } from '../components/ShareCard';
import { handleError } from '../utils/errors';
import { getTodayStudyTime, getWeeklyStudyTime, getAllTimeStudyTime, formatStudyTime } from '../utils/studyTime';
import { WeakAreasReport } from '../components/WeakAreasReport';
import { TimeAnalytics } from '../components/TimeAnalytics';
import { DifficultyDistribution } from '../components/CardDifficultyViz';

interface StatsProps {
  onNavigate: (page: Page) => void;
  showToast: (message: string) => void;
  isDark: boolean;
}

export function Stats({ onNavigate, showToast, isDark }: StatsProps) {
  const [dueCount, setDueCount] = useState<number>(0);
  const [totalCards, setTotalCards] = useState<number>(0);
  const [reviewedToday, setReviewedToday] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [verbStreak, setVerbStreak] = useState<number>(0);
  const [learned, setLearned] = useState<number>(0);
  const [weeklyData, setWeeklyData] = useState<{ day: string; count: number }[]>([]);
  const [allCards, setAllCards] = useState<Awaited<ReturnType<typeof getAllCards>>>([]);
  const [studyTimeToday, setStudyTimeToday] = useState(0);
  const [studyTimeWeekly, setStudyTimeWeekly] = useState(0);
  const [studyTimeTotal, setStudyTimeTotal] = useState(0);
  const [studyTimeBreakdown, setStudyTimeBreakdown] = useState<{ day: string; minutes: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showWeakAreas, setShowWeakAreas] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [due, all, today, streakDays, learnedCount, allReviews] = await Promise.all([
        getDueCount(),
        getAllCards(),
        getReviewedTodayCount(),
        calculateStreak(),
        getLearnedCardsCount(),
        getAllReviews(),
      ]);

      setDueCount(due);
      setTotalCards(all.length);
      setAllCards(all);
      setReviewedToday(today);
      setStreak(streakDays);
      setLearned(learnedCount);

      // Load verb practice streak
      const verbStats = getVerbStats();
      setVerbStreak(verbStats.streak);

      // Load study time stats
      const todayTime = getTodayStudyTime();
      const weeklyTime = getWeeklyStudyTime();
      const totalTime = getAllTimeStudyTime();
      setStudyTimeToday(todayTime.minutes);
      setStudyTimeWeekly(weeklyTime.minutes);
      setStudyTimeTotal(totalTime.minutes);
      setStudyTimeBreakdown(weeklyTime.dailyBreakdown);

      // Calculate last 7 days of reviews
      const days: { day: string; count: number }[] = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);
        const startOfDay = date.getTime();
        const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;
        const count = allReviews.filter(
          r => r.reviewedAt >= startOfDay && r.reviewedAt <= endOfDay
        ).length;
        days.push({ day: dayNames[date.getDay()], count });
      }
      setWeeklyData(days);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportDeck();
      showToast('Deck exported!');
    } catch (error) {
      showToast(handleError(error, 'export'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseImportFile(file);
      setShowImportModal(true);

      // Store parsed data for the modal
      (window as unknown as { __importData: typeof data }).__importData = data;
    } catch (error) {
      showToast(handleError(error, 'import'));
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async (mode: 'merge' | 'replace') => {
    const data = (window as unknown as { __importData: { cards: unknown[]; reviews: unknown[] } }).__importData;
    if (!data) return;

    try {
      const result = mode === 'merge'
        ? await importMerge(data.cards as never[], data.reviews as never[])
        : await importReplace(data.cards as never[], data.reviews as never[]);

      if (mode === 'merge' && result.cardsSkipped > 0) {
        showToast(`Imported ${result.cardsImported} cards (${result.cardsSkipped} skipped)`);
      } else {
        showToast(`Imported ${result.cardsImported} cards`);
      }

      setShowImportModal(false);
      await loadStats();
    } catch (error) {
      showToast(handleError(error, 'import'));
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Statistics</h2>
        </div>
        <StatsSkeleton isDark={isDark} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Statistics</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowShareCard(true)}
            className="text-emerald-600 hover:text-emerald-700"
            aria-label="Share progress"
          >
            Share
          </button>
          <button
            onClick={() => onNavigate('home')}
            className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
          >
            Back
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className={`rounded-xl p-4 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Due Now</p>
          <p className="text-3xl font-bold text-emerald-600">{dueCount}</p>
        </div>
        <div className={`rounded-xl p-4 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Reviewed Today</p>
          <p className="text-3xl font-bold text-blue-600">{reviewedToday}</p>
        </div>
        <div className={`rounded-xl p-4 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Review Streak</p>
          <p className="text-3xl font-bold text-orange-500">{streak} days</p>
        </div>
        <div className={`rounded-xl p-4 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Verb Streak</p>
          <p className="text-3xl font-bold text-purple-600">{verbStreak} days</p>
        </div>
        <div className={`rounded-xl p-4 shadow-sm col-span-2 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Cards Learned (3+ reviews)</p>
          <p className="text-3xl font-bold text-teal-600">{learned} / {totalCards}</p>
        </div>
      </div>

      {/* Study Time */}
      <div className={`rounded-xl p-4 shadow-sm mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Study Time</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{formatStudyTime(studyTimeToday)}</p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Today</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{formatStudyTime(studyTimeWeekly)}</p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>This Week</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{formatStudyTime(studyTimeTotal)}</p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>All Time</p>
          </div>
        </div>
        {/* Weekly study time breakdown chart */}
        {studyTimeBreakdown.some(d => d.minutes > 0) && (
          <div className="mt-4">
            <div className="flex items-end justify-between h-16 gap-1">
              {studyTimeBreakdown.map((d, i) => {
                const maxMinutes = Math.max(...studyTimeBreakdown.map(x => x.minutes), 1);
                const height = d.minutes > 0 ? Math.max((d.minutes / maxMinutes) * 100, 8) : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className={`w-full rounded-t ${d.minutes > 0 ? 'bg-blue-500' : isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                      style={{ height: `${height}%` }}
                      title={`${d.minutes} min`}
                    />
                    <span className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{d.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Weekly chart */}
      {weeklyData.length > 0 && (
        <div className={`rounded-xl p-4 shadow-sm mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Reviews (Last 7 Days)</p>
          <div className="flex items-end justify-between h-24 gap-1">
            {weeklyData.map((d, i) => {
              const maxCount = Math.max(...weeklyData.map(x => x.count), 1);
              const height = d.count > 0 ? Math.max((d.count / maxCount) * 100, 8) : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full rounded-t ${d.count > 0 ? 'bg-emerald-500' : isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                    style={{ height: `${height}%` }}
                    title={`${d.count} reviews`}
                  />
                  <span className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{d.day}</span>
                </div>
              );
            })}
          </div>
          <p className={`text-xs text-center mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {weeklyData.reduce((sum, d) => sum + d.count, 0)} reviews this week
          </p>
        </div>
      )}

      {/* Summary */}
      <div className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          You have <strong>{totalCards}</strong> total cards in your deck.
          {learned > 0 && (
            <> <strong>{learned}</strong> cards have been reviewed 3+ times.</>
          )}
        </p>
      </div>

      {/* Weak Areas button */}
      <button
        onClick={() => setShowWeakAreas(true)}
        className={`w-full mb-6 p-4 rounded-xl flex items-center justify-between transition-colors ${
          isDark
            ? 'bg-gray-800 hover:bg-gray-700'
            : 'bg-white hover:bg-gray-50 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div className="text-left">
            <p className="font-medium">Weak Areas</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              See cards and tags that need more practice
            </p>
          </div>
        </div>
        <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>→</span>
      </button>

      {/* Time analytics */}
      <div className="mb-6">
        <TimeAnalytics isDark={isDark} />
      </div>

      {/* Card difficulty distribution */}
      {allCards.length > 0 && (
        <div className="mb-6">
          <DifficultyDistribution cards={allCards} isDark={isDark} />
        </div>
      )}

      {/* Card difficulty details */}
      <button
        onClick={() => onNavigate('difficulty')}
        className={`w-full mb-6 p-4 rounded-xl flex items-center justify-between transition-colors ${
          isDark
            ? 'bg-gray-800 hover:bg-gray-700'
            : 'bg-white hover:bg-gray-50 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div className="text-left">
            <p className="font-medium">Card Difficulty Details</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              See which cards are hardest to remember
            </p>
          </div>
        </div>
        <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>→</span>
      </button>

      {/* Card mastery chart */}
      <div className="mb-6">
        <MasteryChart isDark={isDark} />
      </div>

      {/* Activity heatmap calendar */}
      <div className="mb-6">
        <HeatmapCalendar isDark={isDark} />
      </div>

      {/* Achievements */}
      <div className="mb-6">
        <Achievements isDark={isDark} />
      </div>

      {/* Import/Export */}
      <div className="space-y-3">
        <h3 className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Data Management</h3>

        <button
          onClick={handleExport}
          disabled={isExporting || totalCards === 0}
          className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExporting ? 'Exporting...' : 'Export Deck (JSON)'}
        </button>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`w-full py-3 px-4 rounded-lg font-medium border transition-colors ${
              isDark
                ? 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Import Deck (JSON)
          </button>
        </div>

        <p className={`text-xs text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Export regularly to back up your progress
        </p>
      </div>

      {/* Import modal */}
      {showImportModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-modal-title"
        >
          <div className={`rounded-xl p-6 w-full max-w-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 id="import-modal-title" className="text-lg font-semibold mb-4">Import Options</h3>

            <div className="space-y-3 mb-4">
              <button
                onClick={() => handleImport('merge')}
                className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Merge (Skip Duplicates)
              </button>
              <button
                onClick={() => handleImport('replace')}
                className="w-full bg-red-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Replace All
              </button>
            </div>

            <p className={`text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <strong>Merge:</strong> Adds new cards, skips existing ones.<br />
              <strong>Replace:</strong> Deletes all current data first.
            </p>

            <button
              onClick={() => setShowImportModal(false)}
              className={`w-full focus:outline-none focus:underline ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Share progress modal */}
      {showShareCard && (
        <ShareCard
          isDark={isDark}
          onClose={() => setShowShareCard(false)}
          showToast={showToast}
        />
      )}

      {/* Weak areas modal */}
      {showWeakAreas && (
        <WeakAreasReport
          isDark={isDark}
          onClose={() => setShowWeakAreas(false)}
        />
      )}
    </div>
  );
}
