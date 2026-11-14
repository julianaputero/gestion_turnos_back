const prisma = require("./prisma");
const { PACIENTE_ESTADOS } = require("../constants/pacientes.constants");

const PACIENTE_RESUMEN_FIELDS = { id: true, nombre: true, apellido: true };

/** Campos del paciente completo. Es función porque cuenta los turnos futuros respecto de "ahora". */
const pacienteFields = () => ({
  ...PACIENTE_RESUMEN_FIELDS,
  dni: true,
  telefono: true,
  email: true,
  cobertura: true,
  notasAdministrativas: true,
  activo: true,
  turnos: { where: { inicio: { gte: new Date() } }, select: { id: true } },
  _count: { select: { turnos: true } },
  mensajes: { orderBy: { enviadoAt: 'desc' }, take: 1, select: { tipo: true, enviadoAt: true } },
  profesionales: {
    select: { profesional: { select: { id: true, nombre: true } } },
    orderBy: { profesional: { nombre: "asc" } },
  },
});

/** Aplana las asignaciones (`profesionales: [{ id, nombre }]`) y los conteos de turnos. */
function toPaciente({ profesionales, _count, turnos, mensajes, ...paciente }) {
  return {
    ...paciente,
    ultimoMensaje: mensajes[0] ?? null,
    cantidadTurnos: _count.turnos,
    turnosFuturos: turnos.length,
    profesionales: profesionales.map(({ profesional }) => profesional),
  };
}

/** Condición de Prisma para el filtro de estado (`todos` = sin filtro). */
function estadoWhere(estado) {
  if (estado === PACIENTE_ESTADOS.activos) return { activo: true };
  if (estado === PACIENTE_ESTADOS.inactivos) return { activo: false };
  return {};
}

/** Minúsculas y sin acentos, para comparar "perez" con "Pérez". */
function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Cada palabra buscada tiene que aparecer en el nombre, el apellido o el DNI (sin importar acentos). */
function matches(paciente, terms) {
  const texto = normalize(`${paciente.nombre} ${paciente.apellido}`);
  return terms.every((term) => {
    const digits = term.replace(/\D/g, "");
    return (
      texto.includes(term) ||
      (digits.length > 0 && (paciente.dni ?? "").includes(digits))
    );
  });
}

/**
 * Pacientes ordenados por apellido y nombre, con búsqueda opcional (`q`, por
 * nombre/apellido/DNI, sin importar acentos), filtro opcional por profesional asignado
 * y filtro por estado (`PACIENTE_ESTADOS`; sin indicar = todos).
 */
async function listPacientes({ q, profesionalId, estado } = {}) {
  const pacientes = await prisma.paciente.findMany({
    where: {
      ...estadoWhere(estado),
      ...(profesionalId ? { profesionales: { some: { profesionalId } } } : {}),
    },
    select: pacienteFields(),
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });

  const terms = normalize(q).split(/\s+/).filter(Boolean);
  const encontrados = terms.length
    ? pacientes.filter((paciente) => matches(paciente, terms))
    : pacientes;
  return encontrados.map(toPaciente);
}

function findPacienteById(id) {
  return prisma.paciente.findUnique({
    where: { id },
    select: { ...PACIENTE_RESUMEN_FIELDS, activo: true },
  });
}

/** ¿El profesional está asignado al paciente? */
async function isProfesionalAsignado(pacienteId, profesionalId) {
  const asignacion = await prisma.pacienteProfesional.findUnique({
    where: { pacienteId_profesionalId: { pacienteId, profesionalId } },
    select: { pacienteId: true },
  });
  return asignacion !== null;
}

function findPacienteByDni(dni) {
  return prisma.paciente.findUnique({
    where: { dni },
    select: PACIENTE_RESUMEN_FIELDS,
  });
}

/** Crea el paciente con sus profesionales asignados (`profesionalIds`, al menos uno). */
async function createPaciente({ profesionalIds, ...data }) {
  const paciente = await prisma.paciente.create({
    data: {
      ...data,
      profesionales: {
        create: profesionalIds.map((profesionalId) => ({ profesionalId })),
      },
    },
    select: pacienteFields(),
  });
  return toPaciente(paciente);
}

/**
 * Actualiza los datos del paciente y reemplaza sus profesionales asignados. Si se le quita
 * un profesional, se cancelan (borran) los turnos futuros del paciente con ese profesional.
 * Devuelve `{ paciente, turnosCancelados }`, o null si no existe.
 *
 * Orden importante: primero se agregan las asignaciones nuevas y recién después se
 * quitan las que sobran. Si se quitaran primero, el paciente quedaría un instante sin
 * profesionales y el trigger `paciente_profesionales_borrar_huerfanos` lo borraría.
 */
async function updatePaciente(id, { profesionalIds, ...data }) {
  if (!(await findPacienteById(id))) return null;

  const turnosCancelados = await prisma.$transaction(async (tx) => {
    await tx.paciente.update({ where: { id }, data });
    await tx.pacienteProfesional.createMany({
      data: profesionalIds.map((profesionalId) => ({
        pacienteId: id,
        profesionalId,
      })),
      skipDuplicates: true,
    });
    await tx.pacienteProfesional.deleteMany({
      where: { pacienteId: id, profesionalId: { notIn: profesionalIds } },
    });
    const { count } = await tx.turno.deleteMany({
      where: {
        pacienteId: id,
        profesionalId: { notIn: profesionalIds },
        inicio: { gte: new Date() },
      },
    });
    return count;
  });

  const paciente = await prisma.paciente.findUnique({
    where: { id },
    select: pacienteFields(),
  });
  return { paciente: toPaciente(paciente), turnosCancelados };
}

/**
 * Activa o desactiva (baja lógica) al paciente. Al desactivarlo se cancelan (borran) sus
 * turnos futuros —los que empiezan desde ahora en adelante—; los pasados se conservan.
 * Devuelve `{ paciente, turnosCancelados }`, o null si no existe.
 */
async function setPacienteActivo(id, activo) {
  if (!(await findPacienteById(id))) return null;

  const turnosCancelados = await prisma.$transaction(async (tx) => {
    await tx.paciente.update({ where: { id }, data: { activo } });
    if (activo) return 0;
    const { count } = await tx.turno.deleteMany({
      where: { pacienteId: id, inicio: { gte: new Date() } },
    });
    return count;
  });

  const paciente = await prisma.paciente.findUnique({
    where: { id },
    select: pacienteFields(),
  });
  return { paciente: toPaciente(paciente), turnosCancelados };
}

/**
 * Borra al paciente para siempre. Sus turnos y asignaciones se borran en cascada
 * (`ON DELETE CASCADE` en la base). Devuelve cuántos turnos se borraron, o null si no existe.
 */
async function deletePaciente(id) {
  const paciente = await prisma.paciente.findUnique({
    where: { id },
    select: { _count: { select: { turnos: true } } },
  });
  if (!paciente) return null;

  await prisma.paciente.delete({ where: { id } });
  return paciente._count.turnos;
}

module.exports = {
  listPacientes,
  findPacienteById,
  findPacienteByDni,
  isProfesionalAsignado,
  createPaciente,
  updatePaciente,
  setPacienteActivo,
  deletePaciente,
};
