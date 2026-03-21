import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('evora_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('evora_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggle = () => setDarkMode(d => !d);

  return (
    <ThemeContext.Provider value={{ darkMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};
