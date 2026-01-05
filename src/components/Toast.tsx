import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function Toast({ message, onClose, duration = 2000, action }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleAction = () => {
    action?.onClick();
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300 flex items-center gap-3 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span>{message}</span>
      {action && (
        <button
          onClick={handleAction}
          className="text-emerald-400 font-medium hover:text-emerald-300 focus:outline-none focus:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Toast container for managing multiple toasts
interface ToastItem {
  id: number;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, options?: { action?: ToastItem['action']; duration?: number }) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, action: options?.action, duration: options?.duration }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          onClose={() => removeToast(toast.id)}
          action={toast.action}
          duration={toast.duration}
        />
      ))}
    </>
  );

  return { showToast, ToastContainer };
}
