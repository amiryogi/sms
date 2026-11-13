// Captures the product screenshots shown on the public site (frontend/public/screenshots).
// Same servers, test database and global setup as the test suite, but its own folder, so
// `npm test` never runs it.
//
//   npm run screenshots      recapture every image, then review them before committing
const base = require("./playwright.config");

module.exports = {
  ...base,
  testDir: "./screenshots",
  outputDir: "./test-results/screenshots",
  reporter: [["list"]],
  retries: 0,
};
