/**
 * Native Platform Integration
 *
 * Wraps Capacitor APIs for use in the app.
 * Falls back gracefully when running in web browser.
 */

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Preferences } from '@capacitor/preferences';
import {
  PushNotifications,
  PushNotificationSchema,
  Token,
} from '@capacitor/push-notifications';
import {
  LocalNotifications,
  LocalNotificationSchema,
} from '@capacitor/local-notifications';

/**
 * Check if running on native platform (iOS or Android)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get current platform
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}

/**
 * Hide splash screen (call after app is ready)
 */
export async function hideSplashScreen(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (error) {
    console.warn('Failed to hide splash screen:', error);
  }
}

/**
 * Set status bar style
 */
export async function setStatusBarStyle(isDark: boolean): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light,
    });

    // Set background color
    await StatusBar.setBackgroundColor({
      color: '#10b981', // Emerald
    });
  } catch (error) {
    console.warn('Failed to set status bar style:', error);
  }
}

/**
 * Add keyboard show/hide listeners
 */
export function addKeyboardListeners(
  onShow?: (height: number) => void,
  onHide?: () => void
): () => void {
  if (!isNativePlatform()) return () => {};

  const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
    onShow?.(info.keyboardHeight);
  });

  const hideListener = Keyboard.addListener('keyboardWillHide', () => {
    onHide?.();
  });

  // Return cleanup function
  return () => {
    showListener.then((l) => l.remove());
    hideListener.then((l) => l.remove());
  };
}

/**
 * Add app state change listener (foreground/background)
 */
export function addAppStateListener(
  onStateChange: (isActive: boolean) => void
): () => void {
  const listener = App.addListener('appStateChange', ({ isActive }) => {
    onStateChange(isActive);
  });

  return () => {
    listener.then((l) => l.remove());
  };
}

/**
 * Add back button listener (Android)
 */
export function addBackButtonListener(
  handler: () => void
): () => void {
  const listener = App.addListener('backButton', handler);

  return () => {
    listener.then((l) => l.remove());
  };
}

// ============================================
// Preferences (cross-platform key-value storage)
// ============================================

/**
 * Set a preference value
 */
export async function setPreference(key: string, value: string): Promise<void> {
  await Preferences.set({ key, value });
}

/**
 * Get a preference value
 */
export async function getPreference(key: string): Promise<string | null> {
  const { value } = await Preferences.get({ key });
  return value;
}

/**
 * Remove a preference
 */
export async function removePreference(key: string): Promise<void> {
  await Preferences.remove({ key });
}

// ============================================
// Push Notifications
// ============================================

/**
 * Request push notification permissions
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const result = await PushNotifications.requestPermissions();
    if (result.receive === 'granted') {
      await PushNotifications.register();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to request push permissions:', error);
    return false;
  }
}

/**
 * Add push notification listeners
 */
export function addPushListeners(
  onToken: (token: string) => void,
  onNotification: (notification: PushNotificationSchema) => void,
  onAction?: (notification: PushNotificationSchema) => void
): () => void {
  if (!isNativePlatform()) return () => {};

  const tokenListener = PushNotifications.addListener('registration', (token: Token) => {
    onToken(token.value);
  });

  const notificationListener = PushNotifications.addListener(
    'pushNotificationReceived',
    (notification) => {
      onNotification(notification);
    }
  );

  const actionListener = PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action) => {
      onAction?.(action.notification);
    }
  );

  return () => {
    tokenListener.then((l) => l.remove());
    notificationListener.then((l) => l.remove());
    actionListener.then((l) => l.remove());
  };
}

// ============================================
// Local Notifications (for review reminders)
// ============================================

/**
 * Request local notification permissions
 */
export async function requestLocalNotificationPermission(): Promise<boolean> {
  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('Failed to request local notification permissions:', error);
    return false;
  }
}

/**
 * Schedule a review reminder notification
 */
export async function scheduleReviewReminder(
  dueCount: number,
  scheduledTime: Date
): Promise<void> {
  const notification: LocalNotificationSchema = {
    id: 1, // Use fixed ID so we replace previous reminder
    title: 'Time to Review!',
    body: dueCount === 1
      ? 'You have 1 card waiting for review'
      : `You have ${dueCount} cards waiting for review`,
    schedule: { at: scheduledTime },
    sound: 'default',
    actionTypeId: 'REVIEW_REMINDER',
    extra: { type: 'review_reminder', dueCount },
  };

  await LocalNotifications.schedule({ notifications: [notification] });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({ id: n.id })),
    });
  }
}

/**
 * Schedule daily review reminders
 */
export async function scheduleDailyReminder(
  hour: number,
  minute: number
): Promise<void> {
  // Cancel existing reminders first
  await cancelAllNotifications();

  // Schedule for tomorrow at the specified time
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hour, minute, 0, 0);

  const notification: LocalNotificationSchema = {
    id: 2,
    title: 'Daily Review Reminder',
    body: 'Keep your streak going! Review your Spanish vocabulary.',
    schedule: {
      at: tomorrow,
      repeats: true,
      every: 'day',
    },
    sound: 'default',
  };

  await LocalNotifications.schedule({ notifications: [notification] });
}

/**
 * Add local notification action listener
 */
export function addLocalNotificationListener(
  onAction: (notification: LocalNotificationSchema) => void
): () => void {
  const listener = LocalNotifications.addListener(
    'localNotificationActionPerformed',
    (action) => {
      onAction(action.notification);
    }
  );

  return () => {
    listener.then((l) => l.remove());
  };
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize native platform features
 * Call this once when the app starts
 */
export async function initializeNative(isDark: boolean): Promise<void> {
  if (!isNativePlatform()) {
    console.log('Running in web mode - native features disabled');
    return;
  }

  console.log(`Running on ${getPlatform()} platform`);

  // Set status bar style
  await setStatusBarStyle(isDark);

  // Hide splash screen after a short delay
  setTimeout(() => {
    hideSplashScreen();
  }, 500);

  // Request notification permissions
  const hasPermission = await requestLocalNotificationPermission();
  if (hasPermission) {
    console.log('Local notifications enabled');
  }
}
