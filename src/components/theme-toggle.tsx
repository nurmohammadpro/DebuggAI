'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme, mounted } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => mounted && setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      title={
        mounted ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : 'Toggle theme'
      }
    >
      {!mounted ? (
        <Moon className="h-4 w-4 opacity-70" />
      ) : isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
