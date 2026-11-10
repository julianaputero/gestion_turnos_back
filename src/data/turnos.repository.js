const prisma = require('./prisma');

const TURNO_FIELDS = {
  id: true,
  inicio: true,
  fin: true,
  notas: true,
  paciente: { select: { id: true, nombre: true, apellido: true } },
  profesional: { select: { id: true, nombre: true } },
};

/**
 * Turnos que empiezan dentro de [desde, hasta), opcionalmente de un solo
 * profesional, ordenados por hora de inicio.
 */
function listTurnos({ desde, hasta, profesionalId }) {
  return prisma.turno.findMany({
    where: {
      inicio: { gte: desde, lt: hasta },
      ...(profesionalId ? { profesionalId } : {}),
    },
    select: TURNO_FIELDS,
    orderBy: { inicio: 'asc' },
  });
}

function findTurnoById(id) {
  return prisma.turno.findUnique({
    where: { id },
    select: { ...TURNO_FIELDS, profesionalId: true },
  });
}

/**
 * Otro turno del mismo profesional que se superpone con [inicio, fin), o null.
 * `excludeId` evita que un turno choque consigo mismo al editarlo.
 */
function findOverlappingTurno({ profesionalId, inicio, fin, excludeId }) {
  return prisma.turno.findFirst({
    where: {
      profesionalId,
      id: { not: excludeId },
      inicio: { lt: fin },
      fin: { gt: inicio },
    },
    select: TURNO_FIELDS,
  });
}

function createTurno({ pacienteId, profesionalId, inicio, fin, notas }) {
  return prisma.turno.create({
    data: { pacienteId, profesionalId, inicio, fin, notas },
    select: TURNO_FIELDS,
  });
}

function updateHorario(id, { inicio, fin }) {
  return prisma.turno.update({ where: { id }, data: { inicio, fin }, select: TURNO_FIELDS });
}

function deleteTurno(id) {
  return prisma.turno.delete({ where: { id } });
}

module.exports = {
  listTurnos,
  findTurnoById,
  findOverlappingTurno,
  createTurno,
  updateHorario,
  deleteTurno,
};
