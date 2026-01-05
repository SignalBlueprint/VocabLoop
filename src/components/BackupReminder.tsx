import { useState, useEffect } from 'react';

const BACKUP_REMINDER_KEY = 'vocabloop_last_backup_reminder';
const BACKUP_REMINDER_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

interface BackupReminderProps {
  onGoToStats: () => void;
  isDark: boolean;
}

export function BackupReminder({ onGoToStats, isDark }: BackupReminderProps) {
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    checkShouldShowReminder();
  }, []);

  const checkShouldShowReminder = () => {
    const lastReminder = localStorage.getItem(BACKUP_REMINDER_KEY);
    if (!lastReminder) {
      // First time - set initial timestamp but don't show reminder yet
      localStorage.setItem(BACKUP_REMINDER_KEY, Date.now().toString());
      return;
    }

    const lastReminderTime = parseInt(lastReminder, 10);
    const timeSinceReminder = Date.now() - lastReminderTime;

    if (timeSinceReminder >= BACKUP_REMINDER_INTERVAL) {
      setShowReminder(true);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(BACKUP_REMINDER_KEY, Date.now().toString());
    setShowReminder(false);
  };

  const handleExport = () => {
    localStorage.setItem(BACKUP_REMINDER_KEY, Date.now().toString());
    setShowReminder(false);
    onGoToStats();
  };

  if (!showReminder) return null;

  return (
    <div className={`${isDark ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200'} border rounded-lg p-4 mb-4`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">💾</span>
        <div className="flex-1">
          <p className={`font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Time for a backup!</p>
          <p className={`text-sm ${isDark ? 'text-amber-400' : 'text-amber-700'} mt-1`}>
            It's been a week since your last backup. Export your cards to keep them safe.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleExport}
              className="text-sm bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
            >
              Export Now
            </button>
            <button
              onClick={handleDismiss}
              className={`text-sm ${isDark ? 'text-amber-400 hover:bg-amber-900/50' : 'text-amber-700 hover:bg-amber-100'} px-3 py-1.5 rounded-lg transition-colors`}
            >
              Remind Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
