// Browser tests. They run against the MySQL TEST database only: Playwright
// starts its own API (through backend/scripts/with-test-db.js) and its own
// Vite server on ports that differ from the development ones.
//
//   npm test                 everything (visual baselines are Windows-only, see README)
//   npm run test:ci          everything except @visual (what CI runs)
//   npm run update-baselines regenerate the approved screenshots, after review
const path = require("node:path");
const { defineConfig, devices } = require("@playwright/test");

const API_PORT = Number(process.env.E2E_API_PORT || 5012);
const WEB_PORT = Number(process.env.E2E_WEB_PORT || 5184);
const API_URL = `http://localhost:${API_PORT}/api/v1`;
const BASE_URL = `http://localhost:${WEB_PORT}`;
const root = path.join(__dirname, "..");

process.env.E2E_API_URL = API_URL;
process.env.E2E_BASE_URL = BASE_URL;

module.exports = defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  globalSetup: require.resolve("./global-setup"),
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    // Tolerance for anti-aliasing; layout assertions catch real breaks.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" },
  },
  // One seeded database is shared, and some tests change exam state.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    timezoneId: "Asia/Kathmandu",
    locale: "en-US",
  },
  projects: [
    {
      name: "chromium",
      // PW_CHANNEL=chrome uses the installed Chrome instead of a downloaded Chromium.
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, channel: process.env.PW_CHANNEL || undefined },
    },
  ],
  webServer: [
    {
      command: "node scripts/with-test-db.js --provider mysql node src/server.js",
      cwd: path.join(root, "backend"),
      env: { PORT: String(API_PORT), FRONTEND_URL: BASE_URL },
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      cwd: path.join(root, "frontend"),
      env: { VITE_API_URL: API_URL, MSYS_NO_PATHCONV: "1" },
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 90_000,
    },
  ],
});
