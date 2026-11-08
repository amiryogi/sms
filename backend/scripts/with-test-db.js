#!/usr/bin/env node
/**
 * Run a command against the test database instead of the development one.
 *
 *   node scripts/with-test-db.js npx prisma migrate deploy
 *   node scripts/with-test-db.js npx jest -c jest.integration.config.js
 *
 * Uses TEST_DATABASE_URL when set; otherwise the DATABASE_URL from .env with
 * the database name replaced by `sms_test`. Refuses to run if the result would
 * point at the development database itself.
 */
require("dotenv").config();
const { spawnSync } = require("node:child_process");

const devUrl = process.env.DATABASE_URL;
let testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  if (!devUrl) {
    console.error("Set TEST_DATABASE_URL or DATABASE_URL first.");
    process.exit(1);
  }
  const u = new URL(devUrl);
  u.pathname = "/sms_test";
  testUrl = u.toString();
}
if (devUrl && new URL(testUrl).pathname === new URL(devUrl).pathname && new URL(testUrl).host === new URL(devUrl).host) {
  console.error("TEST_DATABASE_URL points at the development database. Refusing to run.");
  process.exit(1);
}

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("Usage: node scripts/with-test-db.js <command> [args...]");
  process.exit(1);
}
const result = spawnSync(cmd, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, DATABASE_URL: testUrl, TEST_DATABASE_URL: testUrl, SMS_TEST_DB: "1" },
});
process.exit(result.status ?? 1);
