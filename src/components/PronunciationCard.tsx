import { useState, useEffect, useCallback } from 'react';
import { useAudioRecorder, getRecordingErrorMessage } from '../hooks/useAudioRecorder';
import {
  recognizeSpeech,
  comparePronunciation,
  speakSpanish,
  getSpeechErrorMessage,
  isSpeechRecognitionSupported,
  type SpeechError,
  type PronunciationResult,
} from '../utils/speechRecognition';
import { RecordingIndicator, WaveformVisualizer } from './WaveformVisualizer';

interface PronunciationCardProps {
  /** The Spanish word to pronounce */
  word: string;
  /** English translation */
  translation: string;
  /** Callback when pronunciation attempt is complete */
  onResult?: (result: PronunciationResult) => void;
  /** Callback to skip this word */
  onSkip?: () => void;
  /** Dark mode */
  isDark?: boolean;
}

type CardState = 'ready' | 'listening' | 'playing' | 'recording' | 'result';

/**
 * Card component for practicing pronunciation of a single word
 */
export function PronunciationCard({
  word,
  translation,
  onResult,
  onSkip,
  isDark = false,
}: PronunciationCardProps) {
  const [state, setState] = useState<CardState>('ready');
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const recorder = useAudioRecorder();

  const isSupported = isSpeechRecognitionSupported() && recorder.isSupported;

  // Play the native pronunciation
  const handleListen = useCallback(async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setState('playing');

    try {
      await speakSpanish(word);
    } catch (err) {
      console.error('Speech synthesis error:', err);
    } finally {
      setIsPlaying(false);
      setState('ready');
    }
  }, [word, isPlaying]);

  // Start recording and speech recognition
  const handleRecord = useCallback(async () => {
    if (state === 'recording') {
      // Stop recording
      recorder.cancelRecording();
      setState('ready');
      return;
    }

    setError(null);
    setResult(null);
    setState('recording');

    try {
      // Start recording for visualization
      await recorder.startRecording();

      // Use speech recognition to get transcription
      const speechResult = await recognizeSpeech({ dialect: 'es-ES' });

      // Stop recording
      recorder.cancelRecording();

      // Compare pronunciation
      const pronunciationResult = comparePronunciation(
        word,
        speechResult.transcript,
        speechResult.confidence
      );

      setResult(pronunciationResult);
      setState('result');

      if (onResult) {
        onResult(pronunciationResult);
      }
    } catch (err) {
      recorder.cancelRecording();

      const speechError = (err as { error: SpeechError }).error;
      const recordingError = recorder.error;

      if (recordingError) {
        setError(getRecordingErrorMessage(recordingError));
      } else if (speechError) {
        setError(getSpeechErrorMessage(speechError));
      } else {
        setError('An error occurred. Please try again.');
      }

      setState('ready');
    }
  }, [state, word, recorder, onResult]);

  // Try again after result
  const handleTryAgain = useCallback(() => {
    setResult(null);
    setError(null);
    setState('ready');
  }, []);

  // Skip this word
  const handleSkip = useCallback(() => {
    recorder.cancelRecording();
    if (onSkip) {
      onSkip();
    }
  }, [recorder, onSkip]);

  // Cleanup on unmount or word change
  useEffect(() => {
    return () => {
      recorder.cancelRecording();
    };
  }, [word, recorder]);

  // Not supported message
  if (!isSupported) {
    return (
      <div
        className={`rounded-xl p-6 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        } shadow-lg`}
      >
        <div className="text-center">
          <span className="text-4xl mb-4 block">🎤</span>
          <h3
            className={`text-lg font-semibold mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            Pronunciation Practice
          </h3>
          <p
            className={`text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Speech recognition is not supported in this browser.
            Please try Chrome or Edge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-6 ${
        isDark ? 'bg-gray-800' : 'bg-white'
      } shadow-lg`}
    >
      {/* Word Display */}
      <div className="text-center mb-6">
        <h2
          className={`text-3xl font-bold mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          {word}
        </h2>
        <p
          className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          {translation}
        </p>
      </div>

      {/* Listen Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={handleListen}
          disabled={isPlaying || state === 'recording'}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
            isPlaying
              ? isDark
                ? 'bg-blue-600 text-white'
                : 'bg-blue-500 text-white'
              : isDark
              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="text-xl">{isPlaying ? '🔊' : '👂'}</span>
          {isPlaying ? 'Playing...' : 'Listen'}
        </button>
      </div>

      {/* Recording Visualization */}
      {state === 'recording' && (
        <div className="mb-6">
          <div className="flex justify-center mb-3">
            <RecordingIndicator
              isRecording={true}
              duration={recorder.duration}
              audioLevel={recorder.audioLevel}
              isDark={isDark}
            />
          </div>
          <WaveformVisualizer
            waveformData={recorder.waveformData}
            width={280}
            height={60}
            isActive={true}
            isDark={isDark}
          />
        </div>
      )}

      {/* Result Display */}
      {state === 'result' && result && (
        <div className="mb-6">
          <div
            className={`rounded-lg p-4 text-center ${
              result.match
                ? isDark
                  ? 'bg-green-900/50 border border-green-700'
                  : 'bg-green-50 border border-green-200'
                : isDark
                ? 'bg-red-900/50 border border-red-700'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <span className="text-4xl block mb-2">
              {result.match ? '✅' : '❌'}
            </span>
            <p
              className={`font-semibold ${
                result.match
                  ? isDark
                    ? 'text-green-400'
                    : 'text-green-700'
                  : isDark
                  ? 'text-red-400'
                  : 'text-red-700'
              }`}
            >
              {result.match ? '¡Muy bien!' : 'Try again'}
            </p>
            <p
              className={`text-sm mt-1 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              You said: "{result.transcript}"
            </p>
            <p
              className={`text-xs mt-1 ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`}
            >
              Similarity: {Math.round(result.similarity * 100)}%
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          className={`rounded-lg p-4 mb-6 text-center ${
            isDark
              ? 'bg-red-900/50 border border-red-700'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <p
            className={`text-sm ${
              isDark ? 'text-red-400' : 'text-red-700'
            }`}
          >
            {error}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        {state !== 'result' ? (
          <>
            <button
              onClick={handleRecord}
              disabled={isPlaying}
              className={`flex items-center gap-2 px-8 py-3 rounded-full font-medium transition-all ${
                state === 'recording'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : isDark
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              <span className="text-xl">
                {state === 'recording' ? '⏹' : '🎤'}
              </span>
              {state === 'recording' ? 'Stop' : 'Record'}
            </button>
            {onSkip && (
              <button
                onClick={handleSkip}
                disabled={state === 'recording'}
                className={`px-6 py-3 rounded-full font-medium transition-colors ${
                  isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Skip
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={handleTryAgain}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium ${
                isDark
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <span>🔄</span>
              Try Again
            </button>
            {onSkip && result?.match && (
              <button
                onClick={handleSkip}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium ${
                  isDark
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                <span>➡️</span>
                Next
              </button>
            )}
          </>
        )}
      </div>

      {/* Instructions */}
      <p
        className={`text-center text-xs mt-4 ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`}
      >
        {state === 'ready' && 'Listen first, then record your pronunciation'}
        {state === 'recording' && 'Say the word clearly, then click Stop'}
        {state === 'result' && result?.match && '🎉 Great job!'}
        {state === 'result' && !result?.match && "Don't worry, practice makes perfect!"}
      </p>
    </div>
  );
}
