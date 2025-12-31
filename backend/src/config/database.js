const { PrismaClient } = require('@prisma/client');

// Create a single instance of Prisma Client
const prisma = new PrismaClient({
  log: ['error'],
});

module.exports = prisma;
