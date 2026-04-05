import { useEffect, useState, useCallback } from 'react';
import {
  init,
  miniApp,
  viewport,
  themeParams,
  backButton,
  mainButton,
  hapticFeedback,
  initData,
} from '@telegram-apps/sdk';
import { apiClient } from '@/shared/api';
import type { TelegramUser } from '@/shared/api';

interface TelegramTheme {
  bgColor: string;
  textColor: string;
  hintColor: string;
  linkColor: string;
  buttonColor: string;
  buttonTextColor: string;
  secondaryBgColor: string;
}

interface UseTelegramReturn {
  isReady: boolean;
  user: TelegramUser | null;
  theme: TelegramTheme;
  viewportHeight: number;
  isExpanded: boolean;
  showBackButton: (onClick: () => void) => void;
  hideBackButton: () => void;
  showMainButton: (text: string, onClick: () => void, options?: { color?: string }) => void;
  hideMainButton: () => void;
  enableMainButton: () => void;
  disableMainButton: () => void;
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  closeApp: () => void;
  expandApp: () => void;
}

const defaultTheme: TelegramTheme = {
  bgColor: '#ffffff',
  textColor: '#000000',
  hintColor: '#999999',
  linkColor: '#2481cc',
  buttonColor: '#2481cc',
  buttonTextColor: '#ffffff',
  secondaryBgColor: '#f5f5f5',
};

const isTelegramEnv = (): boolean => {
  try {
    const tg = (window as any).Telegram;
    return !!(
      tg?.WebApp ||
      /WebView|Telegram/i.test(navigator.userAgent)
    );
  } catch {
    return false;
  }
};

export function useTelegram(): UseTelegramReturn {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [theme, setTheme] = useState<TelegramTheme>(defaultTheme);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    console.log('[useTelegram] Initializing...');

    const markReady = () => {
      console.log('[useTelegram] Marking as ready');
      setIsReady(true);
    };

    try {
      if (!isTelegramEnv()) {
        console.log('[useTelegram] Not in Telegram environment, using defaults');

        if (import.meta.env.DEV) {
          setUser({
            id: 123456789,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
            language_code: 'en',
          });
        }

        markReady();
        return;
      }

      try {
        init();
        miniApp.mount();
        viewport.mount();
        themeParams.mount();

        try {
          if (viewport.expand.isAvailable()) {
            viewport.expand();
            setIsExpanded(true);
          }
        } catch {
          // Ignore
        }

        miniApp.ready();
      } catch (sdkError) {
        console.warn('[useTelegram] SDK initialization error:', sdkError);
        markReady();
        return;
      }

      try {
        const initDataState = initData.state();
        if (initDataState && 'user' in initDataState && initDataState.user) {
          setUser(initDataState.user as TelegramUser);
        }

        const rawInitData = initData.raw();
        if (rawInitData) {
          apiClient.setInitData(rawInitData);
          console.log('[useTelegram] InitData passed to API client');
        }
      } catch (e) {
        console.warn('[useTelegram] Failed to get initData:', e);
      }

      try {
        const tp = themeParams.state();
        if (tp) {
          setTheme({
            bgColor: tp.bgColor || defaultTheme.bgColor,
            textColor: tp.textColor || defaultTheme.textColor,
            hintColor: tp.hintColor || defaultTheme.hintColor,
            linkColor: tp.linkColor || defaultTheme.linkColor,
            buttonColor: tp.buttonColor || defaultTheme.buttonColor,
            buttonTextColor: tp.buttonTextColor || defaultTheme.buttonTextColor,
            secondaryBgColor: tp.secondaryBgColor || defaultTheme.secondaryBgColor,
          });
        }
      } catch {
        // Use default theme
      }

      try {
        viewport.bindCssVars();
      } catch {
        const handleResize = () => setViewportHeight(window.innerHeight);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
      }

      markReady();

      return () => {
        try {
          viewport.unmount();
          themeParams.unmount();
          miniApp.unmount();
        } catch {}
      };
    } catch (error) {
      console.warn('[useTelegram] Fatal error:', error);
      markReady();
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--tg-theme-bg-color', theme.bgColor);
    root.style.setProperty('--tg-theme-text-color', theme.textColor);
    root.style.setProperty('--tg-theme-hint-color', theme.hintColor);
    root.style.setProperty('--tg-theme-link-color', theme.linkColor);
    root.style.setProperty('--tg-theme-button-color', theme.buttonColor);
    root.style.setProperty('--tg-theme-button-text-color', theme.buttonTextColor);
    root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondaryBgColor);
  }, [theme]);

  const showBackButton = useCallback((onClick: () => void) => {
    try {
      backButton.onClick(onClick);
      backButton.show();
    } catch {}
  }, []);

  const hideBackButton = useCallback(() => {
    try {
      backButton.hide();
    } catch {}
  }, []);

  const mb = mainButton as any;

  const showMainButton = useCallback((text: string, onClick: () => void, options?: { color?: string }) => {
    try {
      mb.setParams({
        text,
        isVisible: true,
        isEnabled: true,
        bgColor: options?.color,
      });
      mb.onClick(onClick);
    } catch {}
  }, [mb]);

  const hideMainButton = useCallback(() => {
    try {
      mb.setParams({ isVisible: false });
      mb.offClick();
    } catch {}
  }, [mb]);

  const enableMainButton = useCallback(() => {
    try {
      mb.setParams({ isEnabled: true });
    } catch {}
  }, [mb]);

  const disableMainButton = useCallback(() => {
    try {
      mb.setParams({ isEnabled: false });
    } catch {}
  }, [mb]);

  const impactOccurred = useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
    try {
      hapticFeedback.impactOccurred(style);
    } catch {}
  }, []);

  const notificationOccurred = useCallback((type: 'error' | 'success' | 'warning') => {
    try {
      hapticFeedback.notificationOccurred(type);
    } catch {}
  }, []);

  const closeApp = useCallback(() => {
    try {
      miniApp.close();
    } catch {}
  }, []);

  const expandApp = useCallback(() => {
    try {
      if (viewport.expand.isAvailable()) {
        viewport.expand();
        setIsExpanded(true);
      }
    } catch {}
  }, []);

  return {
    isReady,
    user,
    theme,
    viewportHeight,
    isExpanded,
    showBackButton,
    hideBackButton,
    showMainButton,
    hideMainButton,
    enableMainButton,
    disableMainButton,
    impactOccurred,
    notificationOccurred,
    closeApp,
    expandApp,
  };
}
