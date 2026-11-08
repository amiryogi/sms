// The shared Prisma client for the configured provider (DATABASE_PROVIDER).
// Kept as the import path used across controllers, services and test mocks;
// the real setup lives in src/database/index.js.
module.exports = require("../database").prisma;
