// 'use client';
//
// import React, { createContext, useContext, useState, ReactNode, useEffect} from 'react';
//
// // Step 1: Define all your supported themes
// const SUPPORTED_THEMES = ['light', 'dark'] as const;
// export type SupportedTheme = typeof SUPPORTED_THEMES[number];
//
// // Step 2: Context type definition
// interface ThemeContextProps {
//   theme: SupportedTheme;
//   setTheme: (theme: SupportedTheme) => void;
//   toggleTheme: () => void;
//   cycleTheme: () => void;
// }
//
// // Step 3: Create the context
// const ThemeContext = createContext<ThemeContextProps>({
//   theme: 'light',
//   setTheme: () => {},
//   toggleTheme: () => {},
//   cycleTheme: () => {}
// });
//
// // Step 4: Provider component
// export const ThemeProvider = ({ children }: { children: ReactNode }) => {
//   const [theme, setTheme] = useState<SupportedTheme>('light');
//
//   // Ensure theme is applied to <body>
//   useEffect(() => {
//     // Remove all supported theme classes
//     SUPPORTED_THEMES.forEach(t => document.body.classList.remove(t));
//     // Add the current theme class
//     document.body.classList.add(theme);
//   }, [theme]);
//
//   // Toggle only between light/dark (default behavior)
//   const toggleTheme = () => {
//     setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
//   };
//
//   // Cycle through all supported themes
//   const cycleTheme = () => {
//     const index = SUPPORTED_THEMES.indexOf(theme);
//     const next = SUPPORTED_THEMES[(index + 1) % SUPPORTED_THEMES.length];
//     setTheme(next);
//   };
//
//   return (
//     <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, cycleTheme }}>
//       {children}
//     </ThemeContext.Provider>
//   );
// };
//
// // Step 5: Hook to access theme context
// export const useTheme = () => useContext(ThemeContext);



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

