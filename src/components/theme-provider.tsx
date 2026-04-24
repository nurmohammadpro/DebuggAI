'use client';

import * as React from 'react';

export type AppTheme = 'dark' | 'light';

type ThemeContextValue = {
  theme: AppTheme;
  resolvedTheme: AppTheme;
  mounted: boolean;
  setTheme: (theme: AppTheme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  root.style.colorScheme = theme;
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'theme',
}: {
  children: React.ReactNode;
  defaultTheme?: AppTheme;
  storageKey?: string;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [theme, setThemeState] = React.useState<AppTheme>(defaultTheme);

  React.useEffect(() => {
    setMounted(true);
    try {
      const stored = window.localStorage.getItem(storageKey);
      const next = stored === 'light' || stored === 'dark' ? stored : defaultTheme;
      setThemeState(next);
      applyTheme(next);
    } catch {
      applyTheme(defaultTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = React.useCallback(
    (next: AppTheme) => {
      setThemeState(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // ignore
      }
      applyTheme(next);
    },
    [storageKey]
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme: theme,
      mounted,
      setTheme,
    }),
    [mounted, setTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: 'dark' as AppTheme,
      resolvedTheme: 'dark' as AppTheme,
      mounted: false,
      setTheme: () => {},
    };
  }
  return ctx;
}

