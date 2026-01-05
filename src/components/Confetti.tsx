import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
}

interface ConfettiProps {
  active: boolean;
  duration?: number;
  onComplete?: () => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function Confetti({ active, duration = 3000, onComplete }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      // Generate confetti pieces
      const newPieces: ConfettiPiece[] = [];
      for (let i = 0; i < 50; i++) {
        newPieces.push({
          id: i,
          x: Math.random() * 100,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: Math.random() * 0.5,
          rotation: Math.random() * 360,
        });
      }
      setPieces(newPieces);
      setVisible(true);

      // Clean up after animation
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [active, duration, onComplete]);

  if (!visible || pieces.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-50"
      aria-hidden="true"
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 opacity-90"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            animation: `confetti-fall ${1.5 + Math.random()}s ease-out ${piece.delay}s forwards`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Celebration modal for achievements and completions
interface CelebrationModalProps {
  title: string;
  message: string;
  icon: string;
  onClose: () => void;
  isDark: boolean;
}

export function CelebrationModal({ title, message, icon, onClose, isDark }: CelebrationModalProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  return (
    <>
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-title"
      >
        <div
          className={`rounded-2xl p-8 text-center max-w-sm w-full transform animate-bounce-in ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-6xl mb-4">{icon}</div>
          <h2
            id="celebration-title"
            className={`text-2xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}
          >
            {title}
          </h2>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {message}
          </p>
          <button
            onClick={onClose}
            className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
      <style>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s ease-out forwards;
        }
      `}</style>
    </>
  );
}
