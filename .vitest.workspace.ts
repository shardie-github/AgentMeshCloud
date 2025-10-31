import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'unit',
      include: ['src/**/*.test.ts', 'packages/**/*.test.ts'],
      exclude: ['**/*.e2e.test.ts', '**/*.integration.test.ts'],
      environment: 'node',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        reportsDirectory: './coverage/unit',
        exclude: [
          'node_modules/',
          'dist/',
          '**/*.test.ts',
          '**/*.spec.ts',
          '**/*.config.ts',
          '**/types.ts',
        ],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
      },
    },
  },
  {
    test: {
      name: 'integration',
      include: ['**/*.integration.test.ts'],
      environment: 'node',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json'],
        reportsDirectory: './coverage/integration',
        thresholds: {
          lines: 70,
          functions: 70,
          branches: 65,
          statements: 70,
        },
      },
    },
  },
  {
    test: {
      name: 'e2e',
      include: ['**/*.e2e.test.ts', 'tests/**/*.test.ts'],
      environment: 'node',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json'],
        reportsDirectory: './coverage/e2e',
        thresholds: {
          lines: 60,
          functions: 60,
          branches: 55,
          statements: 60,
        },
      },
    },
  },
]);
