module.exports = {
  testEnvironment: 'node',

  // Base env & setup (safe – no DB)
  setupFiles: ['./tests/env.js'],
  setupFilesAfterEnv: ['./tests/setup.js'],

  // Match tests
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.test.js'],

  // CI-safe options
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  forceExit: true,
  testTimeout: 30000,

  // Coverage (disabled for CI speed & stability)
  collectCoverage: false,

  // 🚫 ABSOLUTELY NO DB BOOTSTRAP IN CI
  globalSetup: undefined,
  globalTeardown: undefined,
};
