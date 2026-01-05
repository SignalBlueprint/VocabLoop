import { useState, useRef, useEffect } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  suggestions?: string[];
  isDark?: boolean;
}

export function TagInput({
  tags,
  onChange,
  placeholder = 'Add tag...',
  disabled = false,
  suggestions = [],
  isDark = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const MAX_TAG_LENGTH = 30;
  const MAX_TAGS = 10;

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
    if (trimmed && !tags.includes(trimmed) && tags.length < MAX_TAGS) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag on backspace when input is empty
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex flex-wrap gap-1 p-2 border rounded-lg focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 min-h-[42px] ${
        isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
      }`}>
        {/* Tag chips */}
        {tags.map(tag => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm ${
              isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className={`focus:outline-none ${isDark ? 'hover:text-emerald-200' : 'hover:text-emerald-600'}`}
              >
                &times;
              </button>
            )}
          </span>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value.slice(0, MAX_TAG_LENGTH));
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length >= MAX_TAGS ? 'Max tags reached' : tags.length === 0 ? placeholder : ''}
          disabled={disabled || tags.length >= MAX_TAGS}
          className={`flex-1 min-w-[80px] outline-none text-sm bg-transparent ${
            isDark ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
          }`}
          maxLength={MAX_TAG_LENGTH}
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className={`absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-40 overflow-y-auto ${
          isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          {filteredSuggestions.map(suggestion => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className={`w-full text-left px-3 py-2 text-sm focus:outline-none ${
                isDark ? 'text-gray-200 hover:bg-gray-700 focus:bg-gray-700' : 'text-gray-700 hover:bg-gray-100 focus:bg-gray-100'
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Helper text */}
      <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        Press Enter or comma to add tags
      </p>
    </div>
  );
}
