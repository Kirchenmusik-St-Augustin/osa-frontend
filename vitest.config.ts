import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // jsdom is the default because most specs mount components. Specs that
      // never touch the DOM opt out with `// @vitest-environment node` on
      // their first line: creating a jsdom per file is the largest single cost
      // of a test run.
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/*'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      setupFiles: ['./vitest.setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        include: [
          'src/components/**',
          'src/views/**',
          'src/stores/**',
          'src/composables/**',
          'src/services/**',
          'src/runtimeConfig.ts',
        ],
        // Granular quality gates instead of a global threshold
        thresholds: {
          // Global baseline for all unmapped files. Set a few points under the
          // measured values (96 / 93 / 92 / 97) so a real drop fails the
          // pipeline instead of passing unnoticed.
          statements: 90,
          branches: 85,
          functions: 88,
          lines: 90,

          // Core logic (stores/composables): strict coverage required
          'src/stores/**': {
            statements: 90,
            branches: 90,
            functions: 90,
            lines: 90,
          },

          // UI Components: focus on functional behavior (props/emits)
          'src/components/**': {
            statements: 88,
            branches: 82,
            functions: 85,
            lines: 88,
          },

          // Views (orchestration): lower threshold to prevent brittle DOM tests
          'src/views/**': {
            statements: 85,
            branches: 80,
            functions: 80,
            lines: 85,
          },
        },
      },
    },
  }),
)
