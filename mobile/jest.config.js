/**
 * Unit and component tests (`npm test`). The live API contract tests have their
 * own config (jest.contract.config.js) and never run here.
 *
 * TZ is pinned to the school's timezone so date results are the same on any
 * machine (same reason as backend/jest.config.js).
 */
process.env.TZ = "Asia/Kathmandu";

module.exports = {
  preset: "jest-expo",
  roots: ["<rootDir>/tests", "<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/tests/contract/"],
  // jest-expo defaults (node_modules/jest-expo/jest-preset.js), plus ESM-only packages the app uses.
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|lucide-react-native|nativewind|react-native-css-interop))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
  setupFiles: ["<rootDir>/tests/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\.css$": "<rootDir>/tests/styleMock.js",
    // The "react-native" export condition picks an .mjs build Jest cannot load; use the CommonJS one.
    "^lucide-react-native$": "<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js",
  },
  clearMocks: true,
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts", "!src/app/**"],
};
