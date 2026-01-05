import { useState } from 'react';
import { setDailyGoalTarget } from '../utils/dailyGoal';

interface DailyGoalProps {
  completed: number;
  target: number;
  isDark: boolean;
  onTargetChange?: (target: number) => void;
}

export function DailyGoal({ completed, target, isDark, onTargetChange }: DailyGoalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(target.toString());

  const percentage = Math.min(100, Math.round((completed / target) * 100));
  const isComplete = completed >= target;

  // SVG circle parameters
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const handleSave = () => {
    const newTarget = parseInt(editValue, 10);
    if (!isNaN(newTarget) && newTarget > 0 && newTarget <= 100) {
      setDailyGoalTarget(newTarget);
      onTargetChange?.(newTarget);
    } else {
      setEditValue(target.toString());
    }
    setIsEditing(false);
  };

  return (
    <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center gap-4">
        {/* Progress ring */}
        <div className="relative flex-shrink-0">
          <svg
            width={size}
            height={size}
            className="transform -rotate-90"
            aria-hidden="true"
          >
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={isDark ? '#374151' : '#e5e7eb'}
              strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={isComplete ? '#10b981' : '#3b82f6'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isComplete ? (
              <span className="text-2xl" aria-label="Goal complete">✓</span>
            ) : (
              <>
                <span className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                  {completed}
                </span>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  /{target}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Text content */}
        <div className="flex-1">
          <h3 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            Daily Goal
          </h3>
          {isComplete ? (
            <p className="text-sm text-emerald-500 font-medium">
              Goal reached! Great job!
            </p>
          ) : (
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {target - completed} more review{target - completed !== 1 ? 's' : ''} to go
            </p>
          )}

          {/* Edit target */}
          {isEditing ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min="1"
                max="100"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className={`w-16 px-2 py-1 text-sm border rounded ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-gray-100'
                    : 'bg-white border-gray-300'
                }`}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') {
                    setEditValue(target.toString());
                    setIsEditing(false);
                  }
                }}
              />
              <button
                onClick={handleSave}
                className="text-xs text-emerald-500 hover:underline"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditValue(target.toString());
                  setIsEditing(false);
                }}
                className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} hover:underline`}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className={`text-xs mt-1 ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-500'}`}
            >
              Edit goal
            </button>
          )}
        </div>

        {/* Celebration badge when complete */}
        {isComplete && (
          <div className="flex-shrink-0 text-3xl" aria-hidden="true">
            🎉
          </div>
        )}
      </div>
    </div>
  );
}
