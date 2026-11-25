/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vite + Vitest configuration for Branchlight (first milestone).
// Browser-first build; the domain layer is framework-agnostic and can later
// be wrapped by an Electron preload/IPC shell without changes.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    clearMocks: true,
  },
});
