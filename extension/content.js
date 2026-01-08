/**
 * VocabLoop Extension Content Script
 *
 * Scans webpage text and highlights Spanish vocabulary words
 * based on the user's VocabLoop learning progress.
 */

// Cache for vocabulary data
let vocabulary = {
  mastered: [],   // Green highlight
  learning: [],   // Yellow highlight
  unknown: [],    // Underline (detected but not in deck)
};

// Settings cache
let settings = {
  highlightingEnabled: true,
  showTranslations: true,
};

// Set of already-processed text nodes (to avoid re-processing)
const processedNodes = new WeakSet();

// Word lookup maps for fast matching
let masteredWords = new Map();
let learningWords = new Map();

/**
 * Initialize content script
 */
async function init() {
  // Load vocabulary and settings from storage
  await loadVocabulary();
  await loadSettings();

  // Only highlight if enabled
  if (settings.highlightingEnabled) {
    highlightPage();
  }

  // Listen for updates from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'VOCABULARY_UPDATED':
        loadVocabulary().then(() => {
          if (settings.highlightingEnabled) {
            unhighlightPage();
            highlightPage();
          }
        });
        sendResponse({ success: true });
        break;

      case 'SETTINGS_UPDATED':
        loadSettings().then(() => {
          if (settings.highlightingEnabled) {
            highlightPage();
          } else {
            unhighlightPage();
          }
        });
        sendResponse({ success: true });
        break;

      case 'TOGGLE_HIGHLIGHTING':
        settings.highlightingEnabled = !settings.highlightingEnabled;
        if (settings.highlightingEnabled) {
          highlightPage();
        } else {
          unhighlightPage();
        }
        sendResponse({ enabled: settings.highlightingEnabled });
        break;
    }
  });

  // Observe DOM changes for dynamically loaded content
  observeDOMChanges();
}

/**
 * Load vocabulary from extension storage
 */
async function loadVocabulary() {
  try {
    const result = await chrome.runtime.sendMessage({ type: 'GET_VOCABULARY' });
    vocabulary = result || { mastered: [], learning: [], unknown: [] };

    // Build lookup maps for fast word matching
    masteredWords = new Map();
    for (const item of vocabulary.mastered) {
      masteredWords.set(item.word.toLowerCase(), item);
    }

    learningWords = new Map();
    for (const item of vocabulary.learning) {
      learningWords.set(item.word.toLowerCase(), item);
    }
  } catch (error) {
    console.error('VocabLoop: Failed to load vocabulary', error);
  }
}

/**
 * Load settings from extension storage
 */
async function loadSettings() {
  try {
    const result = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    settings = result || { highlightingEnabled: true, showTranslations: true };
  } catch (error) {
    console.error('VocabLoop: Failed to load settings', error);
  }
}

/**
 * Check if a word is Spanish (basic heuristic)
 */
function isLikelySpanish(word) {
  // Common Spanish word endings
  const spanishEndings = [
    'ción', 'sión', 'dad', 'mente', 'ando', 'iendo',
    'ado', 'ido', 'ar', 'er', 'ir', 'ía', 'ío',
    'ero', 'era', 'oso', 'osa', 'able', 'ible'
  ];

  // Spanish-specific characters
  const spanishChars = /[áéíóúüñ¿¡]/i;

  const lower = word.toLowerCase();

  if (spanishChars.test(word)) return true;
  for (const ending of spanishEndings) {
    if (lower.endsWith(ending)) return true;
  }

  return false;
}

/**
 * Highlight all vocabulary words on the page
 */
function highlightPage() {
  if (!settings.highlightingEnabled) return;
  if (masteredWords.size === 0 && learningWords.size === 0) return;

  // Walk the DOM and find text nodes
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip script, style, and already-processed nodes
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tagName = parent.tagName?.toUpperCase();
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip if already highlighted
        if (parent.classList?.contains('vocabloop-highlight')) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip if no text content
        if (!node.textContent?.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (!processedNodes.has(node)) {
      textNodes.push(node);
    }
  }

  // Process text nodes in batches to avoid blocking
  processBatch(textNodes, 0, 50);
}

/**
 * Process a batch of text nodes
 */
function processBatch(nodes, start, batchSize) {
  const end = Math.min(start + batchSize, nodes.length);

  for (let i = start; i < end; i++) {
    processTextNode(nodes[i]);
  }

  if (end < nodes.length) {
    // Schedule next batch
    requestAnimationFrame(() => processBatch(nodes, end, batchSize));
  }
}

/**
 * Process a single text node, wrapping vocabulary words in spans
 */
function processTextNode(textNode) {
  if (processedNodes.has(textNode)) return;

  const text = textNode.textContent;
  if (!text?.trim()) return;

  // Split by word boundaries, keeping delimiters
  const parts = text.split(/(\s+|[.,;:!?¿¡"'()[\]{}])/);

  let hasHighlights = false;
  const newContent = [];

  for (const part of parts) {
    const wordLower = part.toLowerCase().trim();

    // Check if word is in vocabulary
    const masteredItem = masteredWords.get(wordLower);
    const learningItem = learningWords.get(wordLower);

    if (masteredItem) {
      hasHighlights = true;
      newContent.push(createHighlight(part, 'mastered', masteredItem.english));
    } else if (learningItem) {
      hasHighlights = true;
      newContent.push(createHighlight(part, 'learning', learningItem.english));
    } else if (part.length > 2 && isLikelySpanish(part) && settings.showTranslations) {
      // Unknown Spanish word - underline it
      hasHighlights = true;
      newContent.push(createHighlight(part, 'unknown', null));
    } else {
      newContent.push(document.createTextNode(part));
    }
  }

  if (hasHighlights) {
    const fragment = document.createDocumentFragment();
    for (const node of newContent) {
      fragment.appendChild(node);
    }

    // Replace text node with highlighted content
    textNode.parentNode.replaceChild(fragment, textNode);
  }

  processedNodes.add(textNode);
}

/**
 * Create a highlight span for a word
 */
function createHighlight(word, level, english) {
  const span = document.createElement('span');
  span.textContent = word;
  span.className = `vocabloop-highlight vocabloop-${level}`;

  if (english && settings.showTranslations) {
    span.setAttribute('data-vocabloop-english', english);
    span.setAttribute('title', english);
  }

  // Add click handler for unknown words
  if (level === 'unknown') {
    span.style.cursor = 'pointer';
    span.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showAddWordPopup(word, getSentenceContext(span));
    });
  }

  return span;
}

/**
 * Get sentence context around a word
 */
function getSentenceContext(element) {
  const parent = element.parentElement;
  if (!parent) return '';

  let text = parent.textContent || '';

  // Try to extract a sentence (up to 150 chars around the word)
  const wordIndex = text.indexOf(element.textContent);
  if (wordIndex >= 0) {
    const start = Math.max(0, wordIndex - 75);
    const end = Math.min(text.length, wordIndex + element.textContent.length + 75);
    text = text.substring(start, end).trim();

    if (start > 0) text = '...' + text;
    if (end < parent.textContent.length) text = text + '...';
  }

  return text;
}

/**
 * Show popup to add unknown word to VocabLoop
 */
function showAddWordPopup(word, context) {
  // Remove existing popup
  const existing = document.querySelector('.vocabloop-add-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.className = 'vocabloop-add-popup';
  popup.innerHTML = `
    <div class="vocabloop-popup-header">
      <strong>${word}</strong>
      <button class="vocabloop-popup-close">&times;</button>
    </div>
    <div class="vocabloop-popup-context">${context}</div>
    <button class="vocabloop-popup-add">Add to VocabLoop</button>
  `;

  // Position popup near cursor (simplified - could be improved)
  popup.style.position = 'fixed';
  popup.style.top = '20%';
  popup.style.left = '50%';
  popup.style.transform = 'translateX(-50%)';

  document.body.appendChild(popup);

  // Close button handler
  popup.querySelector('.vocabloop-popup-close').addEventListener('click', () => {
    popup.remove();
  });

  // Add button handler
  popup.querySelector('.vocabloop-popup-add').addEventListener('click', async () => {
    const result = await chrome.runtime.sendMessage({
      type: 'ADD_TO_DECK',
      word,
      context,
    });

    if (result.success) {
      popup.innerHTML = `
        <div class="vocabloop-popup-success">
          ${result.queued ? 'Queued for adding!' : 'Added to VocabLoop!'}
        </div>
      `;
      setTimeout(() => popup.remove(), 1500);
    } else {
      popup.querySelector('.vocabloop-popup-add').textContent = 'Error - Try Again';
    }
  });

  // Close on outside click
  document.addEventListener('click', function closePopup(e) {
    if (!popup.contains(e.target)) {
      popup.remove();
      document.removeEventListener('click', closePopup);
    }
  });
}

/**
 * Remove all highlights from the page
 */
function unhighlightPage() {
  const highlights = document.querySelectorAll('.vocabloop-highlight');
  for (const highlight of highlights) {
    const text = document.createTextNode(highlight.textContent);
    highlight.parentNode.replaceChild(text, highlight);
  }
}

/**
 * Observe DOM changes for dynamically loaded content
 */
function observeDOMChanges() {
  const observer = new MutationObserver((mutations) => {
    if (!settings.highlightingEnabled) return;

    // Debounce processing
    clearTimeout(observer.timeout);
    observer.timeout = setTimeout(() => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            highlightElement(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            processTextNode(node);
          }
        }
      }
    }, 100);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Highlight vocabulary in a specific element
 */
function highlightElement(element) {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tagName = parent.tagName?.toUpperCase();
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        if (parent.classList?.contains('vocabloop-highlight')) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  for (const textNode of textNodes) {
    processTextNode(textNode);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
