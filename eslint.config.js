import js from '@eslint/js';

export default [
  js.configs.recommended,

  {
    files: ['js/**/*.js', 'plugins/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        // Browser
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        XMLHttpRequest: 'readonly',
        FormData: 'readonly',
        URLSearchParams: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        location: 'readonly',
        history: 'readonly',
        navigator: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        Element: 'readonly',
        IntersectionObserver: 'readonly',
        MutationObserver: 'readonly',

        // Dojo
        dojo: 'readonly',
        dijit: 'readonly'
      }
    },

    rules: {
      'no-undef': 'warn',
      'no-unused-vars': 'warn',
      'no-console': 'off',

      'prefer-const': 'error',
      'no-var': 'warn',

      'eqeqeq': ['error', 'always'],
      'no-caller': 'error',
      'no-proto': 'error',

      'linebreak-style': ['error', 'unix'],
      'eol-last': 'error',
      'no-trailing-spaces': 'error',
      'no-multiple-empty-lines': ['error', { 'max': 2 }],

      'keyword-spacing': ['error', { 'after': true, 'before': true }],
      'block-spacing': ['error', 'always'],
      'computed-property-spacing': ['error', 'never'],

      'no-empty': ['error', { 'allowEmptyCatch': true }],

      'max-statements-per-line': ['warn', { 'max': 2 }]
    }
  }
];
