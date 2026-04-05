import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { cn } from '@/shared/lib';

interface SearchableSelectOption {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  value: string | number | null;
  onChange: (value: any) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className,
}) => {
  const handleChange = (newValue: string) => {
    // Try to find if it's a number option
    const option = options.find((opt) => String(opt.value) === newValue);
    if (option) {
      onChange(option.value);
    } else {
      onChange(newValue);
    }
  };

  const handleClear = () => {
    onChange(null);
  };

  return (
    <div className={cn('relative', className)}>
      <Select
        value={value !== null ? String(value) : undefined}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={String(option.value)} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value !== null && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-8 top-1/2 -translate-y-1/2 text-telegram-hint hover:text-telegram-text p-1"
          aria-label="Clear selection"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};
