import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

const NotFound = () => (
  <div className="dark:bg-fmd-dark-lighter flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <div className="w-full max-w-md text-center">
      <div className="mb-4">
        <FileQuestion className="text-fmd-green mx-auto h-12 w-12" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
        Page not found
      </h2>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="bg-fmd-green hover:bg-fmd-green/90 focus:ring-fmd-green inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm transition focus:ring-2 focus:ring-offset-2 focus:outline-none"
      >
        Go home
      </Link>
    </div>
  </div>
);

export default NotFound;
