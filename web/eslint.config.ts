import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
// @ts-expect-error - Beta version has no types
import tailwindcss from 'eslint-plugin-tailwindcss';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.recommendedTypeChecked,
  sonarjs.configs.recommended,
  ...tailwindcss.configs['flat/recommended'],
  {
    settings: {
      tailwindcss: {
        config: false, // Disable config file requirement for Tailwind v4
        whitelist: [
          'bg-fmd-.*',
          'text-fmd-.*',
          'border-fmd-.*',
          'ring-fmd-.*',
          'hover:bg-fmd-.*',
          'hover:text-fmd-.*',
          'active:bg-fmd-.*',
          'focus:border-fmd-.*',
          'focus:ring-fmd-.*',
          'dark:bg-fmd-.*',
          'dark:text-fmd-.*',
          'dark:hover:bg-fmd-.*',
          'dark:hover:text-fmd-.*',
        ],
      },
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: ['**/*.mjs', '**/*.config.*'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    rules: {
      // No console statements allowed
      'no-console': 'error',
      // Enforce arrow functions for components
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      // Prefer arrow functions in general
      'prefer-arrow-callback': ['error', { allowNamedFunctions: false }],
      // Enforce consistent arrow function style
      'arrow-body-style': ['warn', 'as-needed'],
      // Allow anonymous default exports for Next.js conventions
      'import/no-anonymous-default-export': 'off',
      // Allow <img> for base64/blob images that can't use next/image
      '@next/next/no-img-element': 'warn',
      // Disallow inline SVG elements - use icon components instead (lucide-react or custom components)
      'react/forbid-elements': [
        'error',
        {
          forbid: [
            {
              element: 'svg',
              message:
                'Inline SVG elements are not allowed. Use lucide-react icons or create a component in app/components/icons/',
            },
          ],
        },
      ],
      // Ban .then/.catch - use async/await instead
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name="then"]',
          message: 'Use async/await instead of .then()',
        },
        {
          selector: 'CallExpression[callee.property.name="catch"]',
          message: 'Use try/catch with async/await instead of .catch()',
        },
        {
          selector: 'CallExpression[callee.property.name="finally"]',
          message:
            'Use try/catch/finally with async/await instead of .finally()',
        },
      ],
    },
  },
  {
    // Allow SVG elements only in icon components
    files: ['**/components/icons/**/*.tsx', '**/components/icons/**/*.ts'],
    rules: {
      'react/forbid-elements': 'off',
    },
  },
  {
    // shadcn/ui components use different conventions
    files: ['**/components/ui/**/*.tsx', '**/components/ui/**/*.ts'],
    rules: {
      'tailwindcss/no-custom-classname': 'off', // Uses CSS variables like bg-primary
      'react/function-component-definition': 'off', // Uses function declarations
      'sonarjs/prefer-read-only-props': 'off', // Props aren't marked readonly
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'dist/**']),
]);

export default eslintConfig;
