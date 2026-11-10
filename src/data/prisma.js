const { PrismaClient } = require('@prisma/client');

/** Cliente único de Prisma compartido por toda la app. */
const prisma = new PrismaClient();

module.exports = prisma;
