'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';

const STORED_THEMES = ['light', 'dark', 'system'] as const;
type StoredTheme = (typeof STORED_THEMES)[number];
export type Theme = 'light' | 'dark';

interface ThemeContextProps {
  theme: Theme;
  storedTheme: StoredTheme;
  setTheme: (theme: StoredTheme) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'light',
  storedTheme: 'system',
  setTheme: () => {},
  toggleTheme: () => {},
  cycleTheme: () => {},
});

const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [storedTheme, setStoredTheme] = useState<StoredTheme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<Theme>('light');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage and apply immediately
  useEffect(() => {
    const initializeTheme = () => {
      try {
        const saved = localStorage.getItem('theme') as StoredTheme | null;
        const initialStoredTheme = saved && STORED_THEMES.includes(saved)
          ? saved
          : 'system';

        const initialResolvedTheme = initialStoredTheme === 'system'
          ? getSystemTheme()
          : initialStoredTheme;

        // Apply immediately to prevent flash
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(initialResolvedTheme);
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(initialResolvedTheme);

        setStoredTheme(initialStoredTheme);
        setResolvedTheme(initialResolvedTheme);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing theme:', error);
        // Fallback to light theme
        document.documentElement.classList.add('light');
        document.body.classList.add('light');
        setStoredTheme('system');
        setResolvedTheme('light');
        setIsInitialized(true);
      }
    };

    initializeTheme();
  }, []);

  // Update theme when storedTheme changes
  useEffect(() => {
    if (!isInitialized) return;

    const updateTheme = () => {
      const newResolvedTheme = storedTheme === 'system' ? getSystemTheme() : storedTheme;
      setResolvedTheme(newResolvedTheme);

      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newResolvedTheme);
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(newResolvedTheme);
    };

    updateTheme();
  }, [storedTheme, isInitialized]);

  // System theme listener
  useEffect(() => {
    if (!isInitialized || storedTheme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      const newResolvedTheme = getSystemTheme();
      setResolvedTheme(newResolvedTheme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newResolvedTheme);
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(newResolvedTheme);
    };

    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [storedTheme, isInitialized]);

  const setTheme = useCallback((newTheme: StoredTheme) => {
    setStoredTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const currentEffectiveTheme = storedTheme === 'system' ? resolvedTheme : storedTheme;
    setTheme(currentEffectiveTheme === 'dark' ? 'light' : 'dark');
  }, [storedTheme, resolvedTheme, setTheme]);

  const cycleTheme = useCallback(() => {
    const index = STORED_THEMES.indexOf(storedTheme);
    const next = STORED_THEMES[(index + 1) % STORED_THEMES.length];
    setTheme(next);
  }, [storedTheme, setTheme]);

  // Don't render children until theme is initialized to prevent flash
  if (!isInitialized) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        storedTheme,
        setTheme,
        toggleTheme,
        cycleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

