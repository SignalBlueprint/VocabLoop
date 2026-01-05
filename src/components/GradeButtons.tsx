import type { Card, Grade } from '../types';
import { getIntervalPreviews } from '../scheduler';

interface GradeButtonsProps {
  card: Card;
  onGrade: (grade: Grade) => void;
  disabled?: boolean;
}

const GRADE_CONFIG: { grade: Grade; label: string; key: string; color: string }[] = [
  { grade: 'again', label: 'Again', key: '1', color: 'bg-red-500 hover:bg-red-600' },
  { grade: 'hard', label: 'Hard', key: '2', color: 'bg-orange-500 hover:bg-orange-600' },
  { grade: 'good', label: 'Good', key: '3', color: 'bg-emerald-500 hover:bg-emerald-600' },
  { grade: 'easy', label: 'Easy', key: '4', color: 'bg-blue-500 hover:bg-blue-600' },
];

export function GradeButtons({ card, onGrade, disabled }: GradeButtonsProps) {
  const previews = getIntervalPreviews(card);

  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Grade your answer">
      {GRADE_CONFIG.map(({ grade, label, key, color }) => (
        <button
          key={grade}
          onClick={() => onGrade(grade)}
          disabled={disabled}
          aria-label={`${label}: next review in ${previews[grade]}. Press ${key}`}
          className={`${color} text-white py-3 px-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white`}
        >
          <span className="text-sm">{label}</span>
          <span className="text-xs opacity-80">{previews[grade]}</span>
          <span className="text-xs opacity-60 mt-1" aria-hidden="true">({key})</span>
        </button>
      ))}
    </div>
  );
}
