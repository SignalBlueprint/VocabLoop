/**
 * VocabLoop Extension Background Service Worker
 *
 * Handles:
 * - Vocabulary sync from VocabLoop cloud/local storage
 * - Communication with content scripts
 * - Storage management
 */

// Sync interval (30 minutes)
const SYNC_INTERVAL_MS = 30 * 60 * 1000;

// Default settings
const DEFAULT_SETTINGS = {
  highlightingEnabled: true,
  showTranslations: true,
  autoSync: true,
  lastSyncAt: null,
  apiUrl: null,
  authToken: null,
};

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log('VocabLoop extension installed');

  // Set default settings
  const existing = await chrome.storage.local.get('settings');
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }

  // Initialize empty vocabulary
  const vocabExists = await chrome.storage.local.get('vocabulary');
  if (!vocabExists.vocabulary) {
    await chrome.storage.local.set({
      vocabulary: {
        mastered: [],   // interval >= 21 days
        learning: [],   // interval 1-20 days
        unknown: [],    // not in user's deck
      },
      lastUpdated: null,
    });
  }

  // Schedule periodic sync
  chrome.alarms.create('syncVocabulary', { periodInMinutes: 30 });
});

/**
 * Handle alarm for periodic sync
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'syncVocabulary') {
    const { settings } = await chrome.storage.local.get('settings');
    if (settings?.autoSync && settings?.authToken) {
      await syncVocabulary();
    }
  }
});

/**
 * Sync vocabulary from VocabLoop cloud
 */
async function syncVocabulary() {
  const { settings } = await chrome.storage.local.get('settings');

  if (!settings?.apiUrl || !settings?.authToken) {
    console.log('Not configured for sync');
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Fetch vocabulary from VocabLoop API
    const response = await fetch(`${settings.apiUrl}/api/vocabulary`, {
      headers: {
        'Authorization': `Bearer ${settings.authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Categorize vocabulary by mastery level
    const vocabulary = {
      mastered: [],
      learning: [],
      unknown: [],
    };

    for (const card of data.cards || []) {
      const word = card.spanish?.toLowerCase();
      if (!word) continue;

      if (card.intervalDays >= 21) {
        vocabulary.mastered.push({
          word,
          english: card.english,
          intervalDays: card.intervalDays,
        });
      } else if (card.intervalDays >= 1) {
        vocabulary.learning.push({
          word,
          english: card.english,
          intervalDays: card.intervalDays,
        });
      }
    }

    // Store vocabulary
    await chrome.storage.local.set({
      vocabulary,
      lastUpdated: Date.now(),
    });

    // Update settings with sync time
    await chrome.storage.local.set({
      settings: {
        ...settings,
        lastSyncAt: Date.now(),
      },
    });

    // Notify content scripts to refresh
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'VOCABULARY_UPDATED' });
      } catch {
        // Tab might not have content script loaded
      }
    }

    console.log('Vocabulary synced:', {
      mastered: vocabulary.mastered.length,
      learning: vocabulary.learning.length,
    });

    return { success: true, counts: {
      mastered: vocabulary.mastered.length,
      learning: vocabulary.learning.length,
    }};
  } catch (error) {
    console.error('Sync failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Import vocabulary from local VocabLoop app
 * (For users without cloud sync)
 */
async function importLocalVocabulary(cards) {
  const vocabulary = {
    mastered: [],
    learning: [],
    unknown: [],
  };

  for (const card of cards) {
    const word = card.spanish?.toLowerCase();
    if (!word) continue;

    if (card.intervalDays >= 21) {
      vocabulary.mastered.push({
        word,
        english: card.english,
        intervalDays: card.intervalDays,
      });
    } else if (card.intervalDays >= 1) {
      vocabulary.learning.push({
        word,
        english: card.english,
        intervalDays: card.intervalDays,
      });
    }
  }

  await chrome.storage.local.set({
    vocabulary,
    lastUpdated: Date.now(),
  });

  // Notify content scripts
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'VOCABULARY_UPDATED' });
    } catch {
      // Tab might not have content script loaded
    }
  }

  return {
    mastered: vocabulary.mastered.length,
    learning: vocabulary.learning.length,
  };
}

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_VOCABULARY':
      chrome.storage.local.get('vocabulary').then((result) => {
        sendResponse(result.vocabulary || { mastered: [], learning: [], unknown: [] });
      });
      return true; // Keep channel open for async response

    case 'GET_SETTINGS':
      chrome.storage.local.get('settings').then((result) => {
        sendResponse(result.settings || DEFAULT_SETTINGS);
      });
      return true;

    case 'UPDATE_SETTINGS':
      chrome.storage.local.get('settings').then(async (result) => {
        const newSettings = { ...result.settings, ...message.settings };
        await chrome.storage.local.set({ settings: newSettings });
        sendResponse({ success: true });
      });
      return true;

    case 'SYNC_VOCABULARY':
      syncVocabulary().then(sendResponse);
      return true;

    case 'IMPORT_VOCABULARY':
      importLocalVocabulary(message.cards).then(sendResponse);
      return true;

    case 'ADD_TO_DECK':
      // Queue word for adding to VocabLoop deck
      handleAddToDeck(message.word, message.context).then(sendResponse);
      return true;

    case 'GET_STATS':
      chrome.storage.local.get(['vocabulary', 'settings']).then((result) => {
        sendResponse({
          mastered: result.vocabulary?.mastered?.length || 0,
          learning: result.vocabulary?.learning?.length || 0,
          lastSync: result.settings?.lastSyncAt,
          highlightingEnabled: result.settings?.highlightingEnabled ?? true,
        });
      });
      return true;

    default:
      console.log('Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
      return false;
  }
});

/**
 * Handle adding unknown word to VocabLoop deck
 */
async function handleAddToDeck(word, context) {
  const { settings } = await chrome.storage.local.get('settings');

  if (!settings?.apiUrl || !settings?.authToken) {
    // Queue for later sync or open VocabLoop app
    const { pendingWords = [] } = await chrome.storage.local.get('pendingWords');
    pendingWords.push({
      word,
      context,
      timestamp: Date.now(),
    });
    await chrome.storage.local.set({ pendingWords });

    return { success: true, queued: true };
  }

  try {
    const response = await fetch(`${settings.apiUrl}/api/cards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spanish: word,
        context,
        source: 'browser-extension',
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    // Queue for later
    const { pendingWords = [] } = await chrome.storage.local.get('pendingWords');
    pendingWords.push({
      word,
      context,
      timestamp: Date.now(),
    });
    await chrome.storage.local.set({ pendingWords });

    return { success: true, queued: true, error: error.message };
  }
}

// Log when service worker starts
console.log('VocabLoop background service worker started');
