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
              const theme = localStorage.getItem('theme') || 'system';
              const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
              document.documentElement.classList.remove('dark');
              if (isDark) {
                document.documentElement.classList.add('dark');
              }
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
