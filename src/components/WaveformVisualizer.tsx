import { useRef, useEffect } from 'react';

interface WaveformVisualizerProps {
  /** Waveform data to display */
  waveformData: Float32Array;
  /** Color of the waveform */
  color?: string;
  /** Background color */
  backgroundColor?: string;
  /** Width of the visualizer */
  width?: number;
  /** Height of the visualizer */
  height?: number;
  /** Whether currently recording (animates) */
  isActive?: boolean;
  /** Dark mode */
  isDark?: boolean;
}

/**
 * Displays an audio waveform visualization
 */
export function WaveformVisualizer({
  waveformData,
  color,
  backgroundColor,
  width = 300,
  height = 80,
  isActive = false,
  isDark = false,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Default colors based on theme
  const defaultColor = isDark ? '#34d399' : '#10b981'; // Emerald
  const defaultBg = isDark ? '#1f2937' : '#f3f4f6'; // Gray

  const waveColor = color || defaultColor;
  const bgColor = backgroundColor || defaultBg;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    const samples = waveformData.length;
    const barWidth = width / samples;
    const centerY = height / 2;

    ctx.fillStyle = waveColor;
    ctx.beginPath();

    for (let i = 0; i < samples; i++) {
      const amplitude = waveformData[i];
      const barHeight = Math.abs(amplitude) * height * 0.8;
      const x = i * barWidth;

      // Draw symmetric bars (mirrored around center)
      ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
    }

    // Add glow effect when active
    if (isActive) {
      ctx.shadowColor = waveColor;
      ctx.shadowBlur = 10;
    }
  }, [waveformData, width, height, waveColor, bgColor, isActive]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '8px',
      }}
      className={`${isActive ? 'animate-pulse' : ''}`}
    />
  );
}

interface AudioLevelIndicatorProps {
  /** Current audio level (0-1) */
  level: number;
  /** Color of the indicator */
  color?: string;
  /** Dark mode */
  isDark?: boolean;
}

/**
 * Displays a simple audio level indicator (bar)
 */
export function AudioLevelIndicator({
  level,
  color,
  isDark = false,
}: AudioLevelIndicatorProps) {
  const indicatorColor = color || (isDark ? '#34d399' : '#10b981');
  const bgColor = isDark ? '#374151' : '#e5e7eb';

  return (
    <div
      className="w-full h-2 rounded-full overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      <div
        className="h-full rounded-full transition-all duration-75"
        style={{
          width: `${Math.min(100, level * 100)}%`,
          backgroundColor: indicatorColor,
        }}
      />
    </div>
  );
}

interface WaveformBarsProps {
  /** Audio level (0-1) */
  level: number;
  /** Number of bars */
  barCount?: number;
  /** Height in pixels */
  height?: number;
  /** Color */
  color?: string;
  /** Dark mode */
  isDark?: boolean;
}

/**
 * Displays animated vertical bars representing audio level
 */
export function WaveformBars({
  level,
  barCount = 5,
  height = 40,
  color,
  isDark = false,
}: WaveformBarsProps) {
  const barColor = color || (isDark ? '#34d399' : '#10b981');
  const bgColor = isDark ? '#374151' : '#e5e7eb';

  return (
    <div className="flex items-center gap-1" style={{ height: `${height}px` }}>
      {Array.from({ length: barCount }).map((_, i) => {
        // Create varied heights based on position and level
        const baseHeight = 0.3 + Math.sin(((i + 1) / barCount) * Math.PI) * 0.7;
        const animatedHeight = baseHeight * level;

        return (
          <div
            key={i}
            className="w-2 rounded-full transition-all duration-75"
            style={{
              height: `${Math.max(4, animatedHeight * height)}px`,
              backgroundColor: level > 0.05 ? barColor : bgColor,
            }}
          />
        );
      })}
    </div>
  );
}

interface RecordingIndicatorProps {
  /** Whether recording is in progress */
  isRecording: boolean;
  /** Duration in seconds */
  duration: number;
  /** Audio level (0-1) */
  audioLevel: number;
  /** Dark mode */
  isDark?: boolean;
}

/**
 * Combined recording indicator with duration and level
 */
export function RecordingIndicator({
  isRecording,
  duration,
  audioLevel,
  isDark = false,
}: RecordingIndicatorProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3">
      {/* Recording dot */}
      <div
        className={`w-3 h-3 rounded-full ${
          isRecording ? 'bg-red-500 animate-pulse' : isDark ? 'bg-gray-600' : 'bg-gray-300'
        }`}
      />

      {/* Duration */}
      <span
        className={`font-mono text-sm ${
          isDark ? 'text-gray-300' : 'text-gray-700'
        }`}
      >
        {formatDuration(duration)}
      </span>

      {/* Audio level bars */}
      {isRecording && (
        <WaveformBars
          level={audioLevel}
          barCount={5}
          height={20}
          isDark={isDark}
        />
      )}
    </div>
  );
}
