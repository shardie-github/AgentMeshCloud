import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.d.ts',
        '**/types.ts',
        'tests/',
        'scripts/',
        '**/*.config.*',
        '**/mocks/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.turbo',
      '.next',
      'coverage',
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/registry': path.resolve(__dirname, './src/registry'),
      '@/telemetry': path.resolve(__dirname, './src/telemetry'),
      '@/policy': path.resolve(__dirname, './src/policy'),
      '@/context-bus': path.resolve(__dirname, './src/context-bus'),
      '@/uadsi': path.resolve(__dirname, './src/uadsi'),
      '@/diagnostics': path.resolve(__dirname, './src/diagnostics'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/adapters': path.resolve(__dirname, './src/adapters'),
      '@/security': path.resolve(__dirname, './src/security'),
      '@/common': path.resolve(__dirname, './src/common'),
    },
  },
});
