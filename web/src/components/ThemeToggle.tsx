import { Sun, Moon, Monitor } from 'lucide-react';
import { useStore, type Theme } from '@/lib/store';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTranslation } from 'react-i18next';

export const ThemeToggle = () => {
  const { theme, setTheme } = useStore();
  const { t } = useTranslation('settings');

  return (
    <ToggleGroup
      type="single"
      value={theme}
      onValueChange={(value) => value && setTheme(value as Theme)}
    >
      <ToggleGroupItem
        value="light"
        aria-label="Light mode"
        className="min-w-24"
      >
        <Sun className="mr-2 h-4 w-4" />
        {t('theme_light')}
      </ToggleGroupItem>

      <ToggleGroupItem
        value="system"
        aria-label="System theme"
        className="min-w-24"
      >
        <Monitor className="mr-2 h-4 w-4" />
        {t('theme_system')}
      </ToggleGroupItem>

      <ToggleGroupItem value="dark" aria-label="Dark mode" className="min-w-24">
        <Moon className="mr-2 h-4 w-4" />
        {t('theme_dark')}
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
