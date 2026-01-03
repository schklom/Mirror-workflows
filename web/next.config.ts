import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
  ...(process.env.NODE_ENV !== 'production' && {
    rewrites: async () => [
      {
        source: '/api/v1/:path*',
        destination:
          process.env.NEXT_PUBLIC_API_URL ||
          'http://localhost:8080/api/v1/:path*',
      },
    ],
  }),
};

export default withBundleAnalyzer(nextConfig);
