#!/usr/bin/env node
/**
 * Run a command against a TEST database instead of the configured one.
 *
 *   node scripts/with-test-db.js [--provider mysql|pg] <command> [args...]
 *   node scripts/with-test-db.js npm run db:migrate:deploy
 *   node scripts/with-test-db.js --provider pg npm run seed
 *
 * mysql (default): MYSQL_TEST_DATABASE_URL, or MYSQL_DATABASE_URL with the
 *                  database name replaced by `sms_test`.
 * pg:              SUPABASE_TEST_DATABASE_URL (pooler) and
 *                  SUPABASE_TEST_DIRECT_URL (migrations) — a Supabase project
 *                  used for tests only.
 *
 * The command gets DATABASE_PROVIDER and that provider's URL variables set to
 * the test database, plus SMS_TEST_DB=1. Refuses to run if a test URL points at
 * the same host and database as a configured app URL.
 */
require("dotenv").config();
const { spawnSync } = require("node:child_process");

const fail = (msg) => {
  console.error(`with-test-db: ${msg}`);
  process.exit(1);
};

const argv = process.argv.slice(2);
let provider = "mysql";
if (argv[0] === "--provider") {
  provider = argv[1];
  argv.splice(0, 2);
}
if (!["mysql", "pg"].includes(provider)) fail(`--provider must be mysql or pg (got "${provider}")`);
const [cmd, ...args] = argv;
if (!cmd) fail("usage: node scripts/with-test-db.js [--provider mysql|pg] <command> [args...]");

const sameDb = (a, b) => {
  if (!a || !b) return false;
  try {
    const x = new URL(a);
    const y = new URL(b);
    return x.hostname === y.hostname && (x.port || "") === (y.port || "") && x.pathname === y.pathname && x.username === y.username;
  } catch {
    return false;
  }
};
const appUrls = [process.env.MYSQL_DATABASE_URL, process.env.SUPABASE_DATABASE_URL, process.env.SUPABASE_DIRECT_URL].filter(Boolean);
const guard = (name, url) => {
  if (appUrls.some((u) => sameDb(u, url))) fail(`${name} points at a database the app is configured to use. Refusing to run.`);
};

const env = { ...process.env, SMS_TEST_DB: "1" };
delete env.MYSQL_DATABASE_URL;
delete env.SUPABASE_DATABASE_URL;
delete env.SUPABASE_DIRECT_URL;

if (provider === "mysql") {
  let url = process.env.MYSQL_TEST_DATABASE_URL;
  if (!url) {
    if (!process.env.MYSQL_DATABASE_URL) fail("set MYSQL_TEST_DATABASE_URL or MYSQL_DATABASE_URL first.");
    const u = new URL(process.env.MYSQL_DATABASE_URL);
    u.pathname = "/sms_test";
    url = u.toString();
  }
  guard("The MySQL test URL", url);
  Object.assign(env, { DATABASE_PROVIDER: "mysql", MYSQL_DATABASE_URL: url });
} else {
  const url = process.env.SUPABASE_TEST_DATABASE_URL;
  const direct = process.env.SUPABASE_TEST_DIRECT_URL;
  if (!url || !direct) fail("set SUPABASE_TEST_DATABASE_URL and SUPABASE_TEST_DIRECT_URL (a Supabase project used only for tests).");
  guard("SUPABASE_TEST_DATABASE_URL", url);
  guard("SUPABASE_TEST_DIRECT_URL", direct);
  Object.assign(env, { DATABASE_PROVIDER: "supabase", SUPABASE_DATABASE_URL: url, SUPABASE_DIRECT_URL: direct });
}

const result = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32", env });
process.exit(result.status ?? 1);
