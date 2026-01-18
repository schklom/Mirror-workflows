import { Routes, Route } from 'react-router-dom';
import { Home } from '@/components/Home';
import { PrivacyContent } from '@/components/PrivacyContent';
import { NotFound } from '@/components/NotFound';

const App = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/privacy" element={<PrivacyContent />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;
