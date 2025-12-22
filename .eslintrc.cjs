/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,

  env: {
    node: true,
    browser: true,
    es2022: true,
  },

  parser: "@typescript-eslint/parser",

  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },

  plugins: ["@typescript-eslint", "prettier"],

  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],

  rules: {
    "prettier/prettier": "error",

    // Allow console.warn/info in dev, forbid in production
    "no-console":
      process.env.NODE_ENV === "production" ? ["error", { allow: ["warn", "error"] }] : "off",
    // Ignore unused variables prefixed with _
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
  },
};
