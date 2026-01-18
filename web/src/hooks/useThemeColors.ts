'use client';

export const useThemeColors = () => {
  const getCssVariable = (name: string) => {
    if (typeof window === 'undefined') return '';
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  };

  return {
    accentColor: getCssVariable('--color-fmd-accent'),
    green: getCssVariable('--color-fmd-green'),
    greenDark: getCssVariable('--color-fmd-green-dark'),
    dark: getCssVariable('--color-fmd-dark'),
    darkLighter: getCssVariable('--color-fmd-dark-lighter'),
    darkBorder: getCssVariable('--color-fmd-dark-border'),
    light: getCssVariable('--color-fmd-light'),
    lightDarker: getCssVariable('--color-fmd-light-darker'),
    lightBorder: getCssVariable('--color-fmd-light-border'),
  };
};
