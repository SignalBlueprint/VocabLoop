/**
 * Text-to-speech utility using Web SpeechSynthesis API.
 */

/**
 * Check if speech synthesis is supported.
 */
export function isSpeechSupported(): boolean {
  return 'speechSynthesis' in window;
}

/**
 * Get available Spanish voices.
 */
export function getSpanishVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];

  const voices = window.speechSynthesis.getVoices();
  return voices.filter(voice =>
    voice.lang.startsWith('es')
  );
}

/**
 * Get the best available Spanish voice.
 * Prefers es-ES, then es-MX, then any Spanish voice.
 */
export function getBestSpanishVoice(): SpeechSynthesisVoice | null {
  const voices = getSpanishVoices();

  if (voices.length === 0) return null;

  // Prefer es-ES
  const esES = voices.find(v => v.lang === 'es-ES');
  if (esES) return esES;

  // Then es-MX
  const esMX = voices.find(v => v.lang === 'es-MX');
  if (esMX) return esMX;

  // Any Spanish voice
  return voices[0];
}

/**
 * Speak text in Spanish.
 */
export function speak(text: string, slow: boolean = false): void {
  if (!isSpeechSupported()) {
    console.warn('Speech synthesis not supported');
    return;
  }

  // Cancel any current speech
  stop();

  const utterance = new SpeechSynthesisUtterance(text);

  // Set Spanish voice
  const voice = getBestSpanishVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    // Fallback to just setting the language
    utterance.lang = 'es-ES';
  }

  // Set rate
  utterance.rate = slow ? 0.6 : 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
}

/**
 * Stop current speech.
 */
export function stop(): void {
  if (!isSpeechSupported()) return;

  window.speechSynthesis.cancel();
}

/**
 * Check if currently speaking.
 */
export function isSpeaking(): boolean {
  if (!isSpeechSupported()) return false;
  return window.speechSynthesis.speaking;
}

/**
 * Initialize voices (needed on some browsers).
 * Call this early in the app lifecycle.
 */
export function initVoices(): Promise<void> {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) {
      resolve();
      return;
    }

    // Some browsers load voices asynchronously
    if (window.speechSynthesis.getVoices().length > 0) {
      resolve();
      return;
    }

    window.speechSynthesis.addEventListener('voiceschanged', () => {
      resolve();
    }, { once: true });

    // Fallback timeout
    setTimeout(resolve, 1000);
  });
}

/**
 * Check if Spanish voices are available after initialization.
 */
export function hasSpanishVoice(): boolean {
  return getSpanishVoices().length > 0;
}
