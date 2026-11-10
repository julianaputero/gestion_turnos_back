const prisma = require('./prisma');
const { USER_ROLES } = require('../constants/roles.constants');

/** Lista de profesionales (id y nombre), ordenada alfabéticamente. */
function listProfesionales() {
  return prisma.user.findMany({
    where: { role: USER_ROLES.profesional },
    select: { id: true, nombre: true },
    orderBy: { nombre: 'asc' },
  });
}

function findProfesionalById(id) {
  return prisma.user.findFirst({
    where: { id, role: USER_ROLES.profesional },
    select: { id: true, nombre: true },
  });
}

module.exports = { listProfesionales, findProfesionalById };
