import { useState, useEffect } from 'react';

interface XPGainAnimationProps {
  amount: number;
  onComplete?: () => void;
}

export function XPGainAnimation({ amount, onComplete }: XPGainAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible || amount <= 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="animate-xp-float">
        <div className="flex items-center gap-1 bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg font-bold text-lg">
          <span>+{amount}</span>
          <span>XP</span>
          <span className="ml-1">⭐</span>
        </div>
      </div>
    </div>
  );
}

// Hook to manage XP gain animations
export function useXPAnimation() {
  const [animations, setAnimations] = useState<{ id: number; amount: number }[]>([]);
  let nextId = 0;

  const showXPGain = (amount: number) => {
    const id = nextId++;
    setAnimations(prev => [...prev, { id, amount }]);
  };

  const removeAnimation = (id: number) => {
    setAnimations(prev => prev.filter(a => a.id !== id));
  };

  const XPAnimations = () => (
    <>
      {animations.map(({ id, amount }) => (
        <XPGainAnimation
          key={id}
          amount={amount}
          onComplete={() => removeAnimation(id)}
        />
      ))}
    </>
  );

  return { showXPGain, XPAnimations };
}
