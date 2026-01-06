import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { ClientLayout } from '@/components/ClientLayout';
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

createRoot(document.getElementById('root')!).render(
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
