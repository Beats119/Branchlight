/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { contentSecurityPolicy } from './desktop/security.ts';

// Vite + Vitest configuration for Branchlight (first milestone).
// Browser-first build; the domain layer is framework-agnostic and can later
// be wrapped by an Electron preload/IPC shell without changes.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'local-only-production-policy',
      apply: 'build',
      transformIndexHtml() {
        return [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy },
            injectTo: 'head',
          },
        ];
      },
    },
  ],
  server: { host: '0.0.0.0', allowedHosts: ['.e2b.app'], port: 5173, strictPort: true },
  preview: { host: '0.0.0.0', allowedHosts: ['.e2b.app'], port: 4173, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'desktop/**/*.test.ts'],
    clearMocks: true,
  },
});
