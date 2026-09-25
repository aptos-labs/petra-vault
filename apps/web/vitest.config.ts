import { defineConfig } from 'vitest/config';

export default defineConfig({
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
