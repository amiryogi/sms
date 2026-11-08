/**
 * The database layer: validates DATABASE_PROVIDER, loads the matching
 * generated Prisma client and exposes one shared instance.
 *
 *   const { prisma, Prisma, dialect, provider } = require("../database");
 *
 * Most code keeps importing `src/config/database.js`, which re-exports
 * `prisma` from here. Nothing else may require `@prisma/client` directly
 * (a unit test enforces it): the `Prisma` namespace comes from here, and
 * `Decimal` from `@prisma/client/runtime/library` (see utils/money.js).
 */
const path = require("path");
require("dotenv").config();

const { resolveDatabaseConfig } = require("./config");
const { dialectFor } = require("./dialect");

const config = resolveDatabaseConfig(process.env);
for (const w of config.warnings) console.warn(`[database] ${w}`);

const CLIENTS_DIR = path.join(__dirname, "../../node_modules/.prisma-clients");

let generated;
try {
  generated = require(path.join(CLIENTS_DIR, config.engine));
} catch (error) {
  if (error.code !== "MODULE_NOT_FOUND") throw error;
  throw new Error(
    `The Prisma client for ${config.engine} is not generated. Run \`npm run db:generate\` (it also runs on npm install).`
  );
}

const { PrismaClient, Prisma } = generated;

const prisma = new PrismaClient({
  log: ["error"],
  datasources: { db: { url: config.url } },
});

let disconnected = false;
const disconnect = async () => {
  if (disconnected) return;
  disconnected = true;
  await prisma.$disconnect();
};

module.exports = {
  prisma,
  Prisma,
  provider: config.provider,
  engine: config.engine,
  label: config.label,
  dialect: dialectFor(config.engine),
  disconnect,
};
