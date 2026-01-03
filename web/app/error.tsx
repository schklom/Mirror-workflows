'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorPage = ({ error, reset }: ErrorPageProps) => (
  <div className="dark:bg-fmd-dark-lighter flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <div className="w-full max-w-md text-center">
      <div className="mb-4">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
        Something went wrong
      </h2>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        {error.message || 'An unexpected error occurred'}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  </div>
);

export default ErrorPage;
