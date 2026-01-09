// FOUC prevention - runs before anything renders
try {
  const stored = localStorage.getItem('fmd-settings');
  const theme = stored ? JSON.parse(stored).state.theme : 'system';
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    document.documentElement.classList.add('dark');
  }
} catch (_) {}
