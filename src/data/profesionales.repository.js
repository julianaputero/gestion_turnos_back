const { randomBytes } = require('node:crypto');
const prisma = require('./prisma');
const { USER_ROLES } = require('../constants/roles.constants');
const { LINK_TOKEN_BYTES } = require('../constants/profesionales.constants');

/** Token nuevo para el link de solo lectura de un profesional. */
function generateLinkToken() {
  return randomBytes(LINK_TOKEN_BYTES).toString('hex');
}

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

const FICHA_FIELDS = {
  especialidad: true,
  matricula: true,
  activo: true,
  honorarioBase: true,
  telefono: true,
  modalidades: true,
  diasAtencion: true,
  recordatorioHorasAntes: true,
  tonoComunicacion: true,
  linkToken: true,
};

/** Une los datos del usuario con su ficha en un solo objeto plano para la API. */
function toFicha({ id, nombre, email, profesional }) {
  return {
    id,
    nombre,
    email,
    especialidad: profesional.especialidad,
    matricula: profesional.matricula,
    activo: profesional.activo,
    honorarioBase: profesional.honorarioBase === null ? null : Number(profesional.honorarioBase),
    telefono: profesional.telefono,
    modalidades: profesional.modalidades,
    diasAtencion: profesional.diasAtencion,
    recordatorioHorasAntes: profesional.recordatorioHorasAntes,
    tono: profesional.tonoComunicacion,
    linkToken: profesional.linkToken,
  };
}

const FICHA_USER_SELECT = {
  id: true,
  nombre: true,
  email: true,
  profesional: { select: FICHA_FIELDS },
};

/**
 * Fichas de todos los profesionales, ordenadas por nombre. El `id` es el del
 * usuario (el mismo que usan los turnos).
 */
async function listFichas() {
  const users = await prisma.user.findMany({
    where: { role: USER_ROLES.profesional, profesional: { isNot: null } },
    select: FICHA_USER_SELECT,
    orderBy: { nombre: 'asc' },
  });
  return users.map(toFicha);
}

/**
 * Actualiza la ficha del profesional (`userId`) con los campos dados.
 * Devuelve la ficha actualizada, o null si ese usuario no tiene ficha.
 */
async function updateFicha(userId, cambios) {
  const existe = await prisma.profesional.findUnique({ where: { userId }, select: { id: true } });
  if (!existe) return null;

  const { tono, ...resto } = cambios;
  await prisma.profesional.update({
    where: { userId },
    data: { ...resto, ...(tono !== undefined ? { tonoComunicacion: tono } : {}) },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: FICHA_USER_SELECT });
  return toFicha(user);
}

module.exports = {
  listProfesionales,
  findProfesionalById,
  listFichas,
  updateFicha,
  generateLinkToken,
};
