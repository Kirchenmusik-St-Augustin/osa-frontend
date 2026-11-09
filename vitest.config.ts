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
        // Granular quality gates instead of a global threshold. Every value
        // sits one to three points under the measured one, so a real drop
        // fails the pipeline while normal refactoring does not.
        thresholds: {
          // Global baseline for all files, measured 97.5 / 95.2 / 95.6 / 98.6
          // (statements / branches / functions / lines).
          statements: 96,
          branches: 93,
          functions: 93,
          lines: 97,

          // Stores hold the shared state, measured 100 on every metric.
          'src/stores/**': {
            statements: 98,
            branches: 98,
            functions: 98,
            lines: 98,
          },

          // Composables (data access), measured 99.6 / 100 / 99.2 / 99.6.
          'src/composables/**': {
            statements: 98,
            branches: 98,
            functions: 97,
            lines: 98,
          },

          // Services (HTTP client, formatting, helpers), measured 99.2 / 96.8 /
          // 97.1 / 100.
          'src/services/**': {
            statements: 98,
            branches: 94,
            functions: 95,
            lines: 98,
          },

          // UI components: focus on functional behavior (props/emits),
          // measured 98.1 / 94.5 / 97.8 / 99.0.
          'src/components/**': {
            statements: 96,
            branches: 92,
            functions: 95,
            lines: 97,
          },

          // Views (orchestration), measured 96.8 / 95.3 / 92.9 / 98.2.
          'src/views/**': {
            statements: 94,
            branches: 93,
            functions: 90,
            lines: 96,
          },
        },
      },
    },
  }),
)
