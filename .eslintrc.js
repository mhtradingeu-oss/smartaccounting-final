// .eslintrc.js
module.exports = {
  root: true,

  // -------------------------------
  // Global environments (Backend)
  // -------------------------------
  env: {
    node: true,
    es2021: true,
    jest: true,
  },

  // -------------------------------
  // Base config
  // -------------------------------
  extends: [
    'eslint:recommended',
    'prettier',
  ],

  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },

  // -------------------------------
  // Global rules (Backend-safe)
  // -------------------------------
  rules: {
    // Logs & debugging
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',

    // Code quality
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',

    'prefer-const': 'warn',
    'no-var': 'error',
    'object-shorthand': 'warn',
    'prefer-arrow-callback': 'warn',

    // Style & correctness
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],

    // Security (important)
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
  },

  // -------------------------------
  // React / Frontend Overrides
  // -------------------------------
  overrides: [
    {
      files: ['client/**/*.{js,jsx,ts,tsx}'],
      env: {
        browser: true,
        es2021: true,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      plugins: ['react', 'react-hooks'],
      extends: [
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
      ],
      settings: {
        react: {
          version: 'detect',
        },
      },
      rules: {
        // Browser globals
        'no-undef': 'off',

        // React friendliness
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-console': 'off',

        // JSX / React 17+
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',

        // Hooks safety
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
      },
    },

    // -------------------------------
    // Test files
    // -------------------------------
    {
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
        node: true,
      },
      rules: {
        'no-unused-vars': 'off',
        'no-console': 'off',
      },
    },
  ],

  // -------------------------------
  // Ignore heavy / generated folders
  // -------------------------------
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    'client/dist/',
    'uploads/',
    'temp/',
    
    '*.min.js',
  ],
};
