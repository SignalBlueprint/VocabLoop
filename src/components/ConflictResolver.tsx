import type { Card } from '../types';
import type { ConflictInfo } from '../utils/sync';

interface ConflictResolverProps {
  conflicts: ConflictInfo[];
  isDark: boolean;
  onResolve: (cardId: string, resolution: 'local' | 'remote' | 'both') => void;
  onResolveAll: (resolution: 'local' | 'remote') => void;
  onClose: () => void;
}

export function ConflictResolver({
  conflicts,
  isDark,
  onResolve,
  onResolveAll,
  onClose,
}: ConflictResolverProps) {
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const renderCardPreview = (card: Card, label: string, color: string) => (
    <div
      className={`flex-1 p-4 rounded-lg border ${
        isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className={`text-xs font-medium mb-2 ${color}`}>{label}</div>
      <div className={`font-medium mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
        {card.front}
      </div>
      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{card.back}</div>
      <div className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        Modified: {formatDate(card.updatedAt)}
      </div>
      {card.notes && (
        <div className={`text-xs mt-1 italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Notes: {card.notes.slice(0, 50)}...
        </div>
      )}
    </div>
  );

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl ${
          isDark ? 'bg-gray-800' : 'bg-white'
        } shadow-xl flex flex-col`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              Resolve Sync Conflicts
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {conflicts.length} card{conflicts.length !== 1 ? 's' : ''} modified on multiple
              devices
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Resolve all buttons */}
        {conflicts.length > 1 && (
          <div
            className={`px-6 py-3 border-b flex gap-4 ${
              isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <button
              onClick={() => onResolveAll('local')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              Keep All Local
            </button>
            <button
              onClick={() => onResolveAll('remote')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              Keep All Remote
            </button>
          </div>
        )}

        {/* Conflicts list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {conflicts.map((conflict) => (
            <div
              key={conflict.cardId}
              className={`rounded-xl border p-4 ${
                isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200'
              }`}
            >
              {/* Card comparison */}
              <div className="flex gap-4 mb-4">
                {renderCardPreview(conflict.localCard, 'This Device', 'text-emerald-500')}
                {renderCardPreview(conflict.remoteCard, 'Other Device', 'text-blue-500')}
              </div>

              {/* Resolution buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => onResolve(conflict.cardId, 'local')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                    isDark
                      ? 'border-emerald-600 text-emerald-400 hover:bg-emerald-600/20'
                      : 'border-emerald-500 text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  Keep Local
                </button>
                <button
                  onClick={() => onResolve(conflict.cardId, 'remote')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                    isDark
                      ? 'border-blue-600 text-blue-400 hover:bg-blue-600/20'
                      : 'border-blue-500 text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Keep Remote
                </button>
                <button
                  onClick={() => onResolve(conflict.cardId, 'both')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                    isDark
                      ? 'border-gray-600 text-gray-400 hover:bg-gray-600/20'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Keep Both
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
        >
          <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            "Keep Both" will create a duplicate card. You can merge them manually later.
          </p>
        </div>
      </div>
    </div>
  );
}
