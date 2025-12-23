module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/env.js'],
  setupFilesAfterEnv: ['./tests/setup.js'],

  collectCoverage: false,

  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.test.js'],

  verbose: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000,

  // 🚫 NEVER run DB bootstrap in CI
  globalSetup: undefined,
  globalTeardown: undefined,
};
