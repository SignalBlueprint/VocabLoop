import { useState, useEffect, useRef } from 'react';
import type { Card, Page, ReviewLog } from '../types';
import { getAllCards, deleteCard, updateCard, importCards } from '../db/cards';
import { getAllReviews } from '../db/reviews';
import { EditCard } from '../components/EditCard';
import { TagInput } from '../components/TagInput';
import { TagManager } from '../components/TagManager';
import { LibrarySkeleton } from '../components/Skeleton';
import { MasteryBadge, MasteryFilter } from '../components/MasteryBadge';
import { DifficultyIndicator } from '../components/CardDifficultyViz';
import { StarterDecks } from '../components/StarterDecks';
import { ForgettingCurve } from '../components/ForgettingCurve';
import { TagCompare } from '../components/TagCompare';
import { getMasteryLevel, getMasteryBreakdown, type MasteryLevel } from '../utils/mastery';
import { handleError } from '../utils/errors';

interface LibraryProps {
  onNavigate: (page: Page) => void;
  showToast: (message: string, options?: { action?: { label: string; onClick: () => void }; duration?: number }) => void;
  isDark: boolean;
}

export function Library({ onNavigate, showToast, isDark }: LibraryProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [masteryFilter, setMasteryFilter] = useState<MasteryLevel | null>(null);
  const [masteryBreakdown, setMasteryBreakdown] = useState<Record<MasteryLevel, number>>({
    new: 0, learning: 0, reviewing: 0, known: 0, mastered: 0
  });
  const [showStarterDecks, setShowStarterDecks] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [selectedCardForCurve, setSelectedCardForCurve] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [allReviews, setAllReviews] = useState<ReviewLog[]>([]);
  const deletedCardsRef = useRef<Card[]>([]);

  useEffect(() => {
    loadCards();
  }, []);

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadCards = async () => {
    try {
      const [allCards, reviews] = await Promise.all([
        getAllCards(),
        getAllReviews(),
      ]);
      // Sort by creation date (newest first)
      allCards.sort((a, b) => b.createdAt - a.createdAt);
      setCards(allCards);
      setAllReviews(reviews);

      // Extract all unique tags
      const tags = new Set<string>();
      allCards.forEach(card => card.tags.forEach(tag => tags.add(tag)));
      setAllTags(Array.from(tags).sort());

      // Calculate mastery breakdown
      setMasteryBreakdown(getMasteryBreakdown(allCards));
    } catch (error) {
      showToast(handleError(error, 'load-cards'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const cardToDelete = cards.find(c => c.id === id);
    if (!cardToDelete) return;

    try {
      await deleteCard(id);
      setCards(cards.filter(c => c.id !== id));
      setDeleteConfirm(null);
      deletedCardsRef.current = [cardToDelete];
      showToast('Card deleted', {
        action: { label: 'Undo', onClick: handleUndo },
        duration: 5000,
      });
    } catch (error) {
      showToast(handleError(error, 'delete-card'));
    }
  };

  const handleUndo = async () => {
    const cardsToRestore = deletedCardsRef.current;
    if (cardsToRestore.length === 0) return;

    try {
      await importCards(cardsToRestore);
      setCards(prev => [...cardsToRestore, ...prev].sort((a, b) => b.createdAt - a.createdAt));
      deletedCardsRef.current = [];
      showToast(`Restored ${cardsToRestore.length} card${cardsToRestore.length > 1 ? 's' : ''}`);
    } catch (error) {
      showToast(handleError(error, 'save-card'));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredCards.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedIds);
      const cardsToDelete = cards.filter(c => selectedIds.has(c.id));
      for (const id of idsToDelete) {
        await deleteCard(id);
      }
      setCards(cards.filter(c => !selectedIds.has(c.id)));
      deletedCardsRef.current = cardsToDelete;
      showToast(`Deleted ${idsToDelete.length} cards`, {
        action: { label: 'Undo', onClick: handleUndo },
        duration: 5000,
      });
      setSelectedIds(new Set());
      setSelectMode(false);
      setBulkDeleteConfirm(false);
    } catch (error) {
      showToast(handleError(error, 'delete-card'));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setBulkDeleteConfirm(false);
    setBulkTags([]);
  };

  const handleBulkTag = async () => {
    if (bulkTags.length === 0) return;
    try {
      const idsToTag = Array.from(selectedIds);
      const updatedCards = [...cards];
      for (const id of idsToTag) {
        const card = cards.find(c => c.id === id);
        if (card) {
          const newTags = [...new Set([...card.tags, ...bulkTags])];
          const updatedCard = { ...card, tags: newTags };
          await updateCard(updatedCard);
          const idx = updatedCards.findIndex(c => c.id === id);
          if (idx !== -1) {
            updatedCards[idx] = updatedCard;
          }
        }
      }
      setCards(updatedCards);
      // Update allTags
      const tags = new Set<string>();
      updatedCards.forEach(card => card.tags.forEach(tag => tags.add(tag)));
      setAllTags(Array.from(tags).sort());
      showToast(`Tagged ${idsToTag.length} cards with ${bulkTags.join(', ')}`);
      setBulkTags([]);
    } catch (error) {
      showToast(handleError(error, 'save-card'));
    }
  };

  // Bulk reset progress - reset SRS data to new card state
  const handleBulkReset = async () => {
    try {
      const idsToReset = Array.from(selectedIds);
      const updatedCards = [...cards];
      const now = Date.now();
      for (const id of idsToReset) {
        const card = cards.find(c => c.id === id);
        if (card) {
          const updatedCard = {
            ...card,
            ease: 2.5,
            intervalDays: 0,
            reps: 0,
            dueAt: now,
            lapses: 0,
            lastReviewedAt: undefined,
          };
          await updateCard(updatedCard);
          const idx = updatedCards.findIndex(c => c.id === id);
          if (idx !== -1) {
            updatedCards[idx] = updatedCard;
          }
        }
      }
      setCards(updatedCards);
      showToast(`Reset progress for ${idsToReset.length} cards`);
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (error) {
      showToast(handleError(error, 'save-card'));
    }
  };

  // Bulk make due now
  const handleBulkMakeDue = async () => {
    try {
      const idsToUpdate = Array.from(selectedIds);
      const updatedCards = [...cards];
      const now = Date.now();
      for (const id of idsToUpdate) {
        const card = cards.find(c => c.id === id);
        if (card) {
          const updatedCard = { ...card, dueAt: now };
          await updateCard(updatedCard);
          const idx = updatedCards.findIndex(c => c.id === id);
          if (idx !== -1) {
            updatedCards[idx] = updatedCard;
          }
        }
      }
      setCards(updatedCards);
      showToast(`Made ${idsToUpdate.length} cards due now`);
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (error) {
      showToast(handleError(error, 'save-card'));
    }
  };

  // Bulk remove all tags
  const handleBulkRemoveTags = async () => {
    try {
      const idsToUpdate = Array.from(selectedIds);
      const updatedCards = [...cards];
      for (const id of idsToUpdate) {
        const card = cards.find(c => c.id === id);
        if (card && card.tags.length > 0) {
          const updatedCard = { ...card, tags: [] };
          await updateCard(updatedCard);
          const idx = updatedCards.findIndex(c => c.id === id);
          if (idx !== -1) {
            updatedCards[idx] = updatedCard;
          }
        }
      }
      setCards(updatedCards);
      // Update allTags
      const tags = new Set<string>();
      updatedCards.forEach(card => card.tags.forEach(tag => tags.add(tag)));
      setAllTags(Array.from(tags).sort());
      showToast(`Removed tags from ${idsToUpdate.length} cards`);
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (error) {
      showToast(handleError(error, 'save-card'));
    }
  };

  // Filter cards by search query (debounced), tag, and mastery level
  const filteredCards = cards.filter(card => {
    // Tag filter
    if (selectedTag && !card.tags.includes(selectedTag)) {
      return false;
    }
    // Mastery filter
    if (masteryFilter && getMasteryLevel(card) !== masteryFilter) {
      return false;
    }
    // Search filter (uses debounced query for performance)
    if (!debouncedQuery.trim()) return true;
    const query = debouncedQuery.toLowerCase();
    return (
      card.front.toLowerCase().includes(query) ||
      card.back.toLowerCase().includes(query) ||
      card.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Library</h2>
        </div>
        <LibrarySkeleton isDark={isDark} count={5} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Library</h2>
        <div className="flex gap-2">
          {allTags.length >= 2 && !selectMode && (
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`text-sm px-3 py-1 rounded ${
                compareMode
                  ? isDark ? 'bg-blue-700 text-white' : 'bg-blue-500 text-white'
                  : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {compareMode ? 'Back to Cards' : 'Compare Tags'}
            </button>
          )}
          {cards.length > 0 && !compareMode && (
            <button
              onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
              className={`text-sm px-3 py-1 rounded ${
                selectMode
                  ? isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                  : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {selectMode ? 'Cancel' : 'Select'}
            </button>
          )}
          <button
            onClick={() => onNavigate('home')}
            className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
          >
            Back
          </button>
        </div>
      </div>

      {/* Bulk actions controls */}
      {selectMode && (
        <div className={`mb-4 p-3 rounded-lg space-y-3 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={selectedIds.size === filteredCards.length ? deselectAll : selectAll}
                className="text-sm text-emerald-600 hover:underline"
              >
                {selectedIds.size === filteredCards.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {selectedIds.size} selected
              </span>
            </div>
            {selectedIds.size > 0 && (
              bulkDeleteConfirm ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkDelete}
                    className="text-sm text-red-600 hover:underline font-medium"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setBulkDeleteConfirm(false)}
                    className={`text-sm hover:underline ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setBulkDeleteConfirm(true)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete {selectedIds.size}
                </button>
              )
            )}
          </div>
          {selectedIds.size > 0 && (
            <>
              {/* Bulk action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleBulkMakeDue}
                  className={`text-xs px-3 py-1.5 rounded font-medium ${
                    isDark
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                  title="Make selected cards due for review now"
                >
                  Make Due Now
                </button>
                <button
                  onClick={handleBulkReset}
                  className={`text-xs px-3 py-1.5 rounded font-medium ${
                    isDark
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                  title="Reset progress for selected cards (treats them as new)"
                >
                  Reset Progress
                </button>
                <button
                  onClick={handleBulkRemoveTags}
                  className={`text-xs px-3 py-1.5 rounded font-medium ${
                    isDark
                      ? 'bg-gray-600 text-white hover:bg-gray-500'
                      : 'bg-gray-400 text-white hover:bg-gray-500'
                  }`}
                  title="Remove all tags from selected cards"
                >
                  Clear Tags
                </button>
              </div>

              {/* Tag input */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <TagInput
                    tags={bulkTags}
                    onChange={setBulkTags}
                    placeholder="Add tags to selected..."
                    suggestions={allTags}
                    isDark={isDark}
                  />
                </div>
                {bulkTags.length > 0 && (
                  <button
                    onClick={handleBulkTag}
                    className="text-sm bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700"
                  >
                    Apply
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Search and tag filter */}
      <div className="mb-4 space-y-2">
        <label htmlFor="search-cards" className="sr-only">Search cards</label>
        <input
          id="search-cards"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cards..."
          aria-label="Search cards by content or tags"
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
            isDark
              ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-500'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />

        {/* Mastery filter */}
        {cards.length > 0 && (
          <MasteryFilter
            selected={masteryFilter}
            onChange={setMasteryFilter}
            counts={masteryBreakdown}
            isDark={isDark}
          />
        )}

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center" role="group" aria-label="Filter by tag">
            <button
              onClick={() => setSelectedTag(null)}
              aria-pressed={selectedTag === null}
              className={`text-xs px-2 py-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                selectedTag === null
                  ? 'bg-emerald-600 text-white'
                  : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                aria-pressed={selectedTag === tag}
                className={`text-xs px-2 py-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  selectedTag === tag
                    ? 'bg-emerald-600 text-white'
                    : isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
            <button
              onClick={() => setShowTagManager(true)}
              className={`text-xs px-2 py-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isDark
                  ? 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-300'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-600'
              }`}
              title="Manage tags"
            >
              ⚙️ Manage
            </button>
          </div>
        )}
      </div>

      {/* Compare Tags Mode */}
      {compareMode && (
        <TagCompare
          allCards={cards}
          allReviews={allReviews}
          isDark={isDark}
          onCardClick={(card) => {
            setCompareMode(false);
            setEditingCard(card);
          }}
        />
      )}

      {/* Starter Decks button - hide in compare mode */}
      {!compareMode && (
        <button
          onClick={() => setShowStarterDecks(true)}
          className={`w-full mb-4 p-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 transition-colors ${
            isDark
              ? 'border-gray-600 text-gray-400 hover:border-emerald-600 hover:text-emerald-400'
              : 'border-gray-300 text-gray-500 hover:border-emerald-500 hover:text-emerald-600'
          }`}
        >
          <span className="text-xl">📚</span>
          <span className="font-medium">Browse Starter Decks</span>
        </button>
      )}

      {/* Empty state and card list - hide in compare mode */}
      {!compareMode && cards.length === 0 ? (
        <div className="text-center py-8">
          <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No cards yet</p>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => onNavigate('add')}
              className="text-emerald-600 hover:underline"
            >
              Add your first card
            </button>
            <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>or</span>
            <button
              onClick={() => setShowStarterDecks(true)}
              className="text-emerald-600 hover:underline"
            >
              Import a starter deck
            </button>
          </div>
        </div>
      ) : !compareMode && filteredCards.length === 0 ? (
        <div className="text-center py-8">
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No cards match your search</p>
        </div>
      ) : !compareMode ? (
        <div className="space-y-2">
          {filteredCards.map(card => (
            <div
              key={card.id}
              className={`rounded-lg shadow-sm p-4 border ${
                selectedIds.has(card.id)
                  ? 'border-emerald-500 bg-emerald-50'
                  : isDark
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex justify-between items-start">
                {selectMode && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(card.id)}
                    onChange={() => toggleSelect(card.id)}
                    className="mr-3 mt-1 h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                  />
                )}
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => selectMode ? toggleSelect(card.id) : setEditingCard(card)}
                >
                  <p className={isDark ? 'font-medium text-gray-100' : 'font-medium'}>{card.front}</p>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{card.back}</p>
                  {card.exampleEs && (
                    <p className={`text-xs mt-1 italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{card.exampleEs}</p>
                  )}
                  {card.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {card.tags.map(tag => (
                        <span
                          key={tag}
                          className={`text-xs px-2 py-0.5 rounded ${
                            isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {!selectMode && (
                  <div className="flex gap-2 ml-2">
                    {deleteConfirm === card.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(card.id)}
                          className="text-red-600 text-sm hover:underline"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className={`text-sm hover:underline ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setSelectedCardForCurve(card.id)}
                          className={isDark ? 'text-gray-500 hover:text-blue-400' : 'text-gray-400 hover:text-blue-500'}
                          title="View retention curve"
                        >
                          📈
                        </button>
                        <button
                          onClick={() => setEditingCard(card)}
                          className={isDark ? 'text-gray-500 hover:text-emerald-500' : 'text-gray-400 hover:text-emerald-600'}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(card.id)}
                          className={isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className={`flex items-center gap-2 text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <MasteryBadge card={card} isDark={isDark} showLabel />
                <DifficultyIndicator card={card} isDark={isDark} />
                <span>·</span>
                <span>{card.reps} reviews</span>
                <span>·</span>
                <span>{card.dueAt <= Date.now() ? 'Due now' : new Date(card.dueAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Stats */}
      {cards.length > 0 && (
        <p className={`text-center text-sm mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {filteredCards.length} of {cards.length} cards
        </p>
      )}

      {/* Edit modal */}
      {editingCard && (
        <EditCard
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSaved={loadCards}
          showToast={showToast}
          isDark={isDark}
        />
      )}

      {/* Starter Decks modal */}
      {showStarterDecks && (
        <StarterDecks
          isDark={isDark}
          onClose={() => setShowStarterDecks(false)}
          showToast={showToast}
          onImported={loadCards}
        />
      )}

      {/* Tag Manager modal */}
      {showTagManager && (
        <TagManager
          isDark={isDark}
          onClose={() => setShowTagManager(false)}
          showToast={showToast}
          onTagsChanged={loadCards}
        />
      )}

      {/* Forgetting Curve modal */}
      {selectedCardForCurve && (
        <ForgettingCurve
          cardId={selectedCardForCurve}
          onClose={() => setSelectedCardForCurve(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
}
