import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Maintain manual control over the order and which languages are shown.
export const SUPPORTED_LANGUAGES = ['en', 'de'] as const;

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
