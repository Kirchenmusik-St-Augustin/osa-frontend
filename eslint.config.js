import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '*.config.*', 'public/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2022,
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // --- VUE PRAGMATISM ---
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'error',

      // --- DEAD CODE & UNREACHABLE ---
      'no-unreachable': 'error', // Prevents code after return, throw, etc.
      'no-constant-condition': 'error', // Prevents always-true/false conditions
      'vue/no-unused-components': 'error', // Finds registered but unused components
      'vue/no-unused-refs': 'error', // Finds template refs that are never used in script

      // --- SECURITY & ARCHITECTURE ---
      // Prevent XSS via v-html
      'vue/no-v-html': 'error',

      // A data value bound to href/src can be a javascript: or data: URL.
      // Allowed: a literal, a mailto:/tel: template (the scheme is fixed), a
      // call of safeHref() or a value named ...Href that was computed with it.
      'vue/no-restricted-syntax': [
        'error',
        {
          selector:
            "VAttribute[directive=true][key.name.name='bind'][key.argument.name=/^(href|src)$/] > VExpressionContainer[expression.type!='Literal']" +
            ":not([expression.type='TemplateLiteral'][expression.quasis.0.value.cooked=/^(mailto|tel):/])" +
            ":not([expression.type='MemberExpression'][expression.property.name=/Href$/])" +
            ":not([expression.type='CallExpression'][expression.callee.name='safeHref'])",
          message:
            'Bind href/src through safeHref() (src/services/safeUrl.ts) so a data value cannot be a javascript: URL.',
        },
      ],

      // Enforce script-setup & Composition API
      'vue/component-api-style': ['error', ['script-setup', 'composition']],

      // Enforce type-based props (defineProps<{ ... }>())
      'vue/define-props-declaration': ['error', 'type-based'],

      // Enforce type-based emits
      'vue/define-emits-declaration': ['error', 'type-based'],

      // Forbid <script> without lang="ts"
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],

      // Uniform ordering of Vue blocks
      'vue/block-order': [
        'error',
        {
          order: ['script[setup]', 'template', 'style'],
        },
      ],

      // --- CLEAN CODE (Boss Mode) ---
      // Frontend equivalent of the backend TCH rule (optimizes bundle, prevents circular dependencies)
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

      // McCabe equivalent for the frontend (identical to backend limits)
      complexity: ['error', 8],

      // Best Practices
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': 'warn',

      // Strict Typing
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Test runner files run in Node.
    files: ['vitest.setup.ts', 'vite.env-check*.ts', '**/*.spec.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Test mocks frequently need loose object shapes.
    files: ['**/__tests__/**/*.{ts,vue}', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettierConfig,
)
