import tseslint from 'typescript-eslint';
// @ts-ignore - no types available
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
// @ts-ignore - no types available
import jsxA11y from 'eslint-plugin-jsx-a11y';
// @ts-ignore - no types available
import tailwindcss from 'eslint-plugin-tailwindcss';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.config.ts',
      '*.config.js',
      '*.config.mjs',
      'public/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  react.configs.flat?.recommended ?? {},
  react.configs.flat?.['jsx-runtime'] ?? {},
  jsxA11y.flatConfigs?.recommended ?? {},
  ...tailwindcss.configs['flat/recommended'],
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'arrow-body-style': ['error', 'as-needed'],
      'react/prop-types': 'off',
      'tailwindcss/no-custom-classname': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
      tailwindcss: {
        config: false,
      },
    },
  },
];
