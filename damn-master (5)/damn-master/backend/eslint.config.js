import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  // Global ignores (replaces .eslintignore)
  {
    ignores: [
      '**/*.log',
      '**/.DS_Store',
      '.vscode/settings.json',
      '.history',
      '.yarn',
      'dist',
      'lib',
      'node_modules',
      'temp',
      'tsc-out',
      'tsdoc-metadata.json',
      'target',
      'output',
      'build',
      '.cache',
      '.vscode',
      'tsconfig.tsbuildinfo',
      'vite.config.mts',
      'static',
      'src/gql/**/*'
    ]
  },

  // Base JavaScript recommended rules
  js.configs.recommended,
  
  // Configuration for TypeScript files
  {
    files: ['**/*.{ts,js}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2021,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
        // Additional globals
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Extend TypeScript recommended rules
      ...tsPlugin.configs.recommended.rules,
      
      // Custom rules for backend
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'prefer-spread': 'off',
      'no-case-declarations': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_'
      }],
      '@typescript-eslint/no-unused-expressions': ['error', { 
        'allowTaggedTemplates': true,
        'allowShortCircuit': true,
        'allowTernary': true 
      }],
    },
  },
];