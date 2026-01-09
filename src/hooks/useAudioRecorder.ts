import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Audio recording state
 */
export type RecordingState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error';

/**
 * Error types for audio recording
 */
export type RecordingError =
  | 'permission_denied'
  | 'not_supported'
  | 'no_device'
  | 'unknown';

/**
 * Hook result
 */
export interface UseAudioRecorderResult {
  /** Current recording state */
  state: RecordingState;
  /** Error details if state is 'error' */
  error: RecordingError | null;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording and return audio blob */
  stopRecording: () => Promise<Blob | null>;
  /** Cancel recording without getting blob */
  cancelRecording: () => void;
  /** Current audio level (0-1) for visualization */
  audioLevel: number;
  /** Waveform data for visualization (last N samples) */
  waveformData: Float32Array;
  /** Recording duration in seconds */
  duration: number;
  /** Check if browser supports audio recording */
  isSupported: boolean;
}

/**
 * Check if audio recording is supported
 */
function checkSupport(): boolean {
  return !!(
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof window.MediaRecorder !== 'undefined' &&
    typeof window.AudioContext !== 'undefined'
  );
}

/**
 * Hook for audio recording with waveform visualization
 */
export function useAudioRecorder(): UseAudioRecorderResult {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<RecordingError | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformData, setWaveformData] = useState<Float32Array>(
    new Float32Array(128)
  );
  const [duration, setDuration] = useState(0);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isSupported = checkSupport();

  /**
   * Clean up resources
   */
  const cleanup = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current?.state !== 'inactive') {
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // Ignore errors during cleanup
      }
    }
    mediaRecorderRef.current = null;

    // Stop media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current?.state !== 'closed') {
      try {
        audioContextRef.current?.close();
      } catch {
        // Ignore errors during cleanup
      }
    }
    audioContextRef.current = null;
    analyserRef.current = null;

    // Reset chunks
    chunksRef.current = [];
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  /**
   * Update waveform and audio level
   */
  const updateVisualization = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(dataArray);

    // Calculate RMS for audio level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const level = Math.min(1, rms * 5); // Scale up for visibility
    setAudioLevel(level);

    // Sample waveform data (take every Nth sample)
    const samples = 128;
    const step = Math.floor(dataArray.length / samples);
    const waveform = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      waveform[i] = dataArray[i * step];
    }
    setWaveformData(waveform);

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(updateVisualization);
  }, []);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setState('error');
      setError('not_supported');
      return;
    }

    // Clean up any previous recording
    cleanup();
    setError(null);
    setState('requesting');

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // Set up audio context for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Start recording
      recorder.start(100); // Collect data every 100ms
      setState('recording');
      startTimeRef.current = Date.now();
      setDuration(0);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);

      // Start visualization
      updateVisualization();
    } catch (err) {
      cleanup();
      setState('error');

      if (err instanceof DOMException) {
        if (
          err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError'
        ) {
          setError('permission_denied');
        } else if (
          err.name === 'NotFoundError' ||
          err.name === 'DevicesNotFoundError'
        ) {
          setError('no_device');
        } else {
          setError('unknown');
        }
      } else {
        setError('unknown');
      }
    }
  }, [isSupported, cleanup, updateVisualization]);

  /**
   * Stop recording and return audio blob
   */
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (state !== 'recording' || !mediaRecorderRef.current) {
      return null;
    }

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current!;

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        cleanup();
        setState('stopped');
        resolve(blob);
      };

      recorder.stop();
    });
  }, [state, cleanup]);

  /**
   * Cancel recording without getting blob
   */
  const cancelRecording = useCallback(() => {
    cleanup();
    setState('idle');
    setDuration(0);
    setAudioLevel(0);
    setWaveformData(new Float32Array(128));
  }, [cleanup]);

  return {
    state,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    audioLevel,
    waveformData,
    duration,
    isSupported,
  };
}

/**
 * Get user-friendly error message
 */
export function getRecordingErrorMessage(error: RecordingError): string {
  switch (error) {
    case 'permission_denied':
      return 'Microphone access was denied. Please allow microphone access in your browser settings.';
    case 'not_supported':
      return 'Audio recording is not supported in this browser. Please try Chrome or Edge.';
    case 'no_device':
      return 'No microphone found. Please connect a microphone and try again.';
    case 'unknown':
    default:
      return 'An error occurred while recording. Please try again.';
  }
}
