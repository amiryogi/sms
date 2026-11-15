// Captures the mobile-app screenshots on the public site (frontend/public/screenshots/app),
// at an iPhone size and an Android size, from the app's web build on the seeded TEST database.
// The web build exists only for this; build it first (e2e/README.md, "Mobile app screenshots"):
//
//   npm run screenshots:mobile   then review every image before committing
const path = require("node:path");
const base = require("./playwright.config");

const API_PORT = Number(process.env.E2E_API_PORT || 5012);
const APP_PORT = Number(process.env.E2E_APP_PORT || 5186);
const APP_URL = `http://localhost:${APP_PORT}`;
const root = path.join(__dirname, "..");
process.env.E2E_APP_URL = APP_URL;

const [api] = base.webServer;

module.exports = {
  ...base,
  testDir: "./mobile-shots",
  outputDir: "./test-results/mobile-shots",
  reporter: [["list"]],
  retries: 0,
  use: { ...base.use, baseURL: APP_URL },
  webServer: [
    // The API must also accept the app's origin. Stop a running e2e API first, or it is reused without it.
    { ...api, env: { ...api.env, FRONTEND_URL: `${process.env.E2E_BASE_URL},${APP_URL}` } },
    {
      command: `node mobile-shots/serve.js "${path.join(root, "mobile", "dist-web")}" ${APP_PORT}`,
      cwd: __dirname,
      url: APP_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
};
