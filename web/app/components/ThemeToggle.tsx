'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useStore, type Theme } from '@/lib/store';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export const ThemeToggle = () => {
  const { theme, setTheme } = useStore();

  return (
    <ToggleGroup
      type="single"
      value={theme}
      onValueChange={(value) => value && setTheme(value as Theme)}
    >
      <ToggleGroupItem value="light" aria-label="Light mode" className="w-24">
        <Sun className="mr-2 h-4 w-4" />
        Light
      </ToggleGroupItem>
      <ToggleGroupItem
        value="system"
        aria-label="System theme"
        className="w-24"
      >
        <Monitor className="mr-2 h-4 w-4" />
        System
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label="Dark mode" className="w-24">
        <Moon className="mr-2 h-4 w-4" />
        Dark
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
