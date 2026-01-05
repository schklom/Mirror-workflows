'use client';

import { ReactNode, useEffect } from 'react';
import { Toaster } from 'sonner';
import { useStore } from '@/lib/store';

interface ClientLayoutProps {
  children: ReactNode;
}

export const ClientLayout = ({ children }: ClientLayoutProps) => {
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    void useStore.getState().restoreAuth();
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = () => {
      document.documentElement.classList.toggle('dark', mediaQuery.matches);
    };

    mediaQuery.addEventListener('change', applySystemTheme);
    return () => mediaQuery.removeEventListener('change', applySystemTheme);
  }, [theme]);

  return (
    <>
      {children}
      <Toaster position="top-right" richColors closeButton expand />
    </>
  );
};
