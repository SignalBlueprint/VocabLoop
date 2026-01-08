/**
 * Speech Recognition Service
 *
 * Wraps the Web Speech API for Spanish pronunciation recognition.
 * Provides fuzzy matching between expected and transcribed words.
 */

/**
 * Pronunciation comparison result
 */
export interface PronunciationResult {
  /** Whether the pronunciation was acceptable */
  match: boolean;
  /** Confidence score 0-1 */
  confidence: number;
  /** What the user actually said */
  transcript: string;
  /** Similarity score 0-1 */
  similarity: number;
  /** Specific issues detected (future enhancement) */
  issues?: string[];
}

/**
 * Speech recognition result
 */
export interface SpeechResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

/**
 * Speech recognition error
 */
export type SpeechError =
  | 'not_supported'
  | 'not_allowed'
  | 'no_speech'
  | 'audio_capture'
  | 'network'
  | 'aborted'
  | 'unknown';

/**
 * Spanish dialect options
 */
export type SpanishDialect = 'es-ES' | 'es-MX' | 'es-AR' | 'es-CO';

/**
 * Speech recognition configuration
 */
export interface SpeechConfig {
  dialect?: SpanishDialect;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

/**
 * Check if speech recognition is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Get the SpeechRecognition constructor
 */
function getSpeechRecognition(): new () => SpeechRecognition {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    throw new Error('Speech recognition not supported');
  }
  return SpeechRecognition;
}

/**
 * Recognize speech from microphone
 * Returns a promise that resolves with the transcription
 */
export function recognizeSpeech(
  config: SpeechConfig = {}
): Promise<SpeechResult> {
  return new Promise((resolve, reject) => {
    if (!isSpeechRecognitionSupported()) {
      reject({ error: 'not_supported' as SpeechError });
      return;
    }

    const {
      dialect = 'es-ES',
      continuous = false,
      interimResults = false,
      maxAlternatives = 1,
    } = config;

    const SpeechRecognition = getSpeechRecognition();
    const recognition = new SpeechRecognition();

    recognition.lang = dialect;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = maxAlternatives;

    let hasResult = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        hasResult = true;
        const alternative = result[0];
        resolve({
          transcript: alternative.transcript,
          confidence: alternative.confidence,
          isFinal: true,
        });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let error: SpeechError;
      switch (event.error) {
        case 'not-allowed':
          error = 'not_allowed';
          break;
        case 'no-speech':
          error = 'no_speech';
          break;
        case 'audio-capture':
          error = 'audio_capture';
          break;
        case 'network':
          error = 'network';
          break;
        case 'aborted':
          error = 'aborted';
          break;
        default:
          error = 'unknown';
      }
      reject({ error });
    };

    recognition.onend = () => {
      if (!hasResult) {
        reject({ error: 'no_speech' as SpeechError });
      }
    };

    recognition.start();
  });
}

/**
 * Create a reusable speech recognition session
 */
export function createSpeechSession(config: SpeechConfig = {}): {
  start: () => void;
  stop: () => void;
  abort: () => void;
  onResult: (callback: (result: SpeechResult) => void) => void;
  onError: (callback: (error: SpeechError) => void) => void;
  onEnd: (callback: () => void) => void;
} {
  if (!isSpeechRecognitionSupported()) {
    throw new Error('Speech recognition not supported');
  }

  const {
    dialect = 'es-ES',
    continuous = false,
    interimResults = true,
    maxAlternatives = 1,
  } = config;

  const SpeechRecognition = getSpeechRecognition();
  const recognition = new SpeechRecognition();

  recognition.lang = dialect;
  recognition.continuous = continuous;
  recognition.interimResults = interimResults;
  recognition.maxAlternatives = maxAlternatives;

  let resultCallback: ((result: SpeechResult) => void) | null = null;
  let errorCallback: ((error: SpeechError) => void) | null = null;
  let endCallback: (() => void) | null = null;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const result = event.results[event.results.length - 1];
    const alternative = result[0];
    if (resultCallback) {
      resultCallback({
        transcript: alternative.transcript,
        confidence: alternative.confidence,
        isFinal: result.isFinal,
      });
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    let error: SpeechError;
    switch (event.error) {
      case 'not-allowed':
        error = 'not_allowed';
        break;
      case 'no-speech':
        error = 'no_speech';
        break;
      case 'audio-capture':
        error = 'audio_capture';
        break;
      case 'network':
        error = 'network';
        break;
      case 'aborted':
        error = 'aborted';
        break;
      default:
        error = 'unknown';
    }
    if (errorCallback) {
      errorCallback(error);
    }
  };

  recognition.onend = () => {
    if (endCallback) {
      endCallback();
    }
  };

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
    onResult: (callback) => {
      resultCallback = callback;
    },
    onError: (callback) => {
      errorCallback = callback;
    },
    onEnd: (callback) => {
      endCallback = callback;
    },
  };
}

/**
 * Normalize Spanish text for comparison
 * Removes accents, lowercases, and normalizes whitespace
 */
export function normalizeSpanish(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[¿¡.,!?;:'"]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity between two strings (0-1)
 */
export function calculateSimilarity(a: string, b: string): number {
  const normalizedA = normalizeSpanish(a);
  const normalizedB = normalizeSpanish(b);

  if (normalizedA === normalizedB) {
    return 1;
  }

  const maxLength = Math.max(normalizedA.length, normalizedB.length);
  if (maxLength === 0) {
    return 1;
  }

  const distance = levenshteinDistance(normalizedA, normalizedB);
  return 1 - distance / maxLength;
}

/**
 * Compare pronunciation against expected word
 */
export function comparePronunciation(
  expected: string,
  transcript: string,
  confidence: number = 1
): PronunciationResult {
  const similarity = calculateSimilarity(expected, transcript);

  // Match if similarity is above threshold
  // Use lower threshold if confidence is low
  const threshold = confidence > 0.8 ? 0.7 : 0.6;
  const match = similarity >= threshold;

  return {
    match,
    confidence,
    transcript,
    similarity,
  };
}

/**
 * Get user-friendly error message
 */
export function getSpeechErrorMessage(error: SpeechError): string {
  switch (error) {
    case 'not_supported':
      return 'Speech recognition is not supported in this browser. Please try Chrome or Edge.';
    case 'not_allowed':
      return 'Microphone access was denied. Please allow microphone access to use pronunciation practice.';
    case 'no_speech':
      return "No speech detected. Please try speaking louder or check your microphone.";
    case 'audio_capture':
      return 'Could not capture audio. Please check your microphone connection.';
    case 'network':
      return 'Network error. Please check your internet connection.';
    case 'aborted':
      return 'Speech recognition was cancelled.';
    case 'unknown':
    default:
      return 'An error occurred. Please try again.';
  }
}

/**
 * Play text as speech using Web Speech Synthesis
 */
export function speakSpanish(
  text: string,
  dialect: SpanishDialect = 'es-ES'
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = dialect;
    utterance.rate = 0.9; // Slightly slower for learners

    // Try to find a Spanish voice
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find((v) => v.lang.startsWith('es'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    window.speechSynthesis.speak(utterance);
  });
}
