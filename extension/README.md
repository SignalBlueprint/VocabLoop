# VocabLoop Browser Extension

Highlight Spanish vocabulary on any webpage based on your VocabLoop learning progress.

## Features

- **Vocabulary Highlighting**: Spanish words you're learning are highlighted on webpages
  - 🟢 **Green** = Mastered words (interval ≥ 21 days)
  - 🟡 **Yellow** = Learning words (interval 1-20 days)
  - ⋯ **Underlined** = Unknown Spanish words (not in your deck)

- **Translation Tooltips**: Hover over highlighted words to see English translations

- **Add Unknown Words**: Click on unknown words to add them to your VocabLoop deck

- **Cloud Sync**: Automatically syncs vocabulary from your VocabLoop account

## Installation

### Development Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `extension/` directory

### Production

The extension will be available on the Chrome Web Store (coming soon).

## Setup

1. Install the extension
2. Click the VocabLoop icon in your browser toolbar
3. Click "Connect Account" to link your VocabLoop account
4. Or click "Import from App" to manually import your vocabulary

## Configuration

Click the settings icon (⚙️) in the popup to configure:

- **API URL**: Your VocabLoop API endpoint (for cloud sync)
- **Auth Token**: Your authentication token (from VocabLoop settings)

Toggle options:
- **Highlighting**: Enable/disable word highlighting
- **Show Translations**: Enable/disable hover translations
- **Auto Sync**: Enable/disable automatic vocabulary sync

## Development

### File Structure

```
extension/
├── manifest.json      # Extension manifest (Manifest V3)
├── background.js      # Service worker for sync and messaging
├── content.js         # Content script for page highlighting
├── content.css        # Styles for highlights and popups
├── popup.html         # Extension popup UI
├── popup.css          # Popup styles
├── popup.js           # Popup functionality
├── options.html       # Full settings page
├── icons/             # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # This file
```

### Generating Icons

The placeholder icons can be replaced with proper icons:

1. Install canvas: `npm install canvas`
2. Run: `node icons/generate-icons.js`

Or design custom icons at 16x16, 48x48, and 128x128 pixels.

### Testing

1. Load the extension in developer mode
2. Navigate to a Spanish website (e.g., elpais.com, bbc.com/mundo)
3. Verify highlighting appears on known vocabulary
4. Test the popup functionality

## Browser Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+
- ⚠️ Firefox (requires manifest modifications)
- ❌ Safari (different extension format)

## Privacy

- Vocabulary data is stored locally in Chrome storage
- Cloud sync is optional and requires authentication
- No browsing data is collected or transmitted
- All communication uses HTTPS

## License

Part of the VocabLoop project.
