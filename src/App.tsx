import { useState, useCallback, useEffect } from 'react';
import type { Page } from './types';
import { useToast } from './components/Toast';
import { useDarkMode } from './hooks/useDarkMode';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useAuth } from './hooks/useAuth';
import { Onboarding, hasCompletedOnboarding } from './components/Onboarding';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { AchievementNotification, useAchievementNotifications } from './components/Achievements';
import { AuthModal } from './components/AuthModal';
import { AccountMenu } from './components/AccountMenu';
import { SyncIndicator } from './components/SyncIndicator';
import { Home } from './pages/Home';
import { Review } from './pages/Review';
import { Library } from './pages/Library';
import { Stats } from './pages/Stats';
import { FrequencyList } from './pages/FrequencyList';
import { VerbMode } from './pages/VerbMode';
import { ClozeCreator } from './pages/ClozeCreator';
import { Difficulty } from './pages/Difficulty';
import { SpeedRound } from './pages/SpeedRound';
import { MatchingGame } from './pages/MatchingGame';
import { Quiz } from './pages/Quiz';
import { TypingChallenge } from './pages/TypingChallenge';
import { CustomStudy } from './pages/CustomStudy';
import { ListeningMode } from './pages/ListeningMode';
import { MultiplayerLobby } from './pages/MultiplayerLobby';
import { MultiplayerGame } from './pages/MultiplayerGame';
import { MultiplayerResults } from './pages/MultiplayerResults';
import { SmartSession } from './pages/SmartSession';
import { ConversationPage } from './pages/Conversation';
import { Pronunciation } from './pages/Pronunciation';
import { AddCard } from './components/AddCard';
import { isImmersionEnabled, toggleImmersionMode } from './utils/immersionMode';
import { areSoundsEnabled, toggleSounds } from './utils/sounds';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(!hasCompletedOnboarding());
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { showToast, ToastContainer } = useToast();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const isOnline = useOnlineStatus();
  const { isAuthenticated, isConfigured, email, handleSignOut } = useAuth();
  const [immersionMode, setImmersionMode] = useState(isImmersionEnabled());
  const [soundsEnabled, setSoundsEnabled] = useState(areSoundsEnabled());
  const { notification, dismissNotification } = useAchievementNotifications(isDark, showToast);

  const handleToggleSounds = useCallback(() => {
    const newState = toggleSounds();
    setSoundsEnabled(newState);
    showToast(newState ? 'Sound effects ON' : 'Sound effects OFF');
  }, [showToast]);

  const handleToggleImmersion = useCallback(() => {
    const newState = toggleImmersionMode();
    setImmersionMode(newState);
    showToast(newState ? 'Immersion mode ON - English hidden' : 'Immersion mode OFF');
  }, [showToast]);

  // Global keyboard shortcut for showing help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Show keyboard shortcuts with ?
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowKeyboardShortcuts(prev => !prev);
      }

      // Close keyboard shortcuts with Escape
      if (e.key === 'Escape' && showKeyboardShortcuts) {
        setShowKeyboardShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showKeyboardShortcuts]);

  const navigate = useCallback((page: Page) => {
    setCurrentPage(page);
  }, []);

  const handleCardAdded = useCallback(() => {
    // Trigger refresh of home page counts
    setRefreshKey(k => k + 1);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home key={refreshKey} onNavigate={navigate} isDark={isDark} showToast={showToast} />;
      case 'add':
        return <AddCard onCardAdded={handleCardAdded} showToast={showToast} isDark={isDark} />;
      case 'review':
        return <Review onNavigate={navigate} showToast={showToast} isDark={isDark} immersionMode={immersionMode} />;
      case 'library':
        return <Library onNavigate={navigate} showToast={showToast} isDark={isDark} />;
      case 'stats':
        return <Stats onNavigate={navigate} showToast={showToast} isDark={isDark} />;
      case 'frequency':
        return <FrequencyList onNavigate={navigate} showToast={showToast} isDark={isDark} />;
      case 'verbs':
        return <VerbMode onNavigate={navigate} showToast={showToast} isDark={isDark} />;
      case 'cloze':
        return <ClozeCreator onNavigate={navigate} showToast={showToast} isDark={isDark} />;
      case 'difficulty':
        return <Difficulty onNavigate={navigate} isDark={isDark} />;
      case 'speedround':
        return <SpeedRound onNavigate={navigate} showToast={showToast} isDark={isDark} />;
      case 'matching':
        return <MatchingGame onNavigate={navigate} showToast={showToast} isDark={isDark} />;
      case 'quiz':
        return <Quiz onNavigate={navigate} showToast={showToast} isDark={isDark} />;
      case 'typing':
        return <TypingChallenge onNavigate={navigate} showToast={showToast} isDark={isDark} />;
      case 'custom-study':
        return <CustomStudy onNavigate={navigate} showToast={showToast} isDark={isDark} />;
      case 'listening':
        return <ListeningMode onNavigate={navigate} showToast={showToast} isDark={isDark} />;
      case 'multiplayer-lobby':
        return <MultiplayerLobby onNavigate={navigate} isDark={isDark} showToast={showToast} />;
      case 'multiplayer-game':
        return <MultiplayerGame onNavigate={navigate} isDark={isDark} showToast={showToast} />;
      case 'multiplayer-results':
        return <MultiplayerResults onNavigate={navigate} isDark={isDark} />;
      case 'smart-session':
        return <SmartSession onNavigate={navigate} showToast={showToast} isDark={isDark} />;
      case 'conversation':
        return <ConversationPage onNavigate={navigate} isDark={isDark} />;
      case 'pronunciation':
        return <Pronunciation onNavigate={navigate} showToast={showToast} isDark={isDark} />;
      default:
        return <Home key={refreshKey} onNavigate={navigate} isDark={isDark} showToast={showToast} />;
    }
  };

  // Pages that show in main nav
  const mainNavPages: Page[] = ['home', 'add', 'library', 'stats'];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${isDark ? 'bg-emerald-700' : 'bg-emerald-600'} text-white p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold cursor-pointer"
              onClick={() => navigate('home')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('home')}
            >
              VocabLoop
            </h1>
            <p className={`${isDark ? 'text-emerald-200' : 'text-emerald-100'} text-sm`}>Learn Spanish with spaced repetition</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Offline indicator */}
            {!isOnline && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-200 text-xs"
                title="You're offline. Data is saved locally."
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}
            {/* Sync indicator */}
            {isAuthenticated && (
              <SyncIndicator
                isDark={isDark}
                isAuthenticated={isAuthenticated}
                onSyncComplete={() => setRefreshKey((k) => k + 1)}
              />
            )}
            {/* Account/Sign in */}
            {isConfigured && (
              isAuthenticated && email ? (
                <AccountMenu
                  email={email}
                  isDark={isDark}
                  onSignOut={handleSignOut}
                />
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
                >
                  Sign in
                </button>
              )
            )}
            <button
              onClick={handleToggleSounds}
              className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600 ${
                soundsEnabled ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
              aria-label={soundsEnabled ? 'Turn off sound effects' : 'Turn on sound effects'}
              title={soundsEnabled ? 'Sound effects ON' : 'Sound effects OFF'}
            >
              {soundsEnabled ? '🔊' : '🔇'}
            </button>
            <button
              onClick={handleToggleImmersion}
              className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600 ${
                immersionMode ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
              aria-label={immersionMode ? 'Turn off immersion mode' : 'Turn on immersion mode'}
              title={immersionMode ? 'Immersion mode ON' : 'Immersion mode OFF'}
            >
              {immersionMode ? '🇪🇸' : '🌐'}
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation tabs - only show for main pages */}
      {mainNavPages.includes(currentPage) && (
        <nav className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'} border-b`} aria-label="Main navigation">
          <div className="flex" role="tablist">
            <button
              onClick={() => navigate('home')}
              role="tab"
              aria-selected={currentPage === 'home'}
              className={`flex-1 py-3 text-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 ${
                currentPage === 'home'
                  ? 'text-emerald-500 border-b-2 border-emerald-500'
                  : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => navigate('add')}
              role="tab"
              aria-selected={currentPage === 'add'}
              className={`flex-1 py-3 text-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 ${
                currentPage === 'add'
                  ? 'text-emerald-500 border-b-2 border-emerald-500'
                  : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Add
            </button>
            <button
              onClick={() => navigate('library')}
              role="tab"
              aria-selected={currentPage === 'library'}
              className={`flex-1 py-3 text-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 ${
                currentPage === 'library'
                  ? 'text-emerald-500 border-b-2 border-emerald-500'
                  : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Library
            </button>
            <button
              onClick={() => navigate('stats')}
              role="tab"
              aria-selected={currentPage === 'stats'}
              className={`flex-1 py-3 text-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 ${
                currentPage === 'stats'
                  ? 'text-emerald-500 border-b-2 border-emerald-500'
                  : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Stats
            </button>
          </div>
        </nav>
      )}

      {/* Main content */}
      <main className="max-w-lg mx-auto">
        {renderPage()}
      </main>

      {/* Toast notifications */}
      <ToastContainer />

      {/* Onboarding modal for new users */}
      {showOnboarding && (
        <Onboarding
          onComplete={() => setShowOnboarding(false)}
          isDark={isDark}
        />
      )}

      {/* Keyboard shortcuts help */}
      {showKeyboardShortcuts && (
        <KeyboardShortcuts
          isDark={isDark}
          onClose={() => setShowKeyboardShortcuts(false)}
        />
      )}

      {/* Achievement notification */}
      {notification && (
        <AchievementNotification
          achievement={notification}
          onClose={dismissNotification}
          isDark={isDark}
        />
      )}

      {/* Auth modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          isDark={isDark}
        />
      )}
    </div>
  );
}

export default App;
