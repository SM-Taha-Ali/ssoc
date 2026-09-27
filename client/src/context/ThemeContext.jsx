import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ACCENT_THEMES = [
  {
    id: 'purple',
    name: 'Royal Purple',
    description: 'Executive AI & SaaS aesthetic. Modern, sharp, and confident.',
    previewHex: '#6366f1',
    ringHex: '#818cf8',
    gradient: 'from-indigo-600 to-purple-600',
    tag: 'Default'
  },
  {
    id: 'oceanic',
    name: 'Oceanic Blue',
    description: 'Deep Pacific cobalt & cyan. High clarity, calm, classic enterprise.',
    previewHex: '#0ea5e9',
    ringHex: '#38bdf8',
    gradient: 'from-sky-500 to-blue-600',
    tag: 'FinTech'
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    description: 'High-contrast Bloomberg mint & forest. Pipeline prosperity & skimming ease.',
    previewHex: '#10b981',
    ringHex: '#34d399',
    gradient: 'from-emerald-500 to-teal-600',
    tag: 'High Growth'
  },
  {
    id: 'crimson',
    name: 'Crimson Ruby',
    description: 'Bold executive scarlet. Decisive, energetic, high urgency.',
    previewHex: '#f43f5e',
    ringHex: '#fb7185',
    gradient: 'from-rose-500 to-red-600',
    tag: 'Decisive'
  },
  {
    id: 'amber',
    name: 'Warm Amber',
    description: 'Sunset tangerine & honey gold. Warm, easy on tired eyes, zero blue glare.',
    previewHex: '#f59e0b',
    ringHex: '#fbbf24',
    gradient: 'from-amber-500 to-orange-600',
    tag: 'Eye Comfort'
  }
];

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('ssoc_theme_mode') || 'dark';
  });

  const [accent, setAccent] = useState(() => {
    return localStorage.getItem('ssoc_theme_accent') || 'purple';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-mode', mode);
    root.setAttribute('data-accent', accent);

    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    localStorage.setItem('ssoc_theme_mode', mode);
    localStorage.setItem('ssoc_theme_accent', accent);
  }, [mode, accent]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode, accent, setAccent, toggleMode, ACCENT_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      mode: 'dark',
      setMode: () => {},
      accent: 'purple',
      setAccent: () => {},
      toggleMode: () => {},
      ACCENT_THEMES
    };
  }
  return context;
}
