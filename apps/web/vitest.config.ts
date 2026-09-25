import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': import.meta.dirname
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/browser/**/*.spec.ts']
  }
});
