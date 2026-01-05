import { useState } from 'react';
import type { Card } from '../types';
import { getAllCards, importCards } from '../db/cards';
import starterDecksData from '../data/starterDecks.json';

interface StarterDeck {
  id: string;
  name: string;
  description: string;
  icon: string;
  cardCount: number;
  cards: { front: string; back: string; tags: string[] }[];
}

interface StarterDecksProps {
  isDark: boolean;
  onClose: () => void;
  showToast: (message: string) => void;
  onImported: () => void;
}

export function StarterDecks({ isDark, onClose, showToast, onImported }: StarterDecksProps) {
  const [previewDeck, setPreviewDeck] = useState<StarterDeck | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [importedDecks, setImportedDecks] = useState<Set<string>>(new Set());

  const decks = starterDecksData.decks as StarterDeck[];

  const handleImportDeck = async (deck: StarterDeck) => {
    setImporting(deck.id);
    try {
      // Get existing cards to check for duplicates
      const existingCards = await getAllCards();
      const existingFronts = new Set(existingCards.map(c => c.front.toLowerCase()));

      // Filter out duplicates
      const newCards = deck.cards.filter(
        c => !existingFronts.has(c.front.toLowerCase())
      );

      if (newCards.length === 0) {
        showToast(`All cards from "${deck.name}" already exist`);
        setImportedDecks(prev => new Set([...prev, deck.id]));
        return;
      }

      // Convert to Card format
      const now = Date.now();
      const cardsToImport: Card[] = newCards.map((c, index) => ({
        id: `card_${now}_${Math.random().toString(36).substring(2, 9)}_${index}`,
        type: 'BASIC' as const,
        front: c.front,
        back: c.back,
        tags: [...c.tags, `deck:${deck.id}`],
        ease: 2.5,
        intervalDays: 0,
        reps: 0,
        dueAt: now,
        lapses: 0,
        createdAt: now,
        updatedAt: now,
      }));

      await importCards(cardsToImport);
      setImportedDecks(prev => new Set([...prev, deck.id]));

      const skipped = deck.cards.length - newCards.length;
      const message = skipped > 0
        ? `Added ${newCards.length} cards (${skipped} duplicates skipped)`
        : `Added ${newCards.length} cards from "${deck.name}"`;

      showToast(message);
      onImported();
    } catch (error) {
      console.error('Failed to import deck:', error);
      showToast('Failed to import deck');
    } finally {
      setImporting(null);
    }
  };

  if (previewDeck) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.target === e.currentTarget && setPreviewDeck(null)}
      >
        <div className={`rounded-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{previewDeck.icon}</span>
              <div>
                <h2 className="font-semibold">{previewDeck.name}</h2>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {previewDeck.cardCount} cards
                </p>
              </div>
            </div>
            <button
              onClick={() => setPreviewDeck(null)}
              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {previewDeck.cards.map((card, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}
                >
                  <p className="font-medium">{card.front}</p>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {card.back}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={() => handleImportDeck(previewDeck)}
              disabled={importing === previewDeck.id || importedDecks.has(previewDeck.id)}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                importedDecks.has(previewDeck.id)
                  ? isDark
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
              }`}
            >
              {importing === previewDeck.id
                ? 'Importing...'
                : importedDecks.has(previewDeck.id)
                ? 'Already Imported'
                : `Import ${previewDeck.cardCount} Cards`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="starter-decks-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`rounded-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <h2 id="starter-decks-title" className="text-lg font-semibold">Starter Decks</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Pre-built vocabulary to get you started
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {decks.map(deck => (
              <div
                key={deck.id}
                className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{deck.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{deck.name}</h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {deck.description}
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {deck.cardCount} cards
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setPreviewDeck(deck)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      isDark
                        ? 'bg-gray-600 text-gray-200 border-gray-500 hover:bg-gray-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleImportDeck(deck)}
                    disabled={importing === deck.id || importedDecks.has(deck.id)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      importedDecks.has(deck.id)
                        ? isDark
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
                    }`}
                  >
                    {importing === deck.id
                      ? 'Adding...'
                      : importedDecks.has(deck.id)
                      ? 'Added'
                      : 'Import'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-4 border-t text-center ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Cards will be added to your library with deck tags
          </p>
        </div>
      </div>
    </div>
  );
}
