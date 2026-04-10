import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';

const backend = 'http://localhost:8080';

export default defineConfig({
  plugins: [
    react(),
    process.env.ANALYZE &&
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
        filename: 'dist/stats.html',
      }),
  ].filter(Boolean) as any,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // https://vite.dev/guide/build#relative-base
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // Proxying only works with "npm run dev", not "npm run start"!
  server: {
    proxy: {
      '/api': {
        target: backend,
        changeOrigin: true,
        secure: true,
      },
      '/version': {
        target: backend,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
