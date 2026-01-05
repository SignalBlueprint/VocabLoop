import { useState, useEffect } from 'react';
import type { Card } from '../types';
import { updateCard, getAllCards } from '../db/cards';
import { TagInput } from './TagInput';
import { handleError } from '../utils/errors';

interface EditCardProps {
  card: Card;
  onClose: () => void;
  onSaved: () => void;
  showToast: (message: string) => void;
  isDark?: boolean;
}

// Max lengths for input validation
const MAX_LENGTHS = {
  front: 500,
  back: 500,
  example: 1000,
  notes: 2000,
};

export function EditCard({ card, onClose, onSaved, showToast, isDark = false }: EditCardProps) {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [exampleEs, setExampleEs] = useState(card.exampleEs || '');
  const [exampleEn, setExampleEn] = useState(card.exampleEn || '');
  const [notes, setNotes] = useState(card.notes || '');
  const [tags, setTags] = useState<string[]>(card.tags);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Close on escape key and load existing tags
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    loadExistingTags();
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const loadExistingTags = async () => {
    const cards = await getAllCards();
    const allTags = new Set<string>();
    cards.forEach(c => c.tags.forEach(tag => allTags.add(tag)));
    setExistingTags(Array.from(allTags).sort());
  };

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) return;

    setIsSaving(true);

    try {
      const updatedCard: Card = {
        ...card,
        front: front.trim(),
        back: back.trim(),
        exampleEs: exampleEs.trim() || undefined,
        exampleEn: exampleEn.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tags,
      };

      await updateCard(updatedCard);
      showToast('Card saved!');
      onSaved();
      onClose();
    } catch (error) {
      showToast(handleError(error, 'save-card'));
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
    isDark
      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
      : 'bg-white border-gray-300 text-gray-900'
  }`;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-card-title"
    >
      <div className={`rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 id="edit-card-title" className="text-lg font-semibold">Edit Card</h2>
          <button
            onClick={onClose}
            className={`focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
            aria-label="Close edit dialog"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label htmlFor="edit-front" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Spanish (front) *
            </label>
            <input
              id="edit-front"
              type="text"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              className={inputClasses}
              disabled={isSaving}
              maxLength={MAX_LENGTHS.front}
            />
          </div>

          <div>
            <label htmlFor="edit-back" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              English (back) *
            </label>
            <input
              id="edit-back"
              type="text"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              className={inputClasses}
              disabled={isSaving}
              maxLength={MAX_LENGTHS.back}
            />
          </div>

          <div>
            <label htmlFor="edit-exampleEs" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Example sentence (Spanish)
            </label>
            <input
              id="edit-exampleEs"
              type="text"
              value={exampleEs}
              onChange={(e) => setExampleEs(e.target.value)}
              className={inputClasses}
              disabled={isSaving}
              maxLength={MAX_LENGTHS.example}
            />
          </div>

          <div>
            <label htmlFor="edit-exampleEn" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Example translation
            </label>
            <input
              id="edit-exampleEn"
              type="text"
              value={exampleEn}
              onChange={(e) => setExampleEn(e.target.value)}
              className={inputClasses}
              disabled={isSaving}
              maxLength={MAX_LENGTHS.example}
            />
          </div>

          <div>
            <label htmlFor="edit-notes" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Notes
            </label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={`${inputClasses} resize-none`}
              disabled={isSaving}
              maxLength={MAX_LENGTHS.notes}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Tags
            </label>
            <TagInput
              tags={tags}
              onChange={setTags}
              suggestions={existingTags}
              disabled={isSaving}
              isDark={isDark}
            />
          </div>

          {/* Card stats (read-only) */}
          <div className={`text-xs pt-2 border-t ${isDark ? 'text-gray-500 border-gray-700' : 'text-gray-400 border-gray-200'}`}>
            <p>Reviews: {card.reps} · Ease: {card.ease.toFixed(2)} · Interval: {card.intervalDays} days</p>
            <p>Created: {new Date(card.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className={`p-4 border-t flex gap-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              isDark
                ? 'text-gray-300 bg-gray-700 hover:bg-gray-600'
                : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
            }`}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!front.trim() || !back.trim() || isSaving}
            className="flex-1 py-2 px-4 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
