import { useState } from 'react';
import verbsData from '../data/verbs.json';

interface Verb {
  infinitive: string;
  english: string;
  present: string[];
  preterite: string[];
  future: string[];
}

interface ConjugationTableProps {
  isDark: boolean;
  onClose: () => void;
}

export function ConjugationTable({ isDark, onClose }: ConjugationTableProps) {
  const [selectedVerb, setSelectedVerb] = useState<Verb | null>(null);
  const [selectedTense, setSelectedTense] = useState<'present' | 'preterite' | 'future'>('present');
  const [searchQuery, setSearchQuery] = useState('');

  const verbs = verbsData.verbs as Verb[];
  const pronouns = verbsData.pronouns;
  const tenseNames = verbsData.tenses as Record<string, string>;

  const filteredVerbs = verbs.filter(verb =>
    verb.infinitive.toLowerCase().includes(searchQuery.toLowerCase()) ||
    verb.english.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tenseColors: Record<string, string> = {
    present: 'bg-blue-500',
    preterite: 'bg-purple-500',
    future: 'bg-amber-500',
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conjugation-title"
      onClick={(e) => e.target === e.currentTarget && (selectedVerb ? setSelectedVerb(null) : onClose())}
    >
      <div className={`rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            {selectedVerb && (
              <button
                onClick={() => setSelectedVerb(null)}
                className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              >
                ←
              </button>
            )}
            <h2 id="conjugation-title" className="text-lg font-semibold">
              {selectedVerb ? (
                <span>
                  {selectedVerb.infinitive}
                  <span className={`text-sm font-normal ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    ({selectedVerb.english})
                  </span>
                </span>
              ) : (
                'Conjugation Reference'
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          >
            ✕
          </button>
        </div>

        {selectedVerb ? (
          // Verb conjugation view
          <div className="flex-1 overflow-y-auto p-4">
            {/* Tense tabs */}
            <div className="flex gap-2 mb-4">
              {(Object.keys(tenseNames) as Array<keyof typeof tenseNames>).map(tense => (
                <button
                  key={tense}
                  onClick={() => setSelectedTense(tense as 'present' | 'preterite' | 'future')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    selectedTense === tense
                      ? `${tenseColors[tense]} text-white`
                      : isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tenseNames[tense]}
                </button>
              ))}
            </div>

            {/* Conjugation table */}
            <div className={`rounded-lg overflow-hidden border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              {pronouns.map((pronoun, index) => (
                <div
                  key={pronoun}
                  className={`flex items-center ${
                    index > 0 ? (isDark ? 'border-t border-gray-700' : 'border-t border-gray-200') : ''
                  }`}
                >
                  <div className={`w-1/2 p-3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {pronoun}
                    </p>
                  </div>
                  <div className="w-1/2 p-3">
                    <p className={`font-medium ${
                      selectedTense === 'present' ? 'text-blue-500' :
                      selectedTense === 'preterite' ? 'text-purple-500' :
                      'text-amber-500'
                    }`}>
                      {selectedVerb[selectedTense][index]}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* All tenses quick reference */}
            <div className="mt-6">
              <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Quick Reference (yo form)
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(tenseNames) as Array<keyof typeof tenseNames>).map(tense => (
                  <div
                    key={tense}
                    className={`p-3 rounded-lg text-center ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                  >
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {tenseNames[tense]}
                    </p>
                    <p className={`font-medium ${
                      tense === 'present' ? 'text-blue-500' :
                      tense === 'preterite' ? 'text-purple-500' :
                      'text-amber-500'
                    }`}>
                      {(selectedVerb as Verb)[tense as keyof Pick<Verb, 'present' | 'preterite' | 'future'>][0]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Verb list view
          <>
            {/* Search */}
            <div className="p-4 pb-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search verbs..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 pt-2">
              <div className="space-y-2">
                {filteredVerbs.map(verb => (
                  <button
                    key={verb.infinitive}
                    onClick={() => setSelectedVerb(verb)}
                    className={`w-full p-4 rounded-lg text-left transition-colors ${
                      isDark
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{verb.infinitive}</p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {verb.english}
                        </p>
                      </div>
                      <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>→</span>
                    </div>
                    {/* Quick preview of present tense */}
                    <div className="flex gap-2 mt-2 text-xs">
                      <span className={`px-2 py-0.5 rounded ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                        yo: {verb.present[0]}
                      </span>
                      <span className={`px-2 py-0.5 rounded ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                        él: {verb.present[2]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {filteredVerbs.length === 0 && (
                <div className="text-center py-8">
                  <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                    No verbs found matching "{searchQuery}"
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <div className={`p-4 border-t text-center ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {verbs.length} verbs • Practice in Verb Mode
          </p>
        </div>
      </div>
    </div>
  );
}
