/**
 * Contract tests against a live backend (scripts/contract.js starts one on the
 * test database). Node environment, so axios makes real HTTP requests.
 */
process.env.TZ = "Asia/Kathmandu";
const base = require("./jest.config");

module.exports = {
  ...base,
  testEnvironment: "node",
  roots: ["<rootDir>/tests/contract"],
  testPathIgnorePatterns: ["/node_modules/"],
  setupFiles: ["<rootDir>/tests/contract/setup.ts"],
  testTimeout: 30_000,
};
