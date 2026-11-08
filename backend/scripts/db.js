#!/usr/bin/env node
/**
 * Provider-aware Prisma commands. Use these instead of calling `prisma` directly:
 * there are two schemas (prisma/mysql, prisma/postgresql) and the right one
 * depends on DATABASE_PROVIDER.
 *
 *   node scripts/db.js schemas          build both provider schemas from prisma/schema/models.prisma
 *   node scripts/db.js schemas:check    fail if they are stale
 *   node scripts/db.js generate         generate BOTH clients (no database needed)
 *   node scripts/db.js validate         prisma validate on both schemas
 *   node scripts/db.js migrate:deploy   apply committed migrations for the configured provider
 *   node scripts/db.js status           prisma migrate status for the configured provider
 *   node scripts/db.js studio           Prisma Studio on the configured database
 *
 * Prints the provider and host/database before touching a database. There is
 * deliberately no `db push` and no `migrate reset` here.
 */
require("dotenv").config();
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { resolveDatabaseConfig, DatabaseConfigError } = require("../src/database/config");

const ROOT = path.join(__dirname, "..");
const SCHEMAS = {
  mysql: "prisma/mysql/schema.prisma",
  postgresql: "prisma/postgresql/schema.prisma",
};
// Placeholders so commands that only read the schema (generate, validate) work
// without a configured database. Never used to connect.
const OFFLINE_ENV = {
  MYSQL_DATABASE_URL: "mysql://offline:offline@localhost:3306/offline",
  SUPABASE_DATABASE_URL: "postgresql://offline:offline@localhost:5432/offline",
  SUPABASE_DIRECT_URL: "postgresql://offline:offline@localhost:5432/offline",
};

const run = (args, env = process.env) => {
  const r = spawnSync("npx", ["prisma", ...args], { stdio: "inherit", cwd: ROOT, shell: process.platform === "win32", env });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const node = (script, args = []) => {
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args], { stdio: "inherit", cwd: ROOT });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

/** The configured provider, validated; exits with the reason if it isn't. */
const configured = ({ needDirect = false } = {}) => {
  let cfg;
  try {
    cfg = resolveDatabaseConfig(process.env);
  } catch (error) {
    if (error instanceof DatabaseConfigError) {
      console.error(`db: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
  if (needDirect && cfg.directVar && !cfg.directUrl) {
    console.error(`db: ${cfg.directVar} is required for migrations (Supabase: the direct connection, port 5432).`);
    process.exit(1);
  }
  console.log(`db: ${cfg.label}${process.env.SMS_TEST_DB === "1" ? " (test database)" : ""}`);
  return cfg;
};

const [command, ...rest] = process.argv.slice(2);
switch (command) {
  case "schemas":
    node("prisma/build-schemas.js");
    break;
  case "schemas:check":
    node("prisma/build-schemas.js", ["--check"]);
    break;
  case "generate":
    node("prisma/build-schemas.js", ["--check"]);
    for (const schema of Object.values(SCHEMAS)) run(["generate", "--schema", schema], { ...OFFLINE_ENV, ...process.env });
    break;
  case "validate":
    for (const schema of Object.values(SCHEMAS)) run(["validate", "--schema", schema], { ...process.env, ...OFFLINE_ENV });
    break;
  case "migrate:deploy": {
    const cfg = configured({ needDirect: true });
    run(["migrate", "deploy", "--schema", SCHEMAS[cfg.engine], ...rest]);
    break;
  }
  case "status": {
    const cfg = configured({ needDirect: true });
    run(["migrate", "status", "--schema", SCHEMAS[cfg.engine], ...rest]);
    break;
  }
  case "studio": {
    const cfg = configured();
    run(["studio", "--schema", SCHEMAS[cfg.engine], ...rest]);
    break;
  }
  default:
    console.error("usage: node scripts/db.js <schemas|schemas:check|generate|validate|migrate:deploy|status|studio>");
    process.exit(1);
}
