const prisma = require('./prisma');
const { USER_ROLES } = require('../constants/roles.constants');
const { RECORDATORIO_HORAS_DEFAULT } = require('../constants/profesionales.constants');
const {
  TIPOS_TAREA,
  ESTADOS_TAREA,
  TAREAS_COBRO_DIAS_ATRAS,
  TAREAS_HECHAS_DIAS,
} = require('../constants/tareas.constants');

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

/** El turno ya tiene un mensaje de este tipo asociado (recordatorio o reclamo de cobro). */
const conMensaje = (tipo) => ({ mensajes: { some: { tipo } } });

/**
 * Pone al día el estado de las tareas pendientes:
 * - recordatorio: se completa si se envió el recordatorio de ese turno; vence si el turno
 *   ya empezó sin recordatorio.
 * - cobro: se completa si se cargó el pago o se le envió al paciente el mensaje de cobro.
 */
async function sincronizarEstados(ahora) {
  const pendiente = { estado: ESTADOS_TAREA.pendiente };
  const completar = { estado: ESTADOS_TAREA.completada, completadaAt: ahora };

  await prisma.$transaction([
    prisma.tarea.updateMany({
      where: {
        ...pendiente,
        tipo: TIPOS_TAREA.recordatorioTurno,
        turno: conMensaje(TIPOS_TAREA.recordatorioTurno),
      },
      data: completar,
    }),
    prisma.tarea.updateMany({
      where: {
        ...pendiente,
        tipo: TIPOS_TAREA.recordatorioTurno,
        turno: { inicio: { lte: ahora } },
      },
      data: { estado: ESTADOS_TAREA.vencida, completadaAt: ahora },
    }),
    prisma.tarea.updateMany({
      where: {
        ...pendiente,
        tipo: TIPOS_TAREA.cobroPendiente,
        turno: { OR: [{ pago: { isNot: null } }, conMensaje(TIPOS_TAREA.cobroPendiente)] },
      },
      data: completar,
    }),
  ]);
}

/**
 * Crea las tareas que falten (no duplica: una por tipo y turno) y pone al día los estados.
 * - Recordatorio: turnos que empiezan entre ahora y lo más lejano entre `hoyHasta` (fin del
 *   día de hoy) y las horas de anticipación de la ficha de su profesional, sin recordatorio.
 * - Cobro: turnos de los últimos `TAREAS_COBRO_DIAS_ATRAS` días que ya terminaron, sin pago
 *   ni mensaje de cobro.
 * Devuelve cuántas tareas nuevas se crearon.
 */
async function generarTareas({ hoyHasta }) {
  const ahora = new Date();

  const profesionales = await prisma.user.findMany({
    where: { role: USER_ROLES.profesional },
    select: { id: true, profesional: { select: { recordatorioHorasAntes: true } } },
  });

  const turnosRecordatorio = await prisma.turno.findMany({
    where: {
      inicio: { gt: ahora },
      NOT: conMensaje(TIPOS_TAREA.recordatorioTurno),
      OR: profesionales.map(({ id, profesional }) => {
        const horas = profesional?.recordatorioHorasAntes ?? RECORDATORIO_HORAS_DEFAULT;
        const limite = Math.max(hoyHasta.getTime(), ahora.getTime() + horas * HORA_MS);
        return { profesionalId: id, inicio: { lt: new Date(limite) } };
      }),
    },
    select: { id: true },
  });

  const turnosCobro = await prisma.turno.findMany({
    where: {
      fin: { lte: ahora, gte: new Date(ahora.getTime() - TAREAS_COBRO_DIAS_ATRAS * DIA_MS) },
      pago: { is: null },
      NOT: conMensaje(TIPOS_TAREA.cobroPendiente),
    },
    select: { id: true },
  });

  const { count } = await prisma.tarea.createMany({
    data: [
      ...turnosRecordatorio.map(({ id }) => ({ tipo: TIPOS_TAREA.recordatorioTurno, turnoId: id })),
      ...turnosCobro.map(({ id }) => ({ tipo: TIPOS_TAREA.cobroPendiente, turnoId: id })),
    ],
    skipDuplicates: true,
  });

  await sincronizarEstados(ahora);
  return count;
}

const TAREA_SELECT = {
  id: true,
  tipo: true,
  estado: true,
  completadaAt: true,
  completadaPor: { select: { id: true, nombre: true } },
  turno: {
    select: {
      id: true,
      inicio: true,
      fin: true,
      profesional: {
        select: { id: true, nombre: true, profesional: { select: { honorarioBase: true } } },
      },
      paciente: { select: { id: true, nombre: true, apellido: true, telefono: true } },
    },
  },
};

function toTarea({ turno, ...tarea }) {
  const { profesional, ...resto } = turno;
  const honorario = profesional.profesional?.honorarioBase;
  return {
    ...tarea,
    turno: {
      ...resto,
      monto: honorario === null || honorario === undefined ? null : Number(honorario),
      profesional: { id: profesional.id, nombre: profesional.nombre },
    },
  };
}

/**
 * Tareas para la lista. `pendientes`: todas las pendientes (por horario del turno).
 * `hechas`: completadas o vencidas en los últimos `TAREAS_HECHAS_DIAS` días (las más nuevas
 * primero). Opcionalmente, de un solo profesional.
 */
async function listTareas({ hechas, profesionalId }) {
  const deProfesional = profesionalId ? { turno: { profesionalId } } : {};
  const tareas = await prisma.tarea.findMany({
    where: hechas
      ? {
          ...deProfesional,
          estado: { in: [ESTADOS_TAREA.completada, ESTADOS_TAREA.vencida] },
          completadaAt: { gte: new Date(Date.now() - TAREAS_HECHAS_DIAS * DIA_MS) },
        }
      : { ...deProfesional, estado: ESTADOS_TAREA.pendiente },
    orderBy: hechas ? { completadaAt: 'desc' } : { turno: { inicio: 'asc' } },
    select: TAREA_SELECT,
  });
  return tareas.map(toTarea);
}

/** Marca la tarea como lista (a mano). Devuelve null si no existe. */
async function completarTarea(id, userId) {
  const existe = await prisma.tarea.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return null;
  const tarea = await prisma.tarea.update({
    where: { id },
    data: { estado: ESTADOS_TAREA.completada, completadaAt: new Date(), completadaPorId: userId },
    select: TAREA_SELECT,
  });
  return toTarea(tarea);
}

module.exports = { generarTareas, listTareas, completarTarea };
