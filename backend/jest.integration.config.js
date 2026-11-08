/**
 * Integration tests: a real database of either provider, real Prisma, and the
 * Express app over supertest (no server is started).
 *
 * They write to the database, so they only run against a test database:
 *
 *   npm run test:integration:mysql   (alias: npm run test:integration)
 *   npm run test:integration:pg
 *
 * which go through scripts/with-test-db.js --provider mysql|pg. That database
 * needs the migrations and the demo seed:
 *
 *   node scripts/with-test-db.js [--provider pg] npm run db:migrate:deploy
 *   node scripts/with-test-db.js [--provider pg] npm run seed
 */
process.env.TZ = "Asia/Kathmandu";

if (process.env.SMS_TEST_DB !== "1") {
  throw new Error("Run integration tests with `npm run test:integration` (it points them at the test database).");
}

module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__integration__/**/*.test.js"],
  testTimeout: 60000,
  maxWorkers: 1,
};
