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
      onClick={() => mounted && setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={className}
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
