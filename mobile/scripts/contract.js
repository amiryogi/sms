#!/usr/bin/env node
/**
 * Contract tests: the app's own service modules against a REAL backend on the
 * MySQL test database (never the database the app is configured to use).
 *
 *   npm run test:contract              start the backend on port 5013, test, stop it
 *   CONTRACT_API_URL=http://localhost:5013/api/v1 npm run test:contract
 *                                      use a backend that is already running
 *
 * Needs the backend's test database set up once (see docs/TESTING.md):
 *   cd backend && node scripts/with-test-db.js npm run db:migrate:deploy
 *   cd backend && node scripts/with-test-db.js npm run seed
 */
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const PORT = Number(process.env.CONTRACT_PORT || 5013);
const external = process.env.CONTRACT_API_URL;
const API_URL = external || `http://localhost:${PORT}/api/v1`;
const backendDir = path.resolve(__dirname, "../../backend");

const waitForHealth = async (origin, timeoutMs = 60_000) => {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const res = await fetch(`${origin}/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Backend did not answer ${origin}/health within ${timeoutMs / 1000}s`);
};

const run = (cmd, args, opts) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...opts });
    child.on("exit", (code) => resolve(code ?? 1));
  });

(async () => {
  let backend = null;
  if (!external) {
    backend = spawn("node", ["scripts/with-test-db.js", "--provider", "mysql", "node", "src/server.js"], {
      cwd: backendDir,
      env: { ...process.env, PORT: String(PORT), NODE_ENV: "test" },
      // The backend logs the refusals the tests provoke; set CONTRACT_BACKEND_LOGS=1 to see them.
      stdio: ["ignore", "ignore", process.env.CONTRACT_BACKEND_LOGS ? "inherit" : "ignore"],
    });
  }
  let code = 1;
  try {
    await waitForHealth(API_URL.replace(/\/api\/v1$/, ""));
    code = await run("npx", ["jest", "--config", "jest.contract.config.js", "--runInBand", ...process.argv.slice(2)], {
      env: { ...process.env, CONTRACT_API_URL: API_URL },
    });
  } catch (e) {
    console.error(e.message);
  } finally {
    if (backend) {
      // Synchronous, so the backend (and the child with-test-db.js starts) is gone before we exit.
      if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(backend.pid), "/T", "/F"], { stdio: "ignore" });
      else backend.kill("SIGTERM");
    }
  }
  process.exit(code);
})();
