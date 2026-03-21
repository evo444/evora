import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // ── Production build optimizations ────────────────────────────────
  build: {
    // Target modern browsers (drops unnecessary polyfills)
    target: 'es2020',

    // Warn if any single chunk exceeds 600 kB
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // Manual chunk splitting — separates heavy libs from app code.
        // Allows browsers to cache vendor code independently.
        manualChunks: {
          // React runtime — very stable, cached long-term
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Animation lib — large, changes infrequently
          'vendor-motion': ['framer-motion'],
          // Map libs — very large, rarely change
          'vendor-maps': ['leaflet', 'react-leaflet'],
          // Real-time / API
          'vendor-io': ['socket.io-client', 'axios'],
        },
      },
    },

    // Minify with esbuild (fast, default in Vite 5)
    minify: 'esbuild',

    // Generate separate source maps in production for error tracking
    // Set to false to reduce bundle size if you don't use Sentry/etc.
    sourcemap: false,
  },

  // ── Dev server proxy — avoids CORS during local development ────────
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  // ── Preview server (for `vite preview`) ────────────────────────────
  preview: {
    port: 4173,
    host: true,
  },
}));
