import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'download-manager-theme';

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return 'auto';
  });

  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }, []);

  const getEffectiveTheme = useCallback((): 'light' | 'dark' => {
    if (theme === 'auto') {
      return getSystemTheme();
    }
    return theme;
  }, [theme, getSystemTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);

    const effectiveTheme = newTheme === 'auto' ? getSystemTheme() : newTheme;
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [getSystemTheme]);

  useEffect(() => {
    const effectiveTheme = getEffectiveTheme();
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [getEffectiveTheme]);

  useEffect(() => {
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return {
    theme,
    effectiveTheme: getEffectiveTheme(),
    setTheme,
    availableThemes: [
      { value: 'light', label: '亮色模式', icon: '☀️' },
      { value: 'dark', label: '深色模式', icon: '🌙' },
      { value: 'auto', label: '跟随系统', icon: '🖥️' },
    ] as const,
  };
};