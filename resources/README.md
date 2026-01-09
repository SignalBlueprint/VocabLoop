# VocabLoop Mobile Resources

This directory contains source assets for generating iOS and Android app icons and splash screens.

## Required Source Files

Place the following files in this directory:

### App Icon
- `icon.png` - 1024x1024 PNG with transparent or solid background
  - Should be the VocabLoop "V" logo on emerald (#10b981) background
  - No rounded corners (platforms add their own)

### Splash Screen
- `splash.png` - 2732x2732 PNG (largest iPad Pro size)
  - Emerald background (#10b981)
  - VocabLoop logo centered
  - Will be cropped/scaled for different device sizes

## Generating Platform Assets

Once you have the source files, use @capacitor/assets to generate all sizes:

```bash
# Install the assets generator
npm install -D @capacitor/assets

# Generate all platform assets
npx capacitor-assets generate
```

This will create:
- iOS: AppIcon.appiconset with all required sizes
- iOS: LaunchImage.launchimage
- Android: mipmap-* folders with all density icons
- Android: drawable-* splash screens

## Manual Generation Alternative

If you prefer to create icons manually:

### iOS App Icons (in ios/App/App/Assets.xcassets/AppIcon.appiconset/)
- 20x20 (1x, 2x, 3x) - Notification
- 29x29 (1x, 2x, 3x) - Settings
- 40x40 (1x, 2x, 3x) - Spotlight
- 60x60 (2x, 3x) - App icon
- 76x76 (1x, 2x) - iPad app
- 83.5x83.5 (2x) - iPad Pro
- 1024x1024 - App Store

### Android App Icons (in android/app/src/main/res/)
- mipmap-mdpi/ic_launcher.png - 48x48
- mipmap-hdpi/ic_launcher.png - 72x72
- mipmap-xhdpi/ic_launcher.png - 96x96
- mipmap-xxhdpi/ic_launcher.png - 144x144
- mipmap-xxxhdpi/ic_launcher.png - 192x192

## Color Reference

- Primary (Emerald): #10b981
- Primary Dark: #059669
- Background: #ffffff (light) / #1f2937 (dark)
- Text: #1f2937 (light) / #f9fafb (dark)
