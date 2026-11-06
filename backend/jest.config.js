/**
 * Jest configuration for the backend.
 *
 * Scope: pure-unit tests only. These tests must run with NO MySQL server and
 * without starting Express, so nothing here may import `src/config/database.js`,
 * `src/app.js`, or any controller (controllers pull in Prisma transitively).
 *
 * TZ is pinned because `src/utils/dateConverter.js` builds its reference point
 * with `new Date(1944, 0, 1)` (local midnight) and therefore produces different
 * BS dates depending on the machine's timezone. Pinning to the school's own
 * timezone makes the suite deterministic on any developer machine or CI box.
 */
process.env.TZ = 'Asia/Kathmandu';

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.js'],
  clearMocks: true,
  restoreMocks: true,
  testPathIgnorePatterns: ['/node_modules/'],
  // Keep coverage opt-in (`npx jest --coverage`) so `npm test` stays fast.
  collectCoverageFrom: ['src/utils/**/*.js', '!src/utils/index.js'],
  verbose: false,
};
