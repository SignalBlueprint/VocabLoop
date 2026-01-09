/**
 * VocabLoop Extension Popup Script
 */

// DOM Elements
const elements = {
  // Stats
  masteredCount: document.getElementById('masteredCount'),
  learningCount: document.getElementById('learningCount'),

  // Sync
  syncStatus: document.getElementById('syncStatus'),
  syncBtn: document.getElementById('syncBtn'),

  // Toggles
  highlightToggle: document.getElementById('highlightToggle'),
  translationToggle: document.getElementById('translationToggle'),

  // Connection
  notConnected: document.getElementById('notConnected'),
  connected: document.getElementById('connected'),
  connectBtn: document.getElementById('connectBtn'),
  importBtn: document.getElementById('importBtn'),
  disconnectBtn: document.getElementById('disconnectBtn'),

  // Settings
  settingsBtn: document.getElementById('settingsBtn'),
  settingsPanel: document.getElementById('settingsPanel'),
  backBtn: document.getElementById('backBtn'),
  apiUrl: document.getElementById('apiUrl'),
  authToken: document.getElementById('authToken'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
};

/**
 * Initialize popup
 */
async function init() {
  // Load stats and settings
  await loadStats();
  await loadSettings();

  // Set up event listeners
  setupEventListeners();
}

/**
 * Load vocabulary stats
 */
async function loadStats() {
  try {
    const stats = await chrome.runtime.sendMessage({ type: 'GET_STATS' });

    elements.masteredCount.textContent = stats.mastered || 0;
    elements.learningCount.textContent = stats.learning || 0;
    elements.highlightToggle.checked = stats.highlightingEnabled !== false;

    // Update sync status
    if (stats.lastSync) {
      const lastSync = new Date(stats.lastSync);
      const ago = formatTimeAgo(lastSync);
      elements.syncStatus.innerHTML = `
        <span class="sync-icon">✓</span>
        <span class="sync-text">Synced ${ago}</span>
      `;
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

/**
 * Load settings
 */
async function loadSettings() {
  try {
    const settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });

    elements.highlightToggle.checked = settings.highlightingEnabled !== false;
    elements.translationToggle.checked = settings.showTranslations !== false;

    // Update connection status
    if (settings.authToken) {
      elements.notConnected.style.display = 'none';
      elements.connected.style.display = 'block';
    } else {
      elements.notConnected.style.display = 'block';
      elements.connected.style.display = 'none';
    }

    // Fill settings form
    elements.apiUrl.value = settings.apiUrl || '';
    elements.authToken.value = settings.authToken || '';
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Sync button
  elements.syncBtn.addEventListener('click', async () => {
    elements.syncBtn.disabled = true;
    elements.syncBtn.textContent = 'Syncing...';
    elements.syncStatus.innerHTML = `
      <span class="sync-icon syncing">⟳</span>
      <span class="sync-text">Syncing...</span>
    `;

    const result = await chrome.runtime.sendMessage({ type: 'SYNC_VOCABULARY' });

    if (result.success) {
      elements.syncStatus.innerHTML = `
        <span class="sync-icon">✓</span>
        <span class="sync-text">Just now</span>
      `;
      await loadStats();
    } else {
      elements.syncStatus.innerHTML = `
        <span class="sync-icon">✗</span>
        <span class="sync-text">Sync failed</span>
      `;
    }

    elements.syncBtn.disabled = false;
    elements.syncBtn.textContent = 'Sync Now';
  });

  // Highlighting toggle
  elements.highlightToggle.addEventListener('change', async (e) => {
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { highlightingEnabled: e.target.checked },
    });

    // Notify content scripts
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' });
      } catch {
        // Content script might not be loaded
      }
    }
  });

  // Translation toggle
  elements.translationToggle.addEventListener('change', async (e) => {
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { showTranslations: e.target.checked },
    });
  });

  // Settings button
  elements.settingsBtn.addEventListener('click', () => {
    document.querySelector('.popup-container').style.display = 'none';
    elements.settingsPanel.style.display = 'block';
  });

  // Back button
  elements.backBtn.addEventListener('click', () => {
    elements.settingsPanel.style.display = 'none';
    document.querySelector('.popup-container').style.display = 'block';
  });

  // Save settings
  elements.saveSettingsBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: {
        apiUrl: elements.apiUrl.value,
        authToken: elements.authToken.value,
      },
    });

    // Go back and refresh
    elements.settingsPanel.style.display = 'none';
    document.querySelector('.popup-container').style.display = 'block';
    await loadSettings();
  });

  // Connect button (opens VocabLoop app to authenticate)
  elements.connectBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://vocabloop.app/settings/extension' });
  });

  // Import button (opens file picker or shows instructions)
  elements.importBtn.addEventListener('click', async () => {
    // Try to import from VocabLoop localStorage via active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tabs[0]?.url?.includes('vocabloop')) {
      // If on VocabLoop site, try to get data directly
      try {
        const result = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            // Get cards from localStorage (VocabLoop format)
            const stored = localStorage.getItem('vocabloop-cards');
            return stored ? JSON.parse(stored) : null;
          },
        });

        if (result[0]?.result) {
          const counts = await chrome.runtime.sendMessage({
            type: 'IMPORT_VOCABULARY',
            cards: result[0].result,
          });

          alert(`Imported! ${counts.mastered} mastered, ${counts.learning} learning words.`);
          await loadStats();
          return;
        }
      } catch (e) {
        console.error('Failed to import:', e);
      }
    }

    // Otherwise show instructions
    alert(
      'To import your vocabulary:\n\n' +
      '1. Open VocabLoop app in a browser tab\n' +
      '2. Go to Settings > Export\n' +
      '3. Copy your vocabulary data\n' +
      '4. Paste it in the extension settings'
    );
  });

  // Disconnect button
  elements.disconnectBtn.addEventListener('click', async () => {
    if (confirm('Disconnect from VocabLoop? Your local vocabulary cache will be kept.')) {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: { authToken: null },
      });
      await loadSettings();
    }
  });
}

/**
 * Format time ago string
 */
function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
