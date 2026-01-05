import { useState } from 'react';
import type { Card } from '../types';
import { getAllCards, importCards } from '../db/cards';

interface BatchImportProps {
  isDark: boolean;
  onClose: () => void;
  showToast: (message: string) => void;
  onImported: () => void;
}

interface ParsedCard {
  front: string;
  back: string;
  isValid: boolean;
  isDuplicate: boolean;
}

export function BatchImport({ isDark, onClose, showToast, onImported }: BatchImportProps) {
  const [input, setInput] = useState('');
  const [separator, setSeparator] = useState<'tab' | 'comma' | 'semicolon' | 'colon'>('tab');
  const [tags, setTags] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<ParsedCard[]>([]);

  const separatorChars: Record<typeof separator, string> = {
    tab: '\t',
    comma: ',',
    semicolon: ';',
    colon: ':',
  };

  const separatorLabels: Record<typeof separator, string> = {
    tab: 'Tab',
    comma: 'Comma (,)',
    semicolon: 'Semicolon (;)',
    colon: 'Colon (:)',
  };

  const parseInput = async (text: string, sep: typeof separator) => {
    // Load existing cards for duplicate detection
    const existing = await getAllCards();
    const existingFronts = new Set(existing.map(c => c.front.toLowerCase().trim()));

    const lines = text.split('\n').filter(line => line.trim());
    const sepChar = separatorChars[sep];

    const parsed: ParsedCard[] = lines.map(line => {
      const parts = line.split(sepChar).map(p => p.trim());
      const front = parts[0] || '';
      const back = parts[1] || '';
      const isValid = front.length > 0 && back.length > 0;
      const isDuplicate = existingFronts.has(front.toLowerCase());

      return { front, back, isValid, isDuplicate };
    });

    setPreview(parsed);
  };

  const handleInputChange = (text: string) => {
    setInput(text);
    if (text.trim()) {
      parseInput(text, separator);
    } else {
      setPreview([]);
    }
  };

  const handleSeparatorChange = (sep: typeof separator) => {
    setSeparator(sep);
    if (input.trim()) {
      parseInput(input, sep);
    }
  };

  const handleImport = async () => {
    const validCards = preview.filter(c => c.isValid && !c.isDuplicate);
    if (validCards.length === 0) {
      showToast('No valid cards to import');
      return;
    }

    setIsImporting(true);
    try {
      const now = Date.now();
      const parsedTags = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const cardsToImport: Card[] = validCards.map((c, index) => ({
        id: `card_${now}_${Math.random().toString(36).substring(2, 9)}_${index}`,
        type: 'BASIC' as const,
        front: c.front,
        back: c.back,
        tags: parsedTags.length > 0 ? parsedTags : [],
        ease: 2.5,
        intervalDays: 0,
        reps: 0,
        dueAt: now,
        lapses: 0,
        createdAt: now,
        updatedAt: now,
      }));

      await importCards(cardsToImport);

      const skipped = preview.filter(c => c.isDuplicate).length;
      const invalid = preview.filter(c => !c.isValid).length;

      let message = `Imported ${validCards.length} cards`;
      if (skipped > 0 || invalid > 0) {
        const parts = [];
        if (skipped > 0) parts.push(`${skipped} duplicates`);
        if (invalid > 0) parts.push(`${invalid} invalid`);
        message += ` (skipped: ${parts.join(', ')})`;
      }

      showToast(message);
      onImported();
      onClose();
    } catch (error) {
      console.error('Failed to import cards:', error);
      showToast('Failed to import cards');
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = preview.filter(c => c.isValid && !c.isDuplicate).length;
  const duplicateCount = preview.filter(c => c.isDuplicate).length;
  const invalidCount = preview.filter(c => !c.isValid).length;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-import-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <h2 id="batch-import-title" className="text-lg font-semibold">Batch Import</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Paste word pairs to import multiple cards at once
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Separator selection */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Separator
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(separatorLabels) as Array<typeof separator>).map(sep => (
                <button
                  key={sep}
                  type="button"
                  onClick={() => handleSeparatorChange(sep)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    separator === sep
                      ? 'bg-emerald-600 text-white'
                      : isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {separatorLabels[sep]}
                </button>
              ))}
            </div>
          </div>

          {/* Text input */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Word pairs (one per line)
            </label>
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={`hola${separatorChars[separator]}hello\nadiós${separatorChars[separator]}goodbye\ngracias${separatorChars[separator]}thank you`}
              rows={6}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none font-mono text-sm ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Format: Spanish{separatorChars[separator] === '\t' ? '[TAB]' : separatorChars[separator]}English
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Tags (optional, comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., vocabulary, beginner"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Preview
                </label>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span className="text-emerald-500">{validCount} valid</span>
                  {duplicateCount > 0 && (
                    <span className="ml-2 text-amber-500">{duplicateCount} duplicates</span>
                  )}
                  {invalidCount > 0 && (
                    <span className="ml-2 text-red-500">{invalidCount} invalid</span>
                  )}
                </div>
              </div>
              <div className={`max-h-48 overflow-y-auto rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                {preview.slice(0, 20).map((card, index) => (
                  <div
                    key={index}
                    className={`px-3 py-2 text-sm flex items-center justify-between ${
                      index > 0 ? (isDark ? 'border-t border-gray-700' : 'border-t border-gray-100') : ''
                    } ${
                      !card.isValid
                        ? isDark ? 'bg-red-900/20' : 'bg-red-50'
                        : card.isDuplicate
                        ? isDark ? 'bg-amber-900/20' : 'bg-amber-50'
                        : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{card.front || '(empty)'}</span>
                      <span className={isDark ? 'text-gray-500 mx-2' : 'text-gray-400 mx-2'}> → </span>
                      <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{card.back || '(empty)'}</span>
                    </div>
                    {!card.isValid && (
                      <span className="text-red-500 text-xs ml-2">Invalid</span>
                    )}
                    {card.isDuplicate && card.isValid && (
                      <span className="text-amber-500 text-xs ml-2">Duplicate</span>
                    )}
                  </div>
                ))}
                {preview.length > 20 && (
                  <div className={`px-3 py-2 text-sm text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    ... and {preview.length - 20} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={handleImport}
            disabled={isImporting || validCount === 0}
            className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isImporting
              ? 'Importing...'
              : validCount === 0
              ? 'No valid cards to import'
              : `Import ${validCount} Card${validCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
