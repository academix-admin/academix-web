'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Step 1: Define all your supported themes
const SUPPORTED_THEMES = ['light', 'dark'] as const;
export type SupportedTheme = typeof SUPPORTED_THEMES[number];

// Step 2: Context type definition
interface ThemeContextProps {
  theme: SupportedTheme;
  setTheme: (theme: SupportedTheme) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
}

// Step 3: Create the context
const ThemeContext = createContext<ThemeContextProps>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  cycleTheme: () => {}
});

// Step 4: Provider component
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<SupportedTheme>('light');

  // Toggle only between light/dark (default behavior)
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Cycle through all supported themes
  const cycleTheme = () => {
    const index = SUPPORTED_THEMES.indexOf(theme);
    const next = SUPPORTED_THEMES[(index + 1) % SUPPORTED_THEMES.length];
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, cycleTheme }}>
      <body className={theme}>{children}</body>
    </ThemeContext.Provider>
  );
};

// Step 5: Hook to access theme context
export const useTheme = () => useContext(ThemeContext);
