interface QuickActionsProps {
  isDark: boolean;
  onNavigate: (page: string) => void;
  hasCards: boolean;
}

export function QuickActions({ isDark, onNavigate, hasCards }: QuickActionsProps) {
  if (!hasCards) {
    return null;
  }

  const actions = [
    {
      id: 'quiz',
      label: 'Quiz',
      description: 'Test yourself',
      icon: '🧠',
      color: isDark
        ? 'from-cyan-900/70 to-cyan-800/50 hover:from-cyan-800/80 hover:to-cyan-700/60 border-cyan-700'
        : 'from-cyan-50 to-cyan-100 hover:from-cyan-100 hover:to-cyan-200 border-cyan-200',
      textColor: isDark ? 'text-cyan-300' : 'text-cyan-700',
    },
    {
      id: 'verbs',
      label: 'Verbs',
      description: 'Conjugate 70+',
      icon: '🔤',
      color: isDark
        ? 'from-purple-900/70 to-purple-800/50 hover:from-purple-800/80 hover:to-purple-700/60 border-purple-700'
        : 'from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-purple-200',
      textColor: isDark ? 'text-purple-300' : 'text-purple-700',
    },
    {
      id: 'listening',
      label: 'Listen',
      description: 'Audio practice',
      icon: '🎧',
      color: isDark
        ? 'from-violet-900/70 to-violet-800/50 hover:from-violet-800/80 hover:to-violet-700/60 border-violet-700'
        : 'from-violet-50 to-violet-100 hover:from-violet-100 hover:to-violet-200 border-violet-200',
      textColor: isDark ? 'text-violet-300' : 'text-violet-700',
    },
  ];

  return (
    <div className="mb-4">
      <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
        Quick Practice
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onNavigate(action.id)}
            className={`relative overflow-hidden bg-gradient-to-br ${action.color} border rounded-xl p-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isDark ? 'focus:ring-offset-gray-900' : ''} focus:ring-emerald-500`}
          >
            <div className="flex flex-col items-center text-center">
              <span className="text-2xl mb-1" aria-hidden="true">{action.icon}</span>
              <span className={`font-semibold ${action.textColor}`}>{action.label}</span>
              <span className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {action.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
