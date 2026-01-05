import { useState, useEffect } from 'react';
import { getDueCount, getAllCards } from '../db/cards';
import { getReviewedTodayCount } from '../db/reviews';
import { BackupReminder } from '../components/BackupReminder';
import { StreakDisplay } from '../components/StreakDisplay';
import { DailyGoal } from '../components/DailyGoal';
import { XPDisplay } from '../components/XPDisplay';
import { WeeklyChallenges } from '../components/WeeklyChallenges';
import { WordOfTheDay } from '../components/WordOfTheDay';
import { StarterDecks } from '../components/StarterDecks';
import { StreakMilestoneCelebration, StreakProgress } from '../components/StreakMilestone';
import { DailyQuests } from '../components/DailyQuests';
import { StreakAtRiskBanner } from '../components/StreakInsurance';
import { ProgressSummary } from '../components/ProgressSummary';
import { SmartSuggestions } from '../components/SmartSuggestions';
import { GameHub } from '../components/GameHub';
import { calculateStreak, isStreakAtRisk, hasReviewedToday } from '../utils/streak';
import { getVerbStats } from '../utils/verbStreak';
import { getDailyGoalTarget } from '../utils/dailyGoal';
import { autoLoadStarterDeck } from '../utils/firstLaunch';
import type { Page } from '../types';

interface HomeProps {
  onNavigate: (page: Page) => void;
  isDark: boolean;
  showToast: (message: string) => void;
}

export function Home({ onNavigate, isDark, showToast }: HomeProps) {
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [totalCards, setTotalCards] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewStreak, setReviewStreak] = useState(0);
  const [verbStreak, setVerbStreak] = useState(0);
  const [reviewedToday, setReviewedToday] = useState(false);
  const [streakAtRisk, setStreakAtRisk] = useState(false);
  const [hoursRemaining, setHoursRemaining] = useState(0);
  const [reviewedTodayCount, setReviewedTodayCount] = useState(0);
  const [dailyGoalTarget, setDailyGoalTarget] = useState(getDailyGoalTarget());
  const [showStarterDecks, setShowStarterDecks] = useState(false);

  useEffect(() => {
    initializeAndLoad();
  }, []);

  const initializeAndLoad = async () => {
    try {
      // Auto-load starter deck for new users
      const autoLoadResult = await autoLoadStarterDeck();
      if (autoLoadResult.loaded) {
        showToast(`Welcome! Added ${autoLoadResult.cardCount} starter cards`);
      }

      await loadData();
    } catch (error) {
      console.error('Failed to initialize:', error);
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [due, all, streak, verbStats, reviewed, riskInfo, todayCount] = await Promise.all([
        getDueCount(),
        getAllCards(),
        calculateStreak(),
        getVerbStats(),
        hasReviewedToday(),
        isStreakAtRisk(),
        getReviewedTodayCount(),
      ]);
      setDueCount(due);
      setTotalCards(all.length);
      setReviewStreak(streak);
      setVerbStreak(verbStats.streak);
      setReviewedToday(reviewed);
      setStreakAtRisk(riskInfo.atRisk);
      setHoursRemaining(riskInfo.hoursRemaining);
      setReviewedTodayCount(todayCount);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Backup reminder */}
      <BackupReminder onGoToStats={() => onNavigate('stats')} isDark={isDark} />

      {/* Progress Summary - Weekly stats at a glance */}
      {totalCards !== null && totalCards > 0 && (
        <ProgressSummary isDark={isDark} onNavigate={onNavigate} />
      )}

      {/* Streak display */}
      <StreakDisplay
        reviewStreak={reviewStreak}
        verbStreak={verbStreak}
        reviewedToday={reviewedToday}
        streakAtRisk={streakAtRisk}
        hoursRemaining={hoursRemaining}
        isDark={isDark}
      />

      {/* Streak milestone progress */}
      {reviewStreak > 0 && (
        <StreakProgress currentStreak={reviewStreak} isDark={isDark} />
      )}

      {/* Streak insurance banner - show when at risk */}
      {streakAtRisk && !reviewedToday && reviewStreak > 0 && (
        <div className="mt-3">
          <StreakAtRiskBanner
            isDark={isDark}
            showToast={showToast}
            onStreakSaved={loadData}
          />
        </div>
      )}

      {/* Streak milestone celebration */}
      <StreakMilestoneCelebration
        currentStreak={reviewStreak}
        isDark={isDark}
        showToast={showToast}
      />

      {/* Due count display - Hero section */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm p-6 mb-4`}>
        <div className="text-center">
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Due now</p>
          <p className="text-5xl font-bold text-emerald-500">{dueCount ?? 0}</p>
          {totalCards !== null && totalCards > 0 && (
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-2`}>
              of {totalCards} total cards
            </p>
          )}
        </div>

        {/* Main action button inside the hero card */}
        <div className="mt-4">
          {dueCount !== null && dueCount > 0 ? (
            <button
              onClick={() => onNavigate('review')}
              className="w-full bg-emerald-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              aria-label={`Start Review - ${dueCount} cards due`}
            >
              Start Review
            </button>
          ) : totalCards === 0 ? (
            <button
              onClick={() => setShowStarterDecks(true)}
              className="w-full bg-emerald-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
            >
              Browse Starter Decks
            </button>
          ) : (
            <p className={`text-center ${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-medium`}>
              All caught up! Try a game below.
            </p>
          )}
        </div>
      </div>

      {/* Games Hub - Prominent access to all mini games */}
      <GameHub
        isDark={isDark}
        onNavigate={onNavigate}
        hasCards={totalCards !== null && totalCards > 0}
      />

      {/* Smart Study Suggestions - Based on weak areas */}
      <SmartSuggestions
        isDark={isDark}
        onNavigate={onNavigate}
        showToast={showToast}
      />

      {/* Daily goal progress */}
      {totalCards !== null && totalCards > 0 && (
        <DailyGoal
          completed={reviewedTodayCount}
          target={dailyGoalTarget}
          isDark={isDark}
          onTargetChange={setDailyGoalTarget}
        />
      )}

      {/* XP/Level display */}
      <div className="mb-4">
        <XPDisplay isDark={isDark} />
      </div>

      {/* Daily quests */}
      <DailyQuests isDark={isDark} showToast={showToast} />

      {/* Weekly challenges */}
      <div className="mb-4">
        <WeeklyChallenges isDark={isDark} showToast={showToast} />
      </div>

      {/* Word of the Day */}
      <div className="mb-4">
        <WordOfTheDay isDark={isDark} />
      </div>

      {/* Secondary actions */}
      <div className="space-y-3 mb-4" role="group" aria-label="Secondary actions">
        <button
          onClick={() => onNavigate('add')}
          className={`w-full ${isDark ? 'bg-gray-800 text-emerald-400 border-emerald-500 hover:bg-gray-700' : 'bg-white text-emerald-600 border-emerald-600 hover:bg-emerald-50'} py-3 px-6 rounded-xl font-semibold border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`}
        >
          + Add Card
        </button>

        {totalCards !== null && totalCards > 0 && (
          <button
            onClick={() => onNavigate('library')}
            className={`w-full ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} py-3 px-6 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`}
            aria-label={`View Library - ${totalCards} cards`}
          >
            View Library ({totalCards})
          </button>
        )}

        {/* Show explore decks prompt for users with few cards */}
        {totalCards !== null && totalCards > 0 && totalCards < 50 && (
          <button
            onClick={() => setShowStarterDecks(true)}
            className={`w-full ${isDark ? 'bg-indigo-900/50 text-indigo-300 hover:bg-indigo-900/70 border-indigo-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'} py-3 px-6 rounded-xl font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
          >
            + Add More Vocabulary Decks
          </button>
        )}
      </div>

      {/* Spanish Tools */}
      <nav className="mt-4" aria-label="Spanish tools">
        <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-3`}>Spanish Tools</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('frequency')}
            className={`${isDark ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-900/70 border-blue-800' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'} py-4 px-3 rounded-xl font-medium transition-colors text-center border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            aria-label="Top 500 - Most common Spanish words"
          >
            <span className="text-2xl block mb-1" aria-hidden="true">📚</span>
            <span className="text-sm font-medium">Top 500 Words</span>
            <span className={`text-xs block ${isDark ? 'text-blue-400' : 'text-blue-500'}`}>Frequency list</span>
          </button>
          <button
            onClick={() => onNavigate('cloze')}
            className={`${isDark ? 'bg-amber-900/50 text-amber-300 hover:bg-amber-900/70 border-amber-800' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'} py-4 px-3 rounded-xl font-medium transition-colors text-center border focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2`}
            aria-label="Cloze - Create fill-in-the-blank cards"
          >
            <span className="text-2xl block mb-1" aria-hidden="true">📝</span>
            <span className="text-sm font-medium">Cloze Creator</span>
            <span className={`text-xs block ${isDark ? 'text-amber-400' : 'text-amber-500'}`}>Fill-in-blank</span>
          </button>
        </div>
      </nav>

      {/* Starter Decks Modal */}
      {showStarterDecks && (
        <StarterDecks
          isDark={isDark}
          onClose={() => setShowStarterDecks(false)}
          showToast={showToast}
          onImported={loadData}
        />
      )}
    </div>
  );
}
