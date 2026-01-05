import type { Metadata } from 'next';
import { ClientLayout } from '@/components/ClientLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'FMD Server',
  description: 'Locate and control your devices from a web interface.',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <head>
      {/* Inline theme script to prevent FOUC. Must run before body renders.
          Using inline script since CSP already requires 'unsafe-inline' for Next.js. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                const stored = localStorage.getItem('fmd-storage');
                const theme = stored ? JSON.parse(stored).state.theme : 'system';
                const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                }
              } catch {}
            })();
          `,
        }}
      />
    </head>
    <body>
      <ClientLayout>{children}</ClientLayout>
    </body>
  </html>
);

export default RootLayout;
