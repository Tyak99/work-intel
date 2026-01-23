'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { themes, ThemeConfig, ThemeId, ThemeLabelKey, DEFAULT_THEME_ID } from '@/lib/theme-config';

interface ThemeContextType {
  theme: ThemeConfig;
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
  t: (key: ThemeLabelKey) => string;
  // Convenience accessors
  isDark: boolean;
  hasGlowEffects: boolean;
  hasAnimations: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Get initial theme from localStorage synchronously to prevent flash
function getInitialTheme(): ThemeId {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('work-intel-theme') as ThemeId;
    if (savedTheme && themes[savedTheme]) {
      return savedTheme;
    }
  }
  return DEFAULT_THEME_ID;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  // Mark as mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply theme classes whenever themeId changes
  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = themes[themeId];

    // Remove all theme classes
    Object.keys(themes).forEach(t => root.classList.remove(`theme-${t}`));
    root.classList.add(`theme-${themeId}`);

    // Toggle dark class based on theme's isDark property
    if (currentTheme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Persist to localStorage
    localStorage.setItem('work-intel-theme', themeId);

    // Data attribute for CSS selectors
    document.body.dataset.theme = themeId;
  }, [themeId]);

  // Prevent flash of wrong theme during SSR hydration
  // Apply theme classes immediately on first client render
  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = themes[themeId];

    // Ensure correct classes are set immediately
    Object.keys(themes).forEach(t => root.classList.remove(`theme-${t}`));
    root.classList.add(`theme-${themeId}`);

    if (currentTheme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  const theme = themes[themeId];

  const setTheme = (id: ThemeId) => {
    if (themes[id]) {
      setThemeId(id);
    }
  };

  const t = (key: ThemeLabelKey): string => {
    return theme.labels[key] || themes[DEFAULT_THEME_ID].labels[key];
  };

  const value: ThemeContextType = {
    theme,
    themeId,
    setTheme,
    t,
    isDark: theme.isDark,
    hasGlowEffects: theme.hasGlowEffects,
    hasAnimations: theme.hasAnimations,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
