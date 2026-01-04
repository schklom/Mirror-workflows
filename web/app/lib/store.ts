'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getKeys, storeKeys, clearKeys } from '@/lib/keystore';
import type { Location } from '@/lib/api';

const SESSION_KEY = 'fmd_session';

export type Theme = 'light' | 'dark' | 'system';
export type UnitSystem = 'metric' | 'imperial';

interface UserData {
  fmdId: string;
  sessionToken: string;
  rsaEncKey: CryptoKey;
  rsaSigKey: CryptoKey;
}

interface PersistedAuthState {
  fmdId: string;
  sessionToken: string;
  persistent: boolean;
}

interface AppState {
  isLoggedIn: boolean;
  userData: UserData | null;
  isCheckingSession: boolean;
  theme: Theme;
  units: UnitSystem;
  pushUrl: string | null;
  locations: Location[];
  currentLocationIndex: number;
  pictures: string[];
  isPushUrlLoading: boolean;
  isLocationsLoading: boolean;
  isPicturesLoading: boolean;

  setUserData: (data: UserData, persistent: boolean) => Promise<void>;
  logout: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  setUnits: (units: UnitSystem) => void;
  setPushUrl: (url: string | null) => void;
  setLocations: (locations: Location[]) => void;
  setCurrentLocationIndex: (index: number) => void;
  setPictures: (pictures: string[]) => void;
  setPushUrlLoading: (loading: boolean) => void;
  setLocationsLoading: (loading: boolean) => void;
  setPicturesLoading: (loading: boolean) => void;
}

const applyTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      userData: null,
      isCheckingSession: true,
      theme: 'system',
      units: 'metric',
      pushUrl: null,
      locations: [],
      currentLocationIndex: 0,
      pictures: [],
      isPushUrlLoading: false,
      isLocationsLoading: false,
      isPicturesLoading: false,

      setUserData: async (data: UserData, persistent: boolean) => {
        if (persistent) {
          await storeKeys({
            rsaEncKey: data.rsaEncKey,
            rsaSigKey: data.rsaSigKey,
          });

          const authState: PersistedAuthState = {
            fmdId: data.fmdId,
            sessionToken: data.sessionToken,
            persistent: true,
          };
          localStorage.setItem(SESSION_KEY, JSON.stringify(authState));
        } else {
          const authState: PersistedAuthState = {
            fmdId: data.fmdId,
            sessionToken: data.sessionToken,
            persistent: false,
          };
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(authState));
        }

        set({ userData: data, isLoggedIn: true });
      },

      logout: async () => {
        try {
          localStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem(SESSION_KEY);
          await clearKeys();
        } catch {
          // Ignore errors during logout
        } finally {
          set({
            userData: null,
            isLoggedIn: false,
            pushUrl: null,
            locations: [],
            pictures: [],
          });
        }
      },

      setTheme: (theme: Theme) => {
        set({ theme });
        applyTheme(theme);
      },

      setUnits: (units: UnitSystem) => {
        set({ units });
      },

      setPushUrl: (pushUrl: string | null) => {
        set({ pushUrl });
      },

      setLocations: (locations: Location[]) => {
        set({ locations });
      },

      setCurrentLocationIndex: (currentLocationIndex: number) => {
        set({ currentLocationIndex });
      },

      setPictures: (pictures: string[]) => {
        set({ pictures });
      },

      setPushUrlLoading: (isPushUrlLoading: boolean) => {
        set({ isPushUrlLoading });
      },

      setLocationsLoading: (isLocationsLoading: boolean) => {
        set({ isLocationsLoading });
      },

      setPicturesLoading: (isPicturesLoading: boolean) => {
        set({ isPicturesLoading });
      },
    }),
    {
      name: 'fmd-storage',
      partialize: (state) => ({
        theme: state.theme,
        units: state.units,
      }),
    }
  )
);

export const logout = () => useStore.getState().logout();

if (typeof window !== 'undefined') {
  const state = useStore.getState();
  applyTheme(state.theme);

  void (async () => {
    try {
      const fromLocal = localStorage.getItem(SESSION_KEY);
      const fromSession = sessionStorage.getItem(SESSION_KEY);
      const raw = fromLocal || fromSession;

      if (!raw) {
        useStore.setState({ isCheckingSession: false });
        return;
      }

      const session = JSON.parse(raw) as PersistedAuthState;

      if (session.persistent) {
        const keys = await getKeys();

        if (keys) {
          useStore.setState({
            userData: {
              fmdId: session.fmdId,
              sessionToken: session.sessionToken,
              rsaEncKey: keys.rsaEncKey,
              rsaSigKey: keys.rsaSigKey,
            },
            isLoggedIn: true,
            isCheckingSession: false,
          });
        } else {
          localStorage.removeItem(SESSION_KEY);
          useStore.setState({ isCheckingSession: false });
        }
      } else {
        sessionStorage.removeItem(SESSION_KEY);
        useStore.setState({ isCheckingSession: false });
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      await clearKeys();
      useStore.setState({ isCheckingSession: false });
    }
  })();

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const currentTheme = useStore.getState().theme;
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  });
}
