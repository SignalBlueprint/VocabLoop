# Mobile Framework Research

Research conducted: 2026-01-08

## Overview

This document evaluates mobile framework options for building a VocabLoop companion app that syncs with the web version and provides native capabilities like push notifications, home screen widgets, and background sync.

## Requirements

### Must Have
- Full feature parity with web app (review, games, stats)
- Cloud sync with existing Supabase backend
- Offline support for reviewing cards without internet
- Push notifications for review reminders
- Works on iOS 14+ and Android 10+

### Should Have
- Home screen widget showing due cards
- Background sync to keep data fresh
- Native share extension (add words from other apps)
- Fast startup time (<2s)

### Nice to Have
- Quick review directly from widget
- Siri/Google Assistant integration
- Apple Watch/Wear OS companion

## Options Evaluated

### 1. React Native

**Description:** Facebook's framework for building native apps using React and JavaScript.

**Pros:**
- Large ecosystem and community
- Good TypeScript support
- Can share business logic with web app
- Native performance for UI
- Expo simplifies development
- Access to native APIs

**Cons:**
- Separate codebase from web (can't share React components directly)
- Larger bundle size than PWA
- More complex build pipeline
- Updates require app store review
- Two native projects to maintain (iOS/Android)

**Code Sharing:**
- Can share: Types, utilities, business logic, API clients
- Cannot share: React components (React Native uses different primitives)

**Widget Support:**
- iOS: Requires separate Swift/Objective-C widget target
- Android: Requires separate Kotlin/Java widget
- Complex setup, limited React Native integration

**Estimated Effort:** 80-120 hours for full feature parity

### 2. Capacitor (Ionic)

**Description:** Ionic's native runtime that wraps web apps in a native container.

**Pros:**
- Maximum code sharing (same React components)
- Single codebase for web + iOS + Android
- Web view performance is good on modern devices
- Access to native APIs via plugins
- Easier migration from existing PWA
- Updates can bypass app store (web view content)

**Cons:**
- Web view has some performance overhead
- Native features require plugins or custom code
- Widgets require native code (no web view)
- Less "native feel" than React Native
- Smaller community than React Native

**Code Sharing:**
- Can share: Everything (components, hooks, utilities, styles)
- Capacitor wraps the existing web app

**Widget Support:**
- iOS: Requires native Swift WidgetKit code
- Android: Requires native Kotlin widget
- Same complexity as React Native

**Estimated Effort:** 40-60 hours for full feature parity

### 3. PWA-Only (Progressive Web App)

**Description:** Enhanced web app with service workers, no native wrapper.

**Pros:**
- Zero additional development (already built)
- No app store overhead
- Instant updates
- Single codebase
- Works everywhere (iOS, Android, desktop)

**Cons:**
- No push notifications on iOS (until iOS 16.4+)
- No widgets
- No background sync on iOS
- No native share extension
- Can't publish to app stores
- "Add to Home Screen" friction

**Code Sharing:**
- 100% code sharing (it's the same app)

**Widget Support:**
- Not possible

**Estimated Effort:** Already done

## Feature Comparison Matrix

| Feature                | React Native | Capacitor | PWA |
|------------------------|-------------|-----------|-----|
| Code Sharing           | 40%         | 95%       | 100% |
| iOS Push Notifications | ✅          | ✅        | ⚠️ iOS 16.4+ |
| Android Push           | ✅          | ✅        | ✅ |
| Home Screen Widget     | ⚠️ Native   | ⚠️ Native | ❌ |
| Background Sync        | ✅          | ✅        | ⚠️ Limited |
| Native Share Extension | ✅          | ✅        | ❌ |
| Offline Support        | ✅          | ✅        | ✅ |
| App Store Presence     | ✅          | ✅        | ❌ |
| Update Speed           | Slow        | Fast      | Instant |
| Development Effort     | High        | Medium    | None |
| Native Performance     | Best        | Good      | Good |

## Recommendation

### Primary: Capacitor

**Rationale:**

1. **Maximum Code Reuse:** VocabLoop is already a well-structured React app. Capacitor can wrap it with minimal changes, sharing 95%+ of the codebase.

2. **Lower Development Effort:** Estimated 40-60 hours vs 80-120 for React Native. Most effort is in native plugins, not rewriting components.

3. **Familiar Stack:** Continues using React, TypeScript, and the existing component library. No need to learn React Native specifics.

4. **Web-First Updates:** Core app features can be updated without app store review. Only native plugin changes require store updates.

5. **Adequate Performance:** Modern web views are fast. VocabLoop's UI is not performance-critical (no complex animations, no games requiring 60fps).

### Secondary: PWA Enhancement

If native features aren't critical, enhance the existing PWA:

1. Add Web Push for Android (and iOS 16.4+ users)
2. Improve offline caching with better service worker
3. Add "Install" prompt UX

This covers most users with zero additional effort.

### Not Recommended: React Native

React Native makes sense for apps that need native performance (games, video, complex gestures) or have dedicated mobile teams. VocabLoop doesn't fit this profile. The effort to rewrite components isn't justified.

## Implementation Plan (Capacitor)

### Phase 1: Basic App (10-15 hours)
1. Install Capacitor: `npm install @capacitor/core @capacitor/cli`
2. Initialize: `npx cap init`
3. Add platforms: `npx cap add ios && npx cap add android`
4. Configure app metadata (name, icon, splash screen)
5. Build and test on simulators

### Phase 2: Push Notifications (8-12 hours)
1. Install plugin: `npm install @capacitor/push-notifications`
2. Configure Firebase (Android) and APNs (iOS)
3. Request permissions on first launch
4. Implement notification handler
5. Add server-side notification scheduling

### Phase 3: Background Sync (5-8 hours)
1. Install plugin: `npm install @capacitor/background-runner`
2. Configure periodic sync task
3. Implement lightweight sync in background
4. Handle sync conflicts

### Phase 4: Native Widgets (15-20 hours)
1. **iOS:** Create WidgetKit extension in Xcode
   - App group for data sharing
   - Swift UI widget showing due count
   - Intent handler for quick review
2. **Android:** Create App Widget
   - Kotlin implementation
   - Home screen widget layout
   - PendingIntent for app launch

### Phase 5: App Store Prep (5-10 hours)
1. Generate app icons and splash screens
2. Write app store descriptions
3. Create screenshots
4. Set up privacy policy
5. Submit to Apple App Store and Google Play

**Total Estimated Effort:** 43-65 hours

## Native Widget Architecture

Widgets require native code regardless of framework. Here's the proposed approach:

### Data Sharing
- Use App Groups (iOS) / SharedPreferences (Android)
- Write due count and next card to shared storage
- Native widget reads from shared storage

### Widget Features
- Display: "5 cards due"
- Tap: Opens VocabLoop app
- Quick action: "Start Review" button

### Update Strategy
- Update widget data after each review
- Periodic refresh every 15 minutes
- Background fetch on app sync

## Conclusion

**Capacitor is the recommended approach** for building a VocabLoop mobile companion app. It maximizes code reuse while providing access to native features. The main custom work is:

1. Native plugins for push notifications
2. Native widgets (unavoidable with any framework)
3. App store preparation

For immediate value with minimal effort, enhancing the PWA with better offline support and Android push notifications is a valid intermediate step.
