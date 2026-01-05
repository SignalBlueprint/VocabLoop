import { useState, useRef, useCallback } from 'react';

interface SwipeState {
  offsetX: number;
  offsetY: number;
  isSwiping: boolean;
  direction: 'left' | 'right' | 'up' | 'down' | null;
}

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;  // Min distance to trigger swipe
  enabled?: boolean;
}

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export function useSwipe(options: UseSwipeOptions): [SwipeState, SwipeHandlers] {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 80,
    enabled = true,
  } = options;

  const [state, setState] = useState<SwipeState>({
    offsetX: 0,
    offsetY: 0,
    isSwiping: false,
    direction: null,
  });

  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;

    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    currentX.current = touch.clientX;
    currentY.current = touch.clientY;

    setState({
      offsetX: 0,
      offsetY: 0,
      isSwiping: true,
      direction: null,
    });
  }, [enabled]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !state.isSwiping) return;

    const touch = e.touches[0];
    currentX.current = touch.clientX;
    currentY.current = touch.clientY;

    const deltaX = currentX.current - startX.current;
    const deltaY = currentY.current - startY.current;

    // Determine primary direction
    let direction: SwipeState['direction'] = null;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else if (Math.abs(deltaY) > 10) {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    setState({
      offsetX: deltaX,
      offsetY: deltaY,
      isSwiping: true,
      direction,
    });
  }, [enabled, state.isSwiping]);

  const onTouchEnd = useCallback(() => {
    if (!enabled) return;

    const deltaX = currentX.current - startX.current;
    const deltaY = currentY.current - startY.current;

    // Check if swipe exceeds threshold
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > threshold && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < -threshold && onSwipeLeft) {
        onSwipeLeft();
      }
    } else {
      // Vertical swipe
      if (deltaY > threshold && onSwipeDown) {
        onSwipeDown();
      } else if (deltaY < -threshold && onSwipeUp) {
        onSwipeUp();
      }
    }

    // Reset state
    setState({
      offsetX: 0,
      offsetY: 0,
      isSwiping: false,
      direction: null,
    });
  }, [enabled, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return [
    state,
    { onTouchStart, onTouchMove, onTouchEnd },
  ];
}
