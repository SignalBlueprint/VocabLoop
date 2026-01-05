import { useState } from 'react';
import type { Page } from '../types';
import { createCard } from '../db/cards';

interface ClozeCreatorProps {
  onNavigate: (page: Page) => void;
  showToast: (message: string) => void;
  isDark: boolean;
}

export function ClozeCreator({ onNavigate, showToast, isDark }: ClozeCreatorProps) {
  const [sentence, setSentence] = useState('');
  const [selectedWord, setSelectedWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Split sentence into words for selection
  const words = sentence.trim().split(/\s+/).filter(Boolean);

  const handleWordClick = (word: string) => {
    // Toggle selection - remove punctuation for the stored word
    const cleanWord = word.replace(/[.,!?;:"""''()[\]{}]/g, '');
    if (selectedWord === cleanWord) {
      setSelectedWord('');
    } else {
      setSelectedWord(cleanWord);
    }
  };

  const handleSave = async () => {
    if (!sentence.trim() || !selectedWord) {
      showToast('Enter a sentence and select a word');
      return;
    }

    setIsSaving(true);

    try {
      await createCard({
        type: 'CLOZE',
        front: sentence, // Store original sentence
        back: translation || '', // English translation/hint
        clozeSentence: sentence,
        clozeWord: selectedWord,
        tags: ['cloze'],
      });

      showToast('Cloze card created!');

      // Reset form
      setSentence('');
      setSelectedWord('');
      setTranslation('');
    } catch (error) {
      console.error('Failed to save cloze card:', error);
      showToast('Failed to create card');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPreview = () => {
    if (!sentence.trim() || !selectedWord) return null;

    return (
      <div className={`rounded-lg p-4 mt-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Preview:</p>
        <p className="text-lg">
          {words.map((word, i) => {
            const cleanWord = word.replace(/[.,!?;:"""''()[\]{}]/g, '');
            const isSelected = cleanWord.toLowerCase() === selectedWord.toLowerCase();
            return (
              <span key={i}>
                {isSelected ? (
                  <span className="bg-emerald-100 px-2 py-0.5 rounded font-medium">_____</span>
                ) : (
                  word
                )}
                {i < words.length - 1 ? ' ' : ''}
              </span>
            );
          })}
        </p>
        {translation && (
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Hint: {translation}</p>
        )}
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Create Cloze Card</h2>
        <button
          onClick={() => onNavigate('home')}
          className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
        >
          Back
        </button>
      </div>

      <div className={`rounded-xl shadow-sm p-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Sentence input */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Spanish Sentence
          </label>
          <textarea
            value={sentence}
            onChange={(e) => {
              setSentence(e.target.value);
              setSelectedWord(''); // Reset selection when sentence changes
            }}
            placeholder="Enter a Spanish sentence..."
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            rows={3}
          />
        </div>

        {/* Word selection */}
        {words.length > 0 && (
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Click a word to hide:
            </label>
            <div className="flex flex-wrap gap-2">
              {words.map((word, i) => {
                const cleanWord = word.replace(/[.,!?;:"""''()[\]{}]/g, '');
                const isSelected = cleanWord.toLowerCase() === selectedWord.toLowerCase();
                return (
                  <button
                    key={i}
                    onClick={() => handleWordClick(word)}
                    className={`px-3 py-1 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : isDark
                        ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-emerald-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500'
                    }`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Translation/hint (optional) */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            English Translation (optional hint)
          </label>
          <input
            type="text"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder="e.g., 'The cat is on the table'"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>

        {/* Preview */}
        {renderPreview()}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={isSaving || !sentence.trim() || !selectedWord}
          className={`w-full mt-4 py-3 px-6 rounded-lg font-semibold transition-colors ${
            isSaving || !sentence.trim() || !selectedWord
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {isSaving ? 'Saving...' : 'Create Cloze Card'}
        </button>
      </div>

      {/* Help text */}
      <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
        <p className={`text-sm ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>
          <strong>What is a cloze card?</strong><br />
          A cloze card hides one word in a sentence. During review, you'll see the sentence with a blank and try to recall the missing word.
        </p>
      </div>
    </div>
  );
}
