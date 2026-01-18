import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';

// Lazy load the page behind each route.
// These must be declared as "export default"!
const Home = lazy(() => import('@/components/Home'));
const PrivacyContent = lazy(() => import('@/components/PrivacyContent'));
const NotFound = lazy(() => import('@/components/NotFound'));

const App = () => (
  <Suspense
    fallback={
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    }
  >
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/privacy" element={<PrivacyContent />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

export default App;
