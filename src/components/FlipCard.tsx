import { ReactNode } from 'react';

interface FlipCardProps {
  front: ReactNode;
  back: ReactNode;
  isFlipped: boolean;
  isDark: boolean;
  className?: string;
  onFlip?: () => void;
}

export function FlipCard({ front, back, isFlipped, isDark, className = '', onFlip }: FlipCardProps) {
  return (
    <div
      className={`flip-card ${className}`}
      onClick={onFlip}
      role={onFlip ? 'button' : undefined}
      tabIndex={onFlip ? 0 : undefined}
      onKeyDown={onFlip ? (e) => e.key === 'Enter' && onFlip() : undefined}
    >
      <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
        {/* Front of card */}
        <div
          className={`flip-card-front rounded-xl shadow-sm p-6 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          {front}
        </div>

        {/* Back of card */}
        <div
          className={`flip-card-back rounded-xl shadow-sm p-6 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          {back}
        </div>
      </div>
    </div>
  );
}
