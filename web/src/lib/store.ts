import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storeKeys, clearKeys, getKeys } from '@/lib/keystore';
import type { Location } from '@/lib/api';
import type { Language } from '@/lib/i18n';

export type Theme = 'light' | 'dark' | 'system';
export type UnitSystem = 'metric' | 'imperial';
export type { Language } from '@/lib/i18n';

interface UserData {
  fmdId: string;
  sessionToken: string;
  rsaEncKey: CryptoKey;
  rsaSigKey: CryptoKey;
}

interface AppState {
  isLoggedIn: boolean;
  userData: UserData | null;
  wasAuthRestoreTried: boolean;
  theme: Theme;
  units: UnitSystem;
  language: Language;
  pushUrl: string | null;
  isPushUrlLoading: boolean;

  locations: Location[];
  currentLocationIndex: number;
  isLocationsLoading: boolean;

  pictures: string[];
  isPicturesLoading: boolean;

  setUserData: (data: UserData, persistent: boolean) => Promise<void>;
  logout: () => Promise<void>;
  restoreAuth: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
}

const KEY_AUTH = 'fmd-auth';
const KEY_SETTINGS = 'fmd-settings';

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      userData: null,
      wasAuthRestoreTried: false,
      theme: 'system',
      units: 'metric',
      language: 'en',
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
            KEY_AUTH,
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
        localStorage.removeItem(KEY_AUTH);
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
          const authData = localStorage.getItem(KEY_AUTH);
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
          localStorage.removeItem(KEY_AUTH);
          await clearKeys();
        } finally {
          set({ wasAuthRestoreTried: true });
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

      setLanguage: (language: Language) => {
        set({ language });
        // Language change is synced from main.tsx Root component
      },
    }),

    // Persist some of the state
    // https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md
    {
      name: KEY_SETTINGS,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        units: state.units,
        language: state.language,
      }),
    }
  )
);

export const logout = () => useStore.getState().logout();
