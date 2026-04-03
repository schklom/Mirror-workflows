import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Maintain manual control over the order and which languages are shown.
// For easy discoverability by native speakers, hardcode the language name in the language itself.
export const SUPPORTED_LANGUAGES_PAIRS = [
  { code: 'en', label: 'English' },
  // English at the top, then alphabetically
  { code: 'de', label: 'Deutsch' },
  { code: 'el', label: 'ελληνικά' },
  { code: 'et', label: 'eesti keel' },
  { code: 'fr', label: 'Français' },
  { code: 'lv', label: 'Latviešu' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pt-BR', label: 'Português do Brasil' },
  { code: 'sl', label: 'Slovenščina' },
  { code: 'zh-Hans', label: 'Chinese Simplified' },
  { code: 'zh-Hant', label: '中文（繁體）' }, // Chinese Traditional
] as const;

export const SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES_PAIRS.flatMap(
  (ele) => ele.code
);

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

// https://main.vite.dev/guide/features.html#glob-import
// @ts-ignore - no types available
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
const translationModules = import.meta.glob('@/locales/*/*.json', {
  eager: true,
});

const resources = {} as Record<Language, Record<string, string>>;

for (const lang of SUPPORTED_LANGUAGES) {
  resources[lang] = {};
}

// Load translations into `resources` object.
for (const path in translationModules) {
  const match = path.match(/locales\/([^/]+)\/([^/]+)\.json$/)!;
  const [, lang, namespace] = match;

  // Some incomplete translations may not be included in the build
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) {
    resources[lang as Language][namespace] = translationModules[path].default;
  }
}

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React is already safe from XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18next;
