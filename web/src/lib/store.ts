import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  clearKeys,
  CryptoKeysV2,
  CryptoKeysV1,
  storeKeysV2,
  storeKeysV1,
  getKeysV1,
  getKeysV2,
} from '@/lib/keystore';
import type { Location } from '@/lib/api';
import { getInitialLanguage, type Language } from '@/lib/i18n';
import { CRYPTO_PROTO_V2 } from './crypto';

export type Theme = 'light' | 'dark' | 'system';
export type UnitSystem = 'metric' | 'imperial';
export type { Language } from '@/lib/i18n';

// Store for sensitive information
export interface UserData {
  fmdId: string;
  sessionToken: string;
  keysV1: CryptoKeysV1 | null;
  keysV2: CryptoKeysV2 | null;
  fingerprint: string;
}

// Main data store
interface AppState {
  isLoggedIn: boolean;
  protoVersion: number;
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
      protoVersion: CRYPTO_PROTO_V2,
      userData: null,
      wasAuthRestoreTried: false,
      theme: 'system',
      units: 'metric',
      language: getInitialLanguage(),
      pushUrl: null,
      locations: [],
      currentLocationIndex: 0,
      pictures: [],
      isPushUrlLoading: false,
      isLocationsLoading: false,
      isPicturesLoading: false,

      setUserData: async (data: UserData, persistent: boolean) => {
        if (persistent) {
          if (data.keysV1) {
            await storeKeysV1(data.keysV1);
          }
          if (data.keysV2) {
            await storeKeysV2(data.keysV2);
          }

          localStorage.setItem(
            KEY_AUTH,
            JSON.stringify({
              fmdId: data.fmdId,
              sessionToken: data.sessionToken,
              fingerprint: data.fingerprint,
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
            fingerprint: string;
          };
          const [keysV1, keysV2] = await Promise.all([getKeysV1(), getKeysV2()]);

          if (keysV1 || keysV2) {
            set({
              userData: {
                fmdId: parsed.fmdId,
                sessionToken: parsed.sessionToken,
                keysV1: keysV1,
                keysV2: keysV2,
                fingerprint: parsed.fingerprint,
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
          (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        document.documentElement.classList.toggle('dark', isDark);
      },

      setLanguage: (language: Language) => {
        set({ language });
        // Language change is synced from main.tsx Root component
      },
    }),

    // Persist some of the state
    // https://github.com/pmndrs/zustand/blob/main/docs/reference/integrations/persisting-store-data.md
    {
      name: KEY_SETTINGS,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        protoVersion: state.protoVersion,
        theme: state.theme,
        units: state.units,
        language: state.language,
      }),
    }
  )
);

export const logout = () => useStore.getState().logout();
