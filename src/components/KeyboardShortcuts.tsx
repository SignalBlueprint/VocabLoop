interface KeyboardShortcutsProps {
  isDark: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
  context?: string;
}

const shortcuts: Shortcut[] = [
  { keys: ['?'], description: 'Show this help', context: 'Anywhere' },

  // Review shortcuts
  { keys: ['Space'], description: 'Show answer', context: 'Review (showing front)' },
  { keys: ['1'], description: 'Grade: Again (forgot)', context: 'Review (showing answer)' },
  { keys: ['2'], description: 'Grade: Hard', context: 'Review (showing answer)' },
  { keys: ['3'], description: 'Grade: Good', context: 'Review (showing answer)' },
  { keys: ['4'], description: 'Grade: Easy', context: 'Review (showing answer)' },

  // Swipe gestures (mobile)
  { keys: ['Swipe ←'], description: 'Grade: Again', context: 'Review (mobile)' },
  { keys: ['Swipe →'], description: 'Grade: Good / Show answer', context: 'Review (mobile)' },
  { keys: ['Swipe ↑'], description: 'Grade: Easy', context: 'Review (mobile)' },
  { keys: ['Swipe ↓'], description: 'Grade: Hard', context: 'Review (mobile)' },
];

export function KeyboardShortcuts({ isDark, onClose }: KeyboardShortcutsProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`rounded-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">⌨️</span>
            <h2 id="keyboard-shortcuts-title" className="text-lg font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Group shortcuts by context */}
            {['Anywhere', 'Review (showing front)', 'Review (showing answer)', 'Review (mobile)'].map(context => {
              const contextShortcuts = shortcuts.filter(s => s.context === context);
              if (contextShortcuts.length === 0) return null;

              return (
                <div key={context}>
                  <h3 className={`text-xs font-medium uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {context}
                  </h3>
                  <div className="space-y-2">
                    {contextShortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-1"
                      >
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          {shortcut.description}
                        </span>
                        <div className="flex gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <kbd
                              key={keyIndex}
                              className={`px-2 py-1 text-xs rounded font-mono ${
                                isDark
                                  ? 'bg-gray-700 text-gray-300 border border-gray-600'
                                  : 'bg-gray-100 text-gray-700 border border-gray-300'
                              }`}
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`p-4 border-t text-center ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Press <kbd className={`px-1 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>?</kbd> anytime to see shortcuts
          </p>
        </div>
      </div>
    </div>
  );
}
