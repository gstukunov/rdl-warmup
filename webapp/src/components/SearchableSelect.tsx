import React, { useState, useRef, useEffect, useMemo } from 'react';
import './SearchableSelect.css';

interface SearchableSelectOption {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Search...',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find the selected option label
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [value, options]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const lowerSearch = searchTerm.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(lowerSearch)
    );
  }, [searchTerm, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
      }
    }
  };

  const handleSelect = (selectedValue: string | number) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm('');
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-select ${className} ${isOpen ? 'is-open' : ''} ${
        disabled ? 'is-disabled' : ''
      }`}
    >
      {/* Trigger button / Display */}
      <div className="searchable-select__trigger" onClick={handleToggle}>
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            className="searchable-select__input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={`searchable-select__value ${
              !selectedOption ? 'placeholder' : ''
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        )}

        <div className="searchable-select__actions">
          {value && !isOpen && (
            <button
              type="button"
              className="searchable-select__clear"
              onClick={handleClear}
              aria-label="Clear selection"
            >
              ×
            </button>
          )}
          <span className="searchable-select__arrow">▼</span>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="searchable-select__dropdown">
          {filteredOptions.length === 0 ? (
            <div className="searchable-select__empty">
              Ничего не найдено
            </div>
          ) : (
            <ul className="searchable-select__list">
              {filteredOptions.map((option) => (
                <li
                  key={option.value}
                  className={`searchable-select__item ${
                    option.value === value ? 'is-selected' : ''
                  }`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
