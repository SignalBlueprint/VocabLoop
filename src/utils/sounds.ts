// Sound effects for feedback using Web Audio API

const SOUNDS_KEY = 'vocabloop_sounds_enabled';

// Get or create AudioContext lazily to comply with browser autoplay policies
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  return audioContext;
}

// Resume audio context after user interaction (required by browsers)
export function resumeAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx?.state === 'suspended') {
    ctx.resume();
  }
}

// Check if sounds are enabled
export function areSoundsEnabled(): boolean {
  const stored = localStorage.getItem(SOUNDS_KEY);
  return stored === null ? true : stored === 'true'; // Default to enabled
}

// Toggle sounds
export function toggleSounds(): boolean {
  const newValue = !areSoundsEnabled();
  localStorage.setItem(SOUNDS_KEY, String(newValue));
  return newValue;
}

// Set sounds enabled
export function setSoundsEnabled(enabled: boolean): void {
  localStorage.setItem(SOUNDS_KEY, String(enabled));
}

// Play a tone with given frequency and duration
function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3): void {
  if (!areSoundsEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume if suspended
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Envelope for smooth attack and release
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

// Play multiple tones in sequence
function playMelody(notes: Array<{ freq: number; duration: number }>, type: OscillatorType = 'sine', volume: number = 0.3): void {
  if (!areSoundsEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  let time = ctx.currentTime;
  notes.forEach(({ freq, duration }) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, time);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(volume, time + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(time);
    oscillator.stop(time + duration);

    time += duration * 0.8; // Slight overlap for smoothness
  });
}

// Sound effects for different actions

// Correct answer - ascending pleasant tone
export function playCorrectSound(): void {
  playMelody([
    { freq: 523.25, duration: 0.1 }, // C5
    { freq: 659.25, duration: 0.1 }, // E5
    { freq: 783.99, duration: 0.15 }, // G5
  ], 'sine', 0.25);
}

// Wrong answer - descending tone
export function playWrongSound(): void {
  playMelody([
    { freq: 392, duration: 0.15 }, // G4
    { freq: 311.13, duration: 0.2 }, // Eb4
  ], 'triangle', 0.2);
}

// Card flip - subtle click
export function playFlipSound(): void {
  playTone(800, 0.05, 'sine', 0.15);
}

// Match found in matching game
export function playMatchSound(): void {
  playMelody([
    { freq: 587.33, duration: 0.08 }, // D5
    { freq: 880, duration: 0.12 }, // A5
  ], 'sine', 0.3);
}

// Game complete / celebration
export function playCelebrationSound(): void {
  playMelody([
    { freq: 523.25, duration: 0.12 }, // C5
    { freq: 659.25, duration: 0.12 }, // E5
    { freq: 783.99, duration: 0.12 }, // G5
    { freq: 1046.5, duration: 0.2 }, // C6
  ], 'sine', 0.3);
}

// XP earned - quick positive blip
export function playXPSound(): void {
  playTone(1200, 0.08, 'sine', 0.15);
}

// Hint revealed
export function playHintSound(): void {
  playTone(600, 0.1, 'triangle', 0.2);
}

// Streak milestone
export function playStreakSound(): void {
  playMelody([
    { freq: 440, duration: 0.1 }, // A4
    { freq: 554.37, duration: 0.1 }, // C#5
    { freq: 659.25, duration: 0.1 }, // E5
    { freq: 880, duration: 0.15 }, // A5
  ], 'sine', 0.25);
}

// Button tap - subtle feedback
export function playTapSound(): void {
  playTone(600, 0.03, 'sine', 0.1);
}

// Timer warning
export function playWarningSound(): void {
  playMelody([
    { freq: 440, duration: 0.15 },
    { freq: 440, duration: 0.15 },
  ], 'square', 0.15);
}

// Level up
export function playLevelUpSound(): void {
  playMelody([
    { freq: 523.25, duration: 0.1 }, // C5
    { freq: 587.33, duration: 0.1 }, // D5
    { freq: 659.25, duration: 0.1 }, // E5
    { freq: 783.99, duration: 0.1 }, // G5
    { freq: 1046.5, duration: 0.2 }, // C6
  ], 'sine', 0.3);
}
