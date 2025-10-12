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
        localStorage: 'readonly',
        location: 'readonly',
        history: 'readonly',

        // tt-rss
        App: 'writable',
        Article: 'writable',
        CommonDialogs: 'writable',
        CommonFilters: 'writable',
        Feeds: 'writable',
        FeedStoreModel: 'writable',
        FeedTree: 'writable',
        Headlines: 'writable',
        PluginHost: 'writable',
        PrefFeedStore: 'writable',
        PrefFeedTree: 'writable',
        PrefFilterStore: 'writable',
        PrefFilterTree: 'writable',
        PrefHelpers: 'writable',
        PrefLabelTree: 'writable',
        PrefUsers: 'writable',
        SingleUseDialog: 'writable',
        Toolbar: 'writable',

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
