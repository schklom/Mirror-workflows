import type { Metadata } from 'next';
import { Toaster } from 'sonner';
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
      {children}
      <Toaster position="top-right" />
    </body>
  </html>
);

export default RootLayout;
