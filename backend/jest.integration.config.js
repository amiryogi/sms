/**
 * Integration tests: real MySQL, real Prisma, no HTTP server.
 *
 * They write to the database, so they only run against the test database:
 *
 *   npm run test:integration
 *
 * which goes through scripts/with-test-db.js (DATABASE_URL -> sms_test, or
 * TEST_DATABASE_URL). That database needs the migrations and the demo seed:
 *
 *   node scripts/with-test-db.js npx prisma migrate deploy
 *   node scripts/with-test-db.js npm run seed
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
