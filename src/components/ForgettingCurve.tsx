import { useState, useEffect } from 'react';
import type { Card, ReviewLog } from '../types';
import { getCard } from '../db/cards';
import { getReviewsForCard } from '../db/reviews';
import {
  generateRetentionCurve,
  generateProjection,
  getCurrentRetention,
  type RetentionDataPoint,
} from '../utils/retention';

interface ForgettingCurveProps {
  cardId: string;
  onClose: () => void;
  isDark?: boolean;
}

// Grade to color mapping
const gradeColors = {
  again: '#ef4444', // red-500
  hard: '#f97316', // orange-500
  good: '#22c55e', // green-500
  easy: '#3b82f6', // blue-500
};

export function ForgettingCurve({ cardId, onClose, isDark = false }: ForgettingCurveProps) {
  const [card, setCard] = useState<Card | null>(null);
  const [reviews, setReviews] = useState<ReviewLog[]>([]);
  const [curveData, setCurveData] = useState<RetentionDataPoint[]>([]);
  const [projectionData, setProjectionData] = useState<RetentionDataPoint[]>([]);
  const [currentRetention, setCurrentRetention] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<RetentionDataPoint | null>(null);

  useEffect(() => {
    loadData();
  }, [cardId]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cardData, reviewData] = await Promise.all([
        getCard(cardId),
        getReviewsForCard(cardId),
      ]);

      if (cardData) {
        setCard(cardData);
        setReviews(reviewData);

        // Generate retention curve
        const curve = generateRetentionCurve(reviewData, cardData.createdAt);
        setCurveData(curve);

        // Calculate current retention
        const retention = getCurrentRetention(
          cardData.intervalDays || 1,
          cardData.lastReviewedAt
        );
        setCurrentRetention(retention);

        // Generate projection
        const projection = generateProjection(
          retention,
          cardData.intervalDays || 1,
          14
        );
        setProjectionData(projection);
      }
    } catch (error) {
      console.error('Failed to load forgetting curve data:', error);
    } finally {
      setLoading(false);
    }
  };

  // SVG chart dimensions
  const chartWidth = 400;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Calculate scales
  const maxDay = Math.max(
    curveData.length > 0 ? curveData[curveData.length - 1].day : 7,
    7
  );
  const xScale = (day: number) => (day / maxDay) * innerWidth;
  const yScale = (retention: number) => innerHeight - (retention / 100) * innerHeight;

  // Generate path for the retention curve
  const generatePath = (data: RetentionDataPoint[]): string => {
    if (data.length === 0) return '';

    return data
      .map((point, i) => {
        const x = xScale(point.day);
        const y = yScale(point.retention);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  // Generate projection path (continues from last curve point)
  const generateProjectionPath = (): string => {
    if (projectionData.length === 0 || curveData.length === 0) return '';

    const lastCurveDay = curveData[curveData.length - 1].day;

    return projectionData
      .map((point, i) => {
        const x = xScale(lastCurveDay + point.day);
        const y = yScale(point.retention);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  // Colors based on dark mode
  const colors = {
    bg: isDark ? 'bg-gray-800' : 'bg-white',
    border: isDark ? 'border-gray-700' : 'border-gray-200',
    text: isDark ? 'text-gray-100' : 'text-gray-900',
    textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
    gridLine: isDark ? '#374151' : '#e5e7eb',
    curveLine: isDark ? '#60a5fa' : '#3b82f6',
    projectionLine: isDark ? '#9ca3af' : '#6b7280',
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className={`${colors.bg} rounded-lg p-6`}>
          <p className={colors.text}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className={`${colors.bg} rounded-lg p-6`}>
          <p className={colors.text}>Card not found</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`${colors.bg} ${colors.border} border rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-4 border-b ${colors.border}`}>
          <h2 className={`text-lg font-semibold ${colors.text}`}>Retention Curve</h2>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${colors.textMuted}`}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card info */}
        <div className={`px-4 pt-4 ${colors.text}`}>
          <p className="font-medium truncate">{card.front}</p>
          <p className={`text-sm ${colors.textMuted} truncate`}>{card.back}</p>
        </div>

        {/* Current retention display */}
        <div className="px-4 pt-4 text-center">
          <div className={`text-4xl font-bold ${currentRetention >= 70 ? 'text-green-500' : currentRetention >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
            {Math.round(currentRetention)}%
          </div>
          <p className={`text-sm ${colors.textMuted}`}>Current Retention</p>
        </div>

        {/* SVG Chart */}
        <div className="px-4 py-4">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto"
            style={{ maxHeight: '250px' }}
          >
            <g transform={`translate(${padding.left}, ${padding.top})`}>
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((tick) => (
                <g key={tick}>
                  <line
                    x1={0}
                    x2={innerWidth}
                    y1={yScale(tick)}
                    y2={yScale(tick)}
                    stroke={colors.gridLine}
                    strokeDasharray={tick === 0 || tick === 100 ? '0' : '4'}
                  />
                  <text
                    x={-8}
                    y={yScale(tick)}
                    textAnchor="end"
                    alignmentBaseline="middle"
                    className="text-xs"
                    fill={isDark ? '#9ca3af' : '#6b7280'}
                  >
                    {tick}%
                  </text>
                </g>
              ))}

              {/* X-axis labels */}
              {[0, Math.round(maxDay / 2), maxDay].map((day) => (
                <text
                  key={day}
                  x={xScale(day)}
                  y={innerHeight + 20}
                  textAnchor="middle"
                  className="text-xs"
                  fill={isDark ? '#9ca3af' : '#6b7280'}
                >
                  {day}d
                </text>
              ))}

              {/* Retention curve line */}
              <path
                d={generatePath(curveData)}
                fill="none"
                stroke={colors.curveLine}
                strokeWidth={2}
              />

              {/* Projection line (dashed) */}
              <path
                d={generateProjectionPath()}
                fill="none"
                stroke={colors.projectionLine}
                strokeWidth={2}
                strokeDasharray="6 4"
              />

              {/* Review event dots */}
              {curveData
                .filter((p) => p.isReview)
                .map((point, i) => (
                  <g key={i}>
                    <circle
                      cx={xScale(point.day)}
                      cy={yScale(point.retention)}
                      r={hoveredPoint === point ? 8 : 6}
                      fill={point.grade ? gradeColors[point.grade] : colors.curveLine}
                      stroke={isDark ? '#1f2937' : '#fff'}
                      strokeWidth={2}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(point)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                ))}

              {/* Current position marker */}
              {curveData.length > 0 && (
                <circle
                  cx={xScale(curveData[curveData.length - 1].day)}
                  cy={yScale(curveData[curveData.length - 1].retention)}
                  r={4}
                  fill={isDark ? '#fff' : '#000'}
                />
              )}
            </g>
          </svg>
        </div>

        {/* Hover tooltip */}
        {hoveredPoint && (
          <div className={`mx-4 mb-2 p-2 rounded text-sm ${isDark ? 'bg-gray-700' : 'bg-gray-100'} ${colors.text}`}>
            <span className="font-medium">Day {hoveredPoint.day}:</span>{' '}
            {hoveredPoint.grade && (
              <span
                className="inline-block px-2 py-0.5 rounded text-white text-xs mr-2"
                style={{ backgroundColor: gradeColors[hoveredPoint.grade] }}
              >
                {hoveredPoint.grade}
              </span>
            )}
            <span>{Math.round(hoveredPoint.retention)}% retention</span>
          </div>
        )}

        {/* Legend */}
        <div className={`px-4 pb-4 flex flex-wrap gap-3 text-xs ${colors.textMuted}`}>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5" style={{ backgroundColor: colors.curveLine }}></div>
            <span>History</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: colors.projectionLine }}></div>
            <span>Projected</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: gradeColors.again }}></div>
            <span>Again</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: gradeColors.hard }}></div>
            <span>Hard</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: gradeColors.good }}></div>
            <span>Good</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: gradeColors.easy }}></div>
            <span>Easy</span>
          </div>
        </div>

        {/* Stats */}
        <div className={`px-4 pb-4 grid grid-cols-3 gap-2 text-center text-sm border-t ${colors.border} pt-4`}>
          <div>
            <p className={`font-semibold ${colors.text}`}>{reviews.length}</p>
            <p className={colors.textMuted}>Reviews</p>
          </div>
          <div>
            <p className={`font-semibold ${colors.text}`}>{card.intervalDays}d</p>
            <p className={colors.textMuted}>Interval</p>
          </div>
          <div>
            <p className={`font-semibold ${colors.text}`}>{card.lapses}</p>
            <p className={colors.textMuted}>Lapses</p>
          </div>
        </div>
      </div>
    </div>
  );
}
