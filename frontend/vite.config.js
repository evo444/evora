import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // ── Production build optimizations ────────────────────────────────
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-maps':   ['leaflet', 'react-leaflet'],
          'vendor-io':     ['socket.io-client', 'axios'],
        },
      },
    },
    minify: 'esbuild',
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
