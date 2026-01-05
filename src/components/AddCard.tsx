import { useState, useRef, useEffect } from 'react';
import type { NewCard } from '../types';
import { createCard, getAllCards } from '../db/cards';
import { TagInput } from './TagInput';
import { BatchImport } from './BatchImport';
import { handleError } from '../utils/errors';
import { updateQuestProgress } from '../utils/dailyQuests';

interface AddCardProps {
  onCardAdded: () => void;
  showToast: (message: string) => void;
  isDark: boolean;
}

// Max lengths for input validation
const MAX_LENGTHS = {
  front: 500,
  back: 500,
  example: 1000,
  notes: 2000,
};

export function AddCard({ onCardAdded, showToast, isDark }: AddCardProps) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [exampleEs, setExampleEs] = useState('');
  const [exampleEn, setExampleEn] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [showOptional, setShowOptional] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBatchImport, setShowBatchImport] = useState(false);
  const frontInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount and load existing tags for suggestions
  useEffect(() => {
    frontInputRef.current?.focus();
    loadExistingTags();
  }, []);

  const loadExistingTags = async () => {
    const cards = await getAllCards();
    const allTags = new Set<string>();
    cards.forEach(card => card.tags.forEach(tag => allTags.add(tag)));
    setExistingTags(Array.from(allTags).sort());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!front.trim() || !back.trim()) return;

    setIsSubmitting(true);

    try {
      const newCard: NewCard = {
        type: 'BASIC',
        front: front.trim(),
        back: back.trim(),
        exampleEs: exampleEs.trim() || undefined,
        exampleEn: exampleEn.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      };

      await createCard(newCard);

      // Reset form
      setFront('');
      setBack('');
      setExampleEs('');
      setExampleEn('');
      setNotes('');
      setTags([]);

      // Focus back to front input for quick-add mode
      frontInputRef.current?.focus();

      showToast('Card added!');
      updateQuestProgress('cards_added', 1);
      onCardAdded();
    } catch (error) {
      showToast(handleError(error, 'save-card'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter to submit (when in back field and not showing optional fields)
    if (e.key === 'Enter' && !e.shiftKey && front.trim() && back.trim() && !showOptional) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const inputClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
    isDark
      ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
  }`;

  const labelClasses = `block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Add New Card</h2>
        <button
          type="button"
          onClick={() => setShowBatchImport(true)}
          className={`text-sm px-3 py-1 rounded-lg border transition-colors ${
            isDark
              ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Batch Import
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="front" className={labelClasses}>
            Spanish (front) *
          </label>
          <input
            ref={frontInputRef}
            id="front"
            type="text"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="e.g., hola"
            className={inputClasses}
            disabled={isSubmitting}
            autoComplete="off"
            maxLength={MAX_LENGTHS.front}
          />
        </div>

        <div>
          <label htmlFor="back" className={labelClasses}>
            English (back) *
          </label>
          <input
            id="back"
            type="text"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., hello"
            className={inputClasses}
            disabled={isSubmitting}
            autoComplete="off"
            maxLength={MAX_LENGTHS.back}
          />
        </div>

        {/* Optional fields toggle */}
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="text-sm text-emerald-500 hover:text-emerald-400"
        >
          {showOptional ? '- Hide optional fields' : '+ Add example sentence & notes'}
        </button>

        {/* Optional fields */}
        {showOptional && (
          <div className={`space-y-4 pt-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <div>
              <label htmlFor="exampleEs" className={labelClasses}>
                Example sentence (Spanish)
              </label>
              <input
                id="exampleEs"
                type="text"
                value={exampleEs}
                onChange={(e) => setExampleEs(e.target.value)}
                placeholder="e.g., Hola, ¿cómo estás?"
                className={inputClasses}
                disabled={isSubmitting}
                autoComplete="off"
                maxLength={MAX_LENGTHS.example}
              />
            </div>

            <div>
              <label htmlFor="exampleEn" className={labelClasses}>
                Example translation
              </label>
              <input
                id="exampleEn"
                type="text"
                value={exampleEn}
                onChange={(e) => setExampleEn(e.target.value)}
                placeholder="e.g., Hello, how are you?"
                className={inputClasses}
                disabled={isSubmitting}
                autoComplete="off"
                maxLength={MAX_LENGTHS.example}
              />
            </div>

            <div>
              <label htmlFor="notes" className={labelClasses}>
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
                className={`${inputClasses} resize-none`}
                disabled={isSubmitting}
                maxLength={MAX_LENGTHS.notes}
              />
            </div>

            <div>
              <label className={labelClasses}>
                Tags
              </label>
              <TagInput
                tags={tags}
                onChange={setTags}
                suggestions={existingTags}
                disabled={isSubmitting}
                isDark={isDark}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!front.trim() || !back.trim() || isSubmitting}
          className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          {isSubmitting ? 'Adding...' : 'Add Card'}
        </button>

        <p className={`text-sm text-center ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          {showOptional ? 'Fill in the fields and click Add Card' : 'Press Enter to add quickly'}
        </p>
      </form>

      {/* Batch Import modal */}
      {showBatchImport && (
        <BatchImport
          isDark={isDark}
          onClose={() => setShowBatchImport(false)}
          showToast={showToast}
          onImported={() => {
            onCardAdded();
            loadExistingTags();
          }}
        />
      )}
    </div>
  );
}
