const isCiMode = Boolean(process.env.CI) || process.argv.includes("--ci");
const shouldInitializeDatabase = !isCiMode;
const globalSetupFile = shouldInitializeDatabase ? "./tests/globalSetup.js" : undefined;
const globalTeardownFile = shouldInitializeDatabase ? "./tests/globalTeardown.js" : undefined;

module.exports = {
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  testEnvironment: "node",

  setupFiles: ["./tests/env.js"],
  setupFilesAfterEnv: ["./tests/setup.js"],

  testMatch: ["**/tests/**/*.test.js", "**/__tests__/**/*.test.js"],
  testPathIgnorePatterns: ["<rootDir>/client/"],

  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  forceExit: true,
  testTimeout: 30000,

  collectCoverage: false,

  globalSetup: globalSetupFile,
  globalTeardown: globalTeardownFile,
  maxWorkers: 1,
};
