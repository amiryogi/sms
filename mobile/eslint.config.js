// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "coverage/*", "**/*.generated.ts"],
  },
  {
    rules: {
      // Tokens, passwords and student data must never reach the device log.
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
]);
