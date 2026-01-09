/**
 * VocabLoop SDK
 *
 * Embeddable vocabulary learning widgets for third-party integration.
 *
 * @example
 * ```javascript
 * import VocabLoop from '@vocabloop/sdk';
 *
 * // Initialize with API key
 * VocabLoop.init({
 *   apiKey: 'your-api-key',
 *   theme: 'auto',
 * });
 *
 * // Render a mini review widget
 * VocabLoop.renderMiniReview('#review-container', {
 *   cardCount: 5,
 *   size: 'medium',
 * });
 *
 * // Listen for events
 * VocabLoop.on('review-complete', (data) => {
 *   console.log('Review completed:', data);
 * });
 * ```
 */

import type {
  VocabLoopConfig,
  MiniReviewConfig,
  BadgeConfig,
  HighlightConfig,
  CardPopupConfig,
  VocabLoopEvent,
  VocabLoopEventData,
  VocabStats,
  VocabWord,
} from './types';
import { initAPIClient, getAPIClient } from './utils/api';
import { eventEmitter } from './utils/events';
import { MiniReview } from './components/MiniReview';
import { VocabBadge } from './components/VocabBadge';
import { WordHighlight } from './components/WordHighlight';
import { CardPopup, showCardPopup } from './components/CardPopup';

// SDK Version
const VERSION = '1.0.0';

// Configuration state
let isInitialized = false;
let currentConfig: VocabLoopConfig | null = null;

/**
 * Initialize the VocabLoop SDK
 */
function init(config: VocabLoopConfig): void {
  if (isInitialized) {
    console.warn('VocabLoop SDK: Already initialized. Call destroy() first to reinitialize.');
    return;
  }

  currentConfig = config;
  initAPIClient(config);
  isInitialized = true;

  eventEmitter.emit('ready', { version: VERSION });

  if (config.apiKey) {
    // Auto-authenticate with API key
    getAPIClient()
      .authenticate(config.apiKey)
      .then((result) => {
        if (result.success) {
          eventEmitter.emit('authenticated', { userId: currentConfig?.userId });
        }
      })
      .catch((error) => {
        eventEmitter.emit('error', {
          code: 'AUTH_FAILED',
          message: error.message,
        });
      });
  }
}

/**
 * Destroy the SDK instance
 */
function destroy(): void {
  if (!isInitialized) return;

  eventEmitter.removeAllListeners();
  currentConfig = null;
  isInitialized = false;
}

/**
 * Check if SDK is initialized
 */
function isReady(): boolean {
  return isInitialized;
}

/**
 * Get current configuration
 */
function getConfig(): VocabLoopConfig | null {
  return currentConfig;
}

/**
 * Subscribe to SDK events
 */
function on<T extends VocabLoopEvent>(
  event: T,
  handler: (data: VocabLoopEventData[T]) => void
): void {
  eventEmitter.on(event, handler);
}

/**
 * Unsubscribe from SDK events
 */
function off<T extends VocabLoopEvent>(
  event: T,
  handler: (data: VocabLoopEventData[T]) => void
): void {
  eventEmitter.off(event, handler);
}

/**
 * Get container element from selector or element
 */
function getContainer(container: HTMLElement | string): HTMLElement | null {
  if (typeof container === 'string') {
    return document.querySelector(container);
  }
  return container;
}

/**
 * Render Mini Review widget
 */
function renderMiniReview(
  container: HTMLElement | string,
  config: Omit<MiniReviewConfig, 'container'> = {}
): { unmount: () => void } | null {
  if (!isInitialized) {
    console.error('VocabLoop SDK: Not initialized. Call init() first.');
    return null;
  }

  const el = getContainer(container);
  if (!el) {
    console.error('VocabLoop SDK: Container not found:', container);
    return null;
  }

  // Dynamic import for React rendering
  return renderReactComponent(el, MiniReview, { config });
}

/**
 * Render Vocab Badge widget
 */
function renderBadge(
  container: HTMLElement | string,
  config: Omit<BadgeConfig, 'container'> = {}
): { unmount: () => void } | null {
  if (!isInitialized) {
    console.error('VocabLoop SDK: Not initialized. Call init() first.');
    return null;
  }

  const el = getContainer(container);
  if (!el) {
    console.error('VocabLoop SDK: Container not found:', container);
    return null;
  }

  return renderReactComponent(el, VocabBadge, { config });
}

/**
 * Render Word Highlight in container
 */
function renderHighlight(
  container: HTMLElement | string,
  text: string,
  config: Omit<HighlightConfig, 'container'> = {}
): { unmount: () => void } | null {
  if (!isInitialized) {
    console.error('VocabLoop SDK: Not initialized. Call init() first.');
    return null;
  }

  const el = getContainer(container);
  if (!el) {
    console.error('VocabLoop SDK: Container not found:', container);
    return null;
  }

  return renderReactComponent(el, WordHighlight, { config, children: text });
}

/**
 * Show a card popup
 */
function showCard(word: VocabWord, config: Partial<CardPopupConfig> = {}): void {
  if (!isInitialized) {
    console.error('VocabLoop SDK: Not initialized. Call init() first.');
    return;
  }

  showCardPopup(word, config);
}

/**
 * Get user vocabulary stats
 */
async function getStats(): Promise<VocabStats | null> {
  if (!isInitialized) {
    console.error('VocabLoop SDK: Not initialized. Call init() first.');
    return null;
  }

  const api = getAPIClient();
  const result = await api.getStats();
  return result.success ? result.data || null : null;
}

/**
 * Get user vocabulary list
 */
async function getVocabulary(): Promise<VocabWord[]> {
  if (!isInitialized) {
    console.error('VocabLoop SDK: Not initialized. Call init() first.');
    return [];
  }

  const api = getAPIClient();
  const result = await api.getVocabulary();
  return result.success ? result.data || [] : [];
}

/**
 * Add a word to user's vocabulary
 */
async function addWord(word: string, context?: string): Promise<VocabWord | null> {
  if (!isInitialized) {
    console.error('VocabLoop SDK: Not initialized. Call init() first.');
    return null;
  }

  const api = getAPIClient();
  const result = await api.addWord(word, context);

  if (result.success && result.data) {
    eventEmitter.emit('word-added', {
      word: result.data.word,
      translation: result.data.translation,
    });
    return result.data;
  }

  return null;
}

/**
 * Helper to render React components
 */
function renderReactComponent(
  container: HTMLElement,
  Component: React.ComponentType<unknown>,
  props: Record<string, unknown>
): { unmount: () => void } {
  // Store root reference for unmounting
  let root: { unmount: () => void } | null = null;

  import('react-dom/client')
    .then(({ createRoot }) => {
      root = createRoot(container);
      import('react').then((React) => {
        root?.render(React.createElement(Component, props));
      });
    })
    .catch((error) => {
      console.error('VocabLoop SDK: Failed to render component:', error);
    });

  return {
    unmount: () => {
      if (root) {
        root.unmount();
      }
    },
  };
}

// Main SDK export
const VocabLoop = {
  // Core
  version: VERSION,
  init,
  destroy,
  isReady,
  getConfig,

  // Events
  on,
  off,

  // Widgets
  renderMiniReview,
  renderBadge,
  renderHighlight,
  showCard,

  // Data
  getStats,
  getVocabulary,
  addWord,

  // Components (for React users)
  components: {
    MiniReview,
    VocabBadge,
    WordHighlight,
    CardPopup,
  },
};

// Export types
export type {
  VocabLoopConfig,
  MiniReviewConfig,
  BadgeConfig,
  HighlightConfig,
  CardPopupConfig,
  VocabLoopEvent,
  VocabLoopEventData,
  VocabStats,
  VocabWord,
};

// Export components for direct React usage
export { MiniReview, VocabBadge, WordHighlight, CardPopup, showCardPopup };

// Default export
export default VocabLoop;

// UMD global export for script tag usage
if (typeof window !== 'undefined') {
  (window as unknown as { VocabLoop: typeof VocabLoop }).VocabLoop = VocabLoop;
}
