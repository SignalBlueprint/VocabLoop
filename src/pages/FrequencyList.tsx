import { useState, useMemo } from 'react';
import type { Page, NewCard } from '../types';
import frequencyData from '../data/frequency.json';
import { createCard, getAllCards } from '../db/cards';

interface FrequencyListProps {
  onNavigate: (page: Page) => void;
  showToast: (message: string) => void;
  isDark: boolean;
}

interface FrequencyWord {
  spanish: string;
  english: string;
}

export function FrequencyList({ onNavigate, showToast, isDark }: FrequencyListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWords, setSelectedWords] = useState<Set<number>>(new Set());
  const [existingWords, setExistingWords] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Load existing cards to check for duplicates
  useState(() => {
    getAllCards().then(cards => {
      const existing = new Set(cards.map(c => c.front.toLowerCase()));
      setExistingWords(existing);
      setIsLoading(false);
    });
  });

  const words = frequencyData as FrequencyWord[];

  // Filter words by search query
  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) return words;
    const query = searchQuery.toLowerCase();
    return words.filter(word =>
      word.spanish.toLowerCase().includes(query) ||
      word.english.toLowerCase().includes(query)
    );
  }, [words, searchQuery]);

  const toggleWord = (index: number) => {
    const newSelected = new Set(selectedWords);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedWords(newSelected);
  };

  const selectAll = () => {
    const allIndices = filteredWords
      .map((_, i) => words.indexOf(filteredWords[i]))
      .filter(i => !existingWords.has(words[i].spanish.toLowerCase()));
    setSelectedWords(new Set(allIndices));
  };

  const clearSelection = () => {
    setSelectedWords(new Set());
  };

  const handleAddSelected = async () => {
    if (selectedWords.size === 0) return;

    setIsAdding(true);

    try {
      let added = 0;
      let skipped = 0;

      for (const index of selectedWords) {
        const word = words[index];
        if (existingWords.has(word.spanish.toLowerCase())) {
          skipped++;
          continue;
        }

        const newCard: NewCard = {
          type: 'BASIC',
          front: word.spanish,
          back: word.english,
        };

        await createCard(newCard);
        added++;
      }

      if (skipped > 0) {
        showToast(`Added ${added} cards (${skipped} duplicates skipped)`);
      } else {
        showToast(`Added ${added} cards!`);
      }

      // Refresh existing words
      const cards = await getAllCards();
      setExistingWords(new Set(cards.map(c => c.front.toLowerCase())));
      setSelectedWords(new Set());
    } catch (error) {
      console.error('Failed to add cards:', error);
      showToast('Failed to add cards');
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Frequency List</h2>
        <button
          onClick={() => onNavigate('home')}
          className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
        >
          Back
        </button>
      </div>

      <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
        Top {words.length} most common Spanish words. Select words to add to your deck.
      </p>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search words..."
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
            isDark
              ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-500'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />
      </div>

      {/* Selection controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-sm text-emerald-600 hover:text-emerald-700"
          >
            Select all new
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={clearSelection}
            className={`text-sm ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Clear
          </button>
        </div>
        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {selectedWords.size} selected
        </span>
      </div>

      {/* Word list */}
      <div className="space-y-1 max-h-[50vh] overflow-y-auto mb-4">
        {filteredWords.map((word) => {
          const originalIndex = words.indexOf(word);
          const isSelected = selectedWords.has(originalIndex);
          const alreadyExists = existingWords.has(word.spanish.toLowerCase());

          return (
            <div
              key={originalIndex}
              onClick={() => !alreadyExists && toggleWord(originalIndex)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                alreadyExists
                  ? isDark
                    ? 'bg-gray-700 border-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50'
                  : isSelected
                  ? 'bg-emerald-50 border-emerald-300'
                  : isDark
                  ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xs w-6 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {originalIndex + 1}
                  </span>
                  <div>
                    <span className={isDark ? 'font-medium text-gray-100' : 'font-medium'}>{word.spanish}</span>
                    <span className={isDark ? 'text-gray-500 mx-2' : 'text-gray-400 mx-2'}>-</span>
                    <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{word.english}</span>
                  </div>
                </div>
                {alreadyExists && (
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>In deck</span>
                )}
                {isSelected && !alreadyExists && (
                  <span className="text-emerald-600">✓</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add button */}
      {selectedWords.size > 0 && (
        <button
          onClick={handleAddSelected}
          disabled={isAdding}
          className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isAdding ? 'Adding...' : `Add ${selectedWords.size} words to deck`}
        </button>
      )}

      {/* Stats */}
      <p className={`text-center text-sm mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {filteredWords.length} of {words.length} words shown
      </p>
    </div>
  );
}
