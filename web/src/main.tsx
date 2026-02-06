import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/lib/store';
import { ClientLayout } from '@/components/ClientLayout';
import '@/lib/i18n'; // Initialize i18n

import App from './App';
import './globals.css';

const ErrorFallback = () => (
  <div className="dark:bg-fmd-dark-lighter flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
    <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
      Something went wrong
    </h1>
    <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">
      An unexpected error occurred
    </p>
    <button
      onClick={() => window.location.reload()}
      className="rounded-lg bg-green-600 px-6 py-3 text-white transition-colors hover:bg-green-700"
    >
      Reload Page
    </button>
  </div>
);

const Root = () => {
  const { language } = useStore();
  const { i18n: i18nInstance } = useTranslation();

  useEffect(() => {
    // Sync cached language with i18n
    if (i18nInstance.language !== language) {
      void i18nInstance.changeLanguage(language);
    }
    // Update HTML lang attribute
    document.documentElement.lang = language;
  }, [language, i18nInstance]);

  return (
    <StrictMode>
      <BrowserRouter>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ClientLayout>
            <App />
          </ClientLayout>
        </ErrorBoundary>
      </BrowserRouter>
    </StrictMode>
  );
};

createRoot(document.getElementById('root')!).render(<Root />);
