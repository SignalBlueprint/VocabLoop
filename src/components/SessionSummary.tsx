import { useMemo } from 'react';
import type { Grade } from '../types';

interface SessionStats {
  totalCards: number;
  grades: Record<Grade, number>;
  xpEarned: number;
  startTime: number;
  endTime: number;
  perfectSession: boolean;
}

interface SessionSummaryProps {
  stats: SessionStats;
  isDark: boolean;
  onClose: () => void;
}

export function SessionSummary({ stats, isDark, onClose }: SessionSummaryProps) {
  const duration = useMemo(() => {
    const seconds = Math.floor((stats.endTime - stats.startTime) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }, [stats.startTime, stats.endTime]);

  const accuracy = useMemo(() => {
    const correct = stats.grades.good + stats.grades.easy;
    const total = stats.totalCards;
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  }, [stats.grades, stats.totalCards]);

  const averageTime = useMemo(() => {
    const totalSeconds = (stats.endTime - stats.startTime) / 1000;
    const avg = stats.totalCards > 0 ? totalSeconds / stats.totalCards : 0;
    return avg < 60 ? `${avg.toFixed(1)}s` : `${(avg / 60).toFixed(1)}m`;
  }, [stats]);

  // Determine performance message
  const performanceMessage = useMemo(() => {
    if (stats.perfectSession) return { emoji: '🏆', text: 'Perfect Session!', color: 'text-yellow-500' };
    if (accuracy >= 90) return { emoji: '🌟', text: 'Excellent!', color: 'text-emerald-500' };
    if (accuracy >= 75) return { emoji: '💪', text: 'Great job!', color: 'text-blue-500' };
    if (accuracy >= 50) return { emoji: '📈', text: 'Keep practicing!', color: 'text-orange-500' };
    return { emoji: '🎯', text: 'Room to improve', color: 'text-red-500' };
  }, [accuracy, stats.perfectSession]);

  return (
    <div className={`rounded-xl shadow-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-5xl mb-2">{performanceMessage.emoji}</p>
        <h2 className={`text-2xl font-bold ${performanceMessage.color}`}>
          {performanceMessage.text}
        </h2>
        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Session Complete
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Cards Reviewed */}
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Cards Reviewed
          </p>
          <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            {stats.totalCards}
          </p>
        </div>

        {/* Time */}
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Time
          </p>
          <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            {duration}
          </p>
        </div>

        {/* Accuracy */}
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Accuracy
          </p>
          <p className={`text-2xl font-bold ${accuracy >= 75 ? 'text-emerald-500' : accuracy >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
            {accuracy}%
          </p>
        </div>

        {/* XP Earned */}
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            XP Earned
          </p>
          <p className="text-2xl font-bold text-purple-500">
            +{stats.xpEarned}
          </p>
        </div>
      </div>

      {/* Grade Breakdown */}
      <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <p className={`text-xs uppercase tracking-wide mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Grade Breakdown
        </p>
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-red-500">{stats.grades.again}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Again</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-orange-500">{stats.grades.hard}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Hard</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-emerald-500">{stats.grades.good}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Good</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-blue-500">{stats.grades.easy}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Easy</p>
          </div>
        </div>

        {/* Visual bar */}
        <div className="flex h-2 rounded-full overflow-hidden mt-3">
          {stats.grades.again > 0 && (
            <div
              className="bg-red-500"
              style={{ width: `${(stats.grades.again / stats.totalCards) * 100}%` }}
            />
          )}
          {stats.grades.hard > 0 && (
            <div
              className="bg-orange-500"
              style={{ width: `${(stats.grades.hard / stats.totalCards) * 100}%` }}
            />
          )}
          {stats.grades.good > 0 && (
            <div
              className="bg-emerald-500"
              style={{ width: `${(stats.grades.good / stats.totalCards) * 100}%` }}
            />
          )}
          {stats.grades.easy > 0 && (
            <div
              className="bg-blue-500"
              style={{ width: `${(stats.grades.easy / stats.totalCards) * 100}%` }}
            />
          )}
        </div>
      </div>

      {/* Extra Stats */}
      <div className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-6`}>
        <p>Average time per card: {averageTime}</p>
      </div>

      {/* Action Button */}
      <button
        onClick={onClose}
        className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors"
      >
        Continue
      </button>
    </div>
  );
}

export type { SessionStats };
