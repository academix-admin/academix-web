'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <body className={theme}>{children}</body>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
