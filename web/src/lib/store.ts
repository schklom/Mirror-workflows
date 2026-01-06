'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storeKeys, clearKeys, getKeys } from '@/lib/keystore';
import type { Location } from '@/lib/api';

export type Theme = 'light' | 'dark' | 'system';
export type UnitSystem = 'metric' | 'imperial';

interface UserData {
  fmdId: string;
  sessionToken: string;
  rsaEncKey: CryptoKey;
  rsaSigKey: CryptoKey;
}

interface AppState {
  isLoggedIn: boolean;
  userData: UserData | null;
  wasAuthChecked: boolean;
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
  restoreAuth: () => Promise<void>;
  setTheme: (theme: Theme) => void;
}

const AUTH_KEY = 'fmd-auth';

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      userData: null,
      wasAuthChecked: false,
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

          localStorage.setItem(
            AUTH_KEY,
            JSON.stringify({
              fmdId: data.fmdId,
              sessionToken: data.sessionToken,
            })
          );
        }

        set({
          userData: data,
          isLoggedIn: true,
        });
      },

      logout: async () => {
        localStorage.removeItem(AUTH_KEY);
        await clearKeys();
        set({
          userData: null,
          isLoggedIn: false,
          pushUrl: null,
          locations: [],
          pictures: [],
        });
      },

      restoreAuth: async () => {
        try {
          const authData = localStorage.getItem(AUTH_KEY);
          if (!authData) return;

          const parsed = JSON.parse(authData) as {
            fmdId: string;
            sessionToken: string;
          };
          const keys = await getKeys();

          if (keys) {
            set({
              userData: {
                fmdId: parsed.fmdId,
                sessionToken: parsed.sessionToken,
                rsaEncKey: keys.rsaEncKey,
                rsaSigKey: keys.rsaSigKey,
              },
              isLoggedIn: true,
            });
          }
        } catch {
          localStorage.removeItem(AUTH_KEY);
          await clearKeys();
        } finally {
          set({ wasAuthChecked: true });
        }
      },

      setTheme: (theme: Theme) => {
        set({ theme });

        const isDark =
          theme === 'dark' ||
          (theme === 'system' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', isDark);
      },
    }),
    {
      name: 'fmd-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        units: state.units,
      }),
    }
  )
);

export const logout = () => useStore.getState().logout();
