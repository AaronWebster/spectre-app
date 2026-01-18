const globals = require('globals');
const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['*.cjs', '*.js'],
    ignores: ['*.test.js', 'node_modules/', 'coverage/'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',
      globals: {
        ...globals.node,
        ...globals.es6,
        ...globals.jest,
        sys: 'writable',
        ident: 'readonly',
        colmap: 'writable',
        PI: 'readonly',
        CLOSE: 'readonly',
        cos: 'readonly',
        sin: 'readonly',
        radians: 'readonly',
        mag: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-eval': 'warn',
      'no-implied-eval': 'error',
      'no-undef': 'warn',
      'no-constant-condition': 'warn'
    }
  }
];
