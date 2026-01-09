/**
 * React Hook for Native Platform Features
 *
 * Provides easy access to native features in components.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  isNativePlatform,
  getPlatform,
  initializeNative,
  setStatusBarStyle,
  addAppStateListener,
  addKeyboardListeners,
  addBackButtonListener,
  scheduleReviewReminder,
  scheduleDailyReminder,
  cancelAllNotifications,
} from '../utils/native';

interface UseNativeResult {
  isNative: boolean;
  platform: 'ios' | 'android' | 'web';
  isAppActive: boolean;
  keyboardHeight: number;

  // Actions
  scheduleReminder: (dueCount: number, when: Date) => Promise<void>;
  setDailyReminder: (hour: number, minute: number) => Promise<void>;
  cancelReminders: () => Promise<void>;
}

/**
 * Hook to access native platform features
 */
export function useNative(isDark: boolean): UseNativeResult {
  const [isAppActive, setIsAppActive] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const isNative = isNativePlatform();
  const platform = getPlatform();

  // Initialize native features on mount
  useEffect(() => {
    if (!initialized) {
      initializeNative(isDark).then(() => {
        setInitialized(true);
      });
    }
  }, [initialized, isDark]);

  // Update status bar when dark mode changes
  useEffect(() => {
    if (isNative && initialized) {
      setStatusBarStyle(isDark);
    }
  }, [isDark, isNative, initialized]);

  // Listen for app state changes
  useEffect(() => {
    if (!isNative) return;

    const cleanup = addAppStateListener((active) => {
      setIsAppActive(active);
    });

    return cleanup;
  }, [isNative]);

  // Listen for keyboard events
  useEffect(() => {
    if (!isNative) return;

    const cleanup = addKeyboardListeners(
      (height) => setKeyboardHeight(height),
      () => setKeyboardHeight(0)
    );

    return cleanup;
  }, [isNative]);

  // Notification actions
  const scheduleReminder = useCallback(
    async (dueCount: number, when: Date) => {
      await scheduleReviewReminder(dueCount, when);
    },
    []
  );

  const setDailyReminder = useCallback(
    async (hour: number, minute: number) => {
      await scheduleDailyReminder(hour, minute);
    },
    []
  );

  const cancelReminders = useCallback(async () => {
    await cancelAllNotifications();
  }, []);

  return {
    isNative,
    platform,
    isAppActive,
    keyboardHeight,
    scheduleReminder,
    setDailyReminder,
    cancelReminders,
  };
}

/**
 * Hook to handle Android back button
 */
export function useBackButton(handler: () => void): void {
  useEffect(() => {
    if (!isNativePlatform()) return;

    const cleanup = addBackButtonListener(handler);
    return cleanup;
  }, [handler]);
}

/**
 * Hook to track app foreground/background state
 */
export function useAppState(): boolean {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isNativePlatform()) return;

    const cleanup = addAppStateListener(setIsActive);
    return cleanup;
  }, []);

  return isActive;
}

/**
 * Hook to get keyboard height (for adjusting UI)
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!isNativePlatform()) return;

    const cleanup = addKeyboardListeners(
      (h) => setHeight(h),
      () => setHeight(0)
    );

    return cleanup;
  }, []);

  return height;
}
