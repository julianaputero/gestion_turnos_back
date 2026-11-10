const bcrypt = require('bcryptjs');
const prisma = require('./prisma');
const { USER_ROLES } = require('../constants/roles.constants');
const { PASSWORD_SALT_ROUNDS } = require('../constants/auth.constants');

/** Campos públicos de un usuario — nunca incluye el hash de la contraseña. */
const PUBLIC_USER_FIELDS = { id: true, nombre: true, email: true, role: true };

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function findByEmail(email) {
  return prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: PUBLIC_USER_FIELDS,
  });
}

/**
 * Devuelve el usuario público si email y contraseña coinciden; si no, null.
 */
async function verifyCredentials(email, password) {
  const record = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });

  if (!record || typeof password !== 'string') return null;
  if (!(await bcrypt.compare(password, record.passwordHash))) return null;

  const { id, nombre, role } = record;
  return { id, nombre, email: record.email, role };
}

async function createUser({ nombre, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

  return prisma.user.create({
    data: { nombre, email: normalizeEmail(email), passwordHash, role },
    select: PUBLIC_USER_FIELDS,
  });
}

/** Los registros públicos siempre crean un usuario con rol profesional. */
function addProfesional({ nombre, email, password }) {
  return createUser({ nombre, email, password, role: USER_ROLES.profesional });
}

module.exports = { findByEmail, verifyCredentials, createUser, addProfesional, normalizeEmail };
