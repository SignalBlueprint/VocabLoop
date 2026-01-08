import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vocabloop.app',
  appName: 'VocabLoop',
  webDir: 'dist',

  // Server configuration
  server: {
    // Allow loading from localhost during development
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },

  // iOS-specific configuration
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    // Enable background fetch for sync
    backgroundColor: '#10b981',
  },

  // Android-specific configuration
  android: {
    // Allow mixed content for development
    allowMixedContent: true,
    // Status bar color (emerald)
    backgroundColor: '#10b981',
  },

  // Plugin configuration
  plugins: {
    // Splash screen configuration
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#10b981',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    // Status bar configuration
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#10b981',
    },

    // Keyboard configuration
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },

    // Push notifications configuration (placeholder)
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // Local notifications for review reminders
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#10b981',
    },
  },
};

export default config;
