
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/env.js'],
  setupFilesAfterEnv: ['./tests/setup.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/**',
    '!src/templates/**',
    '!**/node_modules/**',
    '!**/coverage/**',
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.test.js',
  ],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000,
  globalSetup: './tests/globalSetup.js',
  globalTeardown: './tests/globalTeardown.js',
};
