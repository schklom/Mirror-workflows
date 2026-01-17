import { FileQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="flex min-h-screen max-w-screen items-center justify-center text-center">
    <div>
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
        to="/"
        className="rounded-lg bg-green-600 px-6 py-3 text-white transition-colors hover:bg-green-700"
      >
        To home page
      </Link>
    </div>
  </div>
);

export default NotFound;
