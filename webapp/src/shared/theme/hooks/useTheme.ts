import { useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const STORAGE_KEY = 'rdl-theme';

const getSystemTheme = (): Theme => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

const getInitialTheme = (): Theme => {
  // Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored && (stored === 'light' || stored === 'dark')) {
    return stored;
  }
  // Fall back to system preference
  return getSystemTheme();
};

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>('light');
  const [isReady, setIsReady] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const initialTheme = getInitialTheme();
    setThemeState(initialTheme);
    setIsReady(true);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!isReady) return;

    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Store preference
    localStorage.setItem(STORAGE_KEY, theme);

    // Update Telegram CSS variables for consistency
    if (theme === 'dark') {
      root.style.setProperty('--tg-theme-bg-color', '#000000');
      root.style.setProperty('--tg-theme-text-color', '#ffffff');
      root.style.setProperty('--tg-theme-secondary-bg-color', '#1a1a1a');
      root.style.setProperty('--tg-theme-hint-color', '#666666');
    } else {
      root.style.setProperty('--tg-theme-bg-color', '#ffffff');
      root.style.setProperty('--tg-theme-text-color', '#000000');
      root.style.setProperty('--tg-theme-secondary-bg-color', '#f5f5f5');
      root.style.setProperty('--tg-theme-hint-color', '#999999');
    }
  }, [theme, isReady]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't set a preference
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
  };
}
