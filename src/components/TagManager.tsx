import { useState, useEffect, useMemo } from 'react';
import { getAllCards, updateCard } from '../db/cards';
import type { Card } from '../types';

interface TagManagerProps {
  isDark: boolean;
  onClose: () => void;
  showToast: (message: string) => void;
  onTagsChanged: () => void;
}

interface TagStats {
  name: string;
  count: number;
  cards: Card[];
}

export function TagManager({ isDark, onClose, showToast, onTagsChanged }: TagManagerProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'count'>('count');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTargetTag, setMergeTargetTag] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const allCards = await getAllCards();
      setCards(allCards);
    } catch (error) {
      console.error('Failed to load cards:', error);
      showToast('Failed to load cards');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate tag statistics
  const tagStats: TagStats[] = useMemo(() => {
    const tagMap = new Map<string, Card[]>();

    for (const card of cards) {
      for (const tag of card.tags) {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, []);
        }
        tagMap.get(tag)!.push(card);
      }
    }

    const stats: TagStats[] = [];
    for (const [name, tagCards] of tagMap) {
      stats.push({ name, count: tagCards.length, cards: tagCards });
    }

    // Sort by selected criteria
    if (sortBy === 'name') {
      stats.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      stats.sort((a, b) => b.count - a.count);
    }

    return stats;
  }, [cards, sortBy]);

  // Filter tags by search query
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tagStats;
    const query = searchQuery.toLowerCase();
    return tagStats.filter(tag => tag.name.toLowerCase().includes(query));
  }, [tagStats, searchQuery]);

  // Rename a tag across all cards
  const handleRenameTag = async (oldName: string, newName: string) => {
    const trimmedNew = newName.trim().toLowerCase();
    if (!trimmedNew) {
      showToast('Tag name cannot be empty');
      return;
    }
    if (trimmedNew === oldName) {
      setEditingTag(null);
      return;
    }
    if (tagStats.some(t => t.name === trimmedNew && t.name !== oldName)) {
      showToast('A tag with this name already exists');
      return;
    }

    try {
      const cardsWithTag = cards.filter(c => c.tags.includes(oldName));
      for (const card of cardsWithTag) {
        const newTags = card.tags.map(t => t === oldName ? trimmedNew : t);
        await updateCard({ ...card, tags: newTags });
      }

      setCards(prev => prev.map(card => {
        if (card.tags.includes(oldName)) {
          return { ...card, tags: card.tags.map(t => t === oldName ? trimmedNew : t) };
        }
        return card;
      }));

      showToast(`Renamed "${oldName}" to "${trimmedNew}"`);
      setEditingTag(null);
      setNewTagName('');
      onTagsChanged();
    } catch (error) {
      console.error('Failed to rename tag:', error);
      showToast('Failed to rename tag');
    }
  };

  // Merge selected tags into one
  const handleMergeTags = async () => {
    const targetName = mergeTargetTag.trim().toLowerCase();
    if (!targetName) {
      showToast('Please enter a target tag name');
      return;
    }
    if (selectedTags.size < 2) {
      showToast('Select at least 2 tags to merge');
      return;
    }

    try {
      const tagsToMerge = Array.from(selectedTags);
      const affectedCards = cards.filter(c => c.tags.some(t => tagsToMerge.includes(t)));

      for (const card of affectedCards) {
        // Remove all merged tags and add the target tag
        const newTags = card.tags.filter(t => !tagsToMerge.includes(t));
        if (!newTags.includes(targetName)) {
          newTags.push(targetName);
        }
        await updateCard({ ...card, tags: newTags });
      }

      setCards(prev => prev.map(card => {
        if (card.tags.some(t => tagsToMerge.includes(t))) {
          const newTags = card.tags.filter(t => !tagsToMerge.includes(t));
          if (!newTags.includes(targetName)) {
            newTags.push(targetName);
          }
          return { ...card, tags: newTags };
        }
        return card;
      }));

      showToast(`Merged ${tagsToMerge.length} tags into "${targetName}"`);
      setSelectedTags(new Set());
      setShowMergeModal(false);
      setMergeTargetTag('');
      onTagsChanged();
    } catch (error) {
      console.error('Failed to merge tags:', error);
      showToast('Failed to merge tags');
    }
  };

  // Delete selected tags from all cards
  const handleDeleteTags = async () => {
    if (selectedTags.size === 0) return;

    try {
      const tagsToDelete = Array.from(selectedTags);
      const affectedCards = cards.filter(c => c.tags.some(t => tagsToDelete.includes(t)));

      for (const card of affectedCards) {
        const newTags = card.tags.filter(t => !tagsToDelete.includes(t));
        await updateCard({ ...card, tags: newTags });
      }

      setCards(prev => prev.map(card => {
        if (card.tags.some(t => tagsToDelete.includes(t))) {
          return { ...card, tags: card.tags.filter(t => !tagsToDelete.includes(t)) };
        }
        return card;
      }));

      showToast(`Removed ${tagsToDelete.length} tag${tagsToDelete.length > 1 ? 's' : ''} from ${affectedCards.length} cards`);
      setSelectedTags(new Set());
      setShowDeleteConfirm(false);
      onTagsChanged();
    } catch (error) {
      console.error('Failed to delete tags:', error);
      showToast('Failed to delete tags');
    }
  };

  const toggleTagSelection = (tagName: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tagName)) {
        next.delete(tagName);
      } else {
        next.add(tagName);
      }
      return next;
    });
  };

  const selectAllTags = () => {
    setSelectedTags(new Set(filteredTags.map(t => t.name)));
  };

  const deselectAllTags = () => {
    setSelectedTags(new Set());
  };

  // Get color for tag based on its index (for visual variety)
  const getTagColor = (index: number) => {
    const colors = [
      'emerald', 'blue', 'purple', 'pink', 'amber', 'cyan', 'indigo', 'rose', 'teal', 'orange'
    ];
    return colors[index % colors.length];
  };

  const getTagColorClasses = (color: string, selected: boolean) => {
    if (selected) {
      return isDark
        ? 'bg-emerald-600 text-white border-emerald-500'
        : 'bg-emerald-500 text-white border-emerald-400';
    }

    const colorMap: Record<string, string> = {
      emerald: isDark ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700' : 'bg-emerald-100 text-emerald-700 border-emerald-200',
      blue: isDark ? 'bg-blue-900/50 text-blue-300 border-blue-700' : 'bg-blue-100 text-blue-700 border-blue-200',
      purple: isDark ? 'bg-purple-900/50 text-purple-300 border-purple-700' : 'bg-purple-100 text-purple-700 border-purple-200',
      pink: isDark ? 'bg-pink-900/50 text-pink-300 border-pink-700' : 'bg-pink-100 text-pink-700 border-pink-200',
      amber: isDark ? 'bg-amber-900/50 text-amber-300 border-amber-700' : 'bg-amber-100 text-amber-700 border-amber-200',
      cyan: isDark ? 'bg-cyan-900/50 text-cyan-300 border-cyan-700' : 'bg-cyan-100 text-cyan-700 border-cyan-200',
      indigo: isDark ? 'bg-indigo-900/50 text-indigo-300 border-indigo-700' : 'bg-indigo-100 text-indigo-700 border-indigo-200',
      rose: isDark ? 'bg-rose-900/50 text-rose-300 border-rose-700' : 'bg-rose-100 text-rose-700 border-rose-200',
      teal: isDark ? 'bg-teal-900/50 text-teal-300 border-teal-700' : 'bg-teal-100 text-teal-700 border-teal-200',
      orange: isDark ? 'bg-orange-900/50 text-orange-300 border-orange-700' : 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colorMap[color] || colorMap.emerald;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-lg max-h-[90vh] rounded-xl shadow-xl overflow-hidden flex flex-col animate-fade-scale ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              Manage Tags
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <span className="sr-only">Close</span>
              ✕
            </button>
          </div>

          {/* Search and sort */}
          <div className="flex gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'count')}
              className={`px-3 py-2 rounded-lg border text-sm ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="count">By count</option>
              <option value="name">By name</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className={`animate-spin w-6 h-6 border-2 rounded-full ${
                isDark ? 'border-gray-600 border-t-emerald-400' : 'border-gray-300 border-t-emerald-500'
              }`} />
            </div>
          ) : tagStats.length === 0 ? (
            <div className="text-center py-8">
              <p className={`text-4xl mb-2`}>🏷️</p>
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                No tags yet
              </p>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Add tags to your cards to organize them
              </p>
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-8">
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                No tags match your search
              </p>
            </div>
          ) : (
            <>
              {/* Selection controls */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2 items-center">
                  <button
                    onClick={selectedTags.size === filteredTags.length ? deselectAllTags : selectAllTags}
                    className={`text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-600'} hover:underline`}
                  >
                    {selectedTags.size === filteredTags.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedTags.size > 0 && (
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      ({selectedTags.size} selected)
                    </span>
                  )}
                </div>
                <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {tagStats.length} tag{tagStats.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Tags list */}
              <div className="space-y-2">
                {filteredTags.map((tag, index) => (
                  <div
                    key={tag.name}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                      selectedTags.has(tag.name)
                        ? isDark
                          ? 'border-emerald-500 bg-emerald-900/20'
                          : 'border-emerald-500 bg-emerald-50'
                        : isDark
                        ? 'border-gray-700 hover:border-gray-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedTags.has(tag.name)}
                      onChange={() => toggleTagSelection(tag.name)}
                      className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />

                    {/* Tag name / edit input */}
                    {editingTag === tag.name ? (
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameTag(tag.name, newTagName);
                          } else if (e.key === 'Escape') {
                            setEditingTag(null);
                            setNewTagName('');
                          }
                        }}
                        onBlur={() => {
                          if (newTagName !== tag.name) {
                            handleRenameTag(tag.name, newTagName);
                          } else {
                            setEditingTag(null);
                          }
                        }}
                        autoFocus
                        className={`flex-1 px-2 py-1 rounded border text-sm ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-gray-100'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    ) : (
                      <button
                        onClick={() => toggleTagSelection(tag.name)}
                        className={`flex-1 text-left px-3 py-1 rounded-full text-sm border ${
                          getTagColorClasses(getTagColor(index), selectedTags.has(tag.name))
                        }`}
                      >
                        {tag.name}
                      </button>
                    )}

                    {/* Card count */}
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {tag.count} card{tag.count !== 1 ? 's' : ''}
                    </span>

                    {/* Edit button */}
                    {editingTag !== tag.name && (
                      <button
                        onClick={() => {
                          setEditingTag(tag.name);
                          setNewTagName(tag.name);
                        }}
                        className={`p-1 rounded ${
                          isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                        }`}
                        title="Rename tag"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        {selectedTags.size > 0 && (
          <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMergeModal(true)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm ${
                  isDark
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                disabled={selectedTags.size < 2}
                title={selectedTags.size < 2 ? 'Select at least 2 tags to merge' : 'Merge selected tags'}
              >
                Merge ({selectedTags.size})
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm ${
                  isDark
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                Delete ({selectedTags.size})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMergeModal(false)} />
          <div className={`relative w-full max-w-sm rounded-xl shadow-xl p-4 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              Merge Tags
            </h3>
            <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Merge {selectedTags.size} tags into one. Enter the target tag name:
            </p>
            <div className="mb-3">
              <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Tags to merge: {Array.from(selectedTags).join(', ')}
              </p>
            </div>
            <input
              type="text"
              value={mergeTargetTag}
              onChange={(e) => setMergeTargetTag(e.target.value)}
              placeholder="Target tag name..."
              className={`w-full px-3 py-2 rounded-lg border text-sm mb-4 ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleMergeTags();
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowMergeModal(false);
                  setMergeTargetTag('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm ${
                  isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleMergeTags}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm ${
                  isDark
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className={`relative w-full max-w-sm rounded-xl shadow-xl p-4 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              Delete Tags?
            </h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              This will remove {selectedTags.size} tag{selectedTags.size > 1 ? 's' : ''} from all cards.
              The cards themselves won't be deleted.
            </p>
            <div className={`text-xs mb-4 p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {Array.from(selectedTags).join(', ')}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm ${
                  isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTags}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm ${
                  isDark
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
