import { defineConfig } from 'vitest/config';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('./scripts/test-environment.cjs').configureTestEnvironment();

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts'],
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      thresholds: { lines: 85, branches: 75 },
    },
  },
});
