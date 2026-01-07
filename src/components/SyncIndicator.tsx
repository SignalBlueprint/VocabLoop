import { useState, useEffect } from 'react';
import { SyncStatus, getLastSyncTime, isOnline, syncAll } from '../utils/sync';

interface SyncIndicatorProps {
  isDark: boolean;
  isAuthenticated: boolean;
  onSyncComplete?: () => void;
}

export function SyncIndicator({ isDark, isAuthenticated, onSyncComplete }: SyncIndicatorProps) {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update last sync time on mount and after sync
  useEffect(() => {
    setLastSync(getLastSyncTime());
  }, [status]);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setStatus((s) => (s === 'offline' ? 'idle' : s));
    const handleOffline = () => setStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!isOnline()) {
      setStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (!isAuthenticated || status === 'syncing') return;

    setStatus('syncing');
    setError(null);

    const result = await syncAll();

    if (result.success) {
      setStatus('success');
      onSyncComplete?.();
      // Reset to idle after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    } else {
      setStatus('error');
      setError(result.error || 'Sync failed');
    }
  };

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Never synced';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'syncing':
        return (
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'offline':
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        );
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={handleSync}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={status === 'syncing' || status === 'offline'}
        className={`p-2 rounded-lg transition-colors ${
          status === 'syncing' || status === 'offline'
            ? 'cursor-not-allowed opacity-50'
            : isDark
              ? 'hover:bg-gray-700 text-gray-300'
              : 'hover:bg-gray-100 text-gray-600'
        }`}
        title="Sync"
      >
        {getStatusIcon()}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={`absolute right-0 top-full mt-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap z-50 ${
            isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-800 text-gray-100'
          }`}
        >
          {status === 'offline' ? (
            'Offline - changes will sync when online'
          ) : status === 'error' ? (
            <span className="text-red-400">{error}</span>
          ) : status === 'syncing' ? (
            'Syncing...'
          ) : status === 'success' ? (
            'Sync complete!'
          ) : (
            <>
              <span className="block font-medium">Click to sync</span>
              <span className={isDark ? 'text-gray-400' : 'text-gray-300'}>
                Last synced: {formatLastSync(lastSync)}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
