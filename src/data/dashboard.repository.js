const prisma = require('./prisma');
const { USER_ROLES } = require('../constants/roles.constants');
const { TIPOS_MENSAJE } = require('../constants/mensajes.constants');
const { RECORDATORIO_HORAS_DEFAULT } = require('../constants/profesionales.constants');

const HORA_MS = 60 * 60 * 1000;

/** Campos de un turno para la lista de recordatorios. */
const TURNO_LISTA_SELECT = {
  id: true,
  inicio: true,
  fin: true,
  paciente: { select: { id: true, nombre: true, apellido: true, telefono: true } },
  pago: { select: { monto: true } },
  mensajes: {
    where: { tipo: TIPOS_MENSAJE.recordatorioTurno },
    orderBy: { enviadoAt: 'desc' },
    take: 1,
    select: { enviadoAt: true },
  },
};

const toNumber = (decimal) => (decimal === null || decimal === undefined ? null : Number(decimal));

/**
 * Resumen de un profesional para el "Dashboard por Profesional":
 * - `profesional`: datos de su ficha (especialidad, matrícula, tono, honorario).
 * - `kpis` del período [mesDesde, mesHasta): pacientes atendidos (distintos, con turnos que
 *   ya empezaron), cobrado y pendiente (de esos turnos atendidos) y turnos agendados.
 * - `recordatorios`: todos los turnos de hoy (desde `hoyDesde`) y, si el profesional pidió
 *   más anticipación en su ficha (`horasAntes`), también los que empiezan hasta
 *   `ahora + horasAntes`. Cada uno con su monto, estado de pago y si ya se envió el
 *   recordatorio de ese turno.
 * Devuelve null si el profesional no existe.
 */
async function getDashboardProfesional(id, { mesDesde, mesHasta, hoyDesde, hoyHasta }) {
  const user = await prisma.user.findFirst({
    where: { id, role: USER_ROLES.profesional },
    select: {
      id: true,
      nombre: true,
      profesional: {
        select: {
          especialidad: true,
          matricula: true,
          honorarioBase: true,
          tonoComunicacion: true,
          recordatorioHorasAntes: true,
        },
      },
    },
  });
  if (!user) return null;

  const honorarioBase = toNumber(user.profesional?.honorarioBase ?? null);
  const horasAntes = user.profesional?.recordatorioHorasAntes ?? RECORDATORIO_HORAS_DEFAULT;
  const ahora = new Date();
  const limiteRecordatorios = new Date(
    Math.max(hoyHasta.getTime(), ahora.getTime() + horasAntes * HORA_MS),
  );

  const [turnosMes, turnosRecordatorio] = await Promise.all([
    prisma.turno.findMany({
      where: { profesionalId: id, inicio: { gte: mesDesde, lt: mesHasta } },
      select: { inicio: true, pacienteId: true, pago: { select: { monto: true } } },
    }),
    prisma.turno.findMany({
      where: { profesionalId: id, inicio: { gte: hoyDesde, lt: limiteRecordatorios } },
      orderBy: { inicio: 'asc' },
      select: TURNO_LISTA_SELECT,
    }),
  ]);

  const toTurnoLista = ({ id: turnoId, inicio, fin, paciente, pago, mensajes }) => ({
    turnoId,
    inicio,
    fin,
    paciente,
    monto: pago ? Number(pago.monto) : honorarioBase,
    pagado: pago !== null,
    recordatorioEnviadoAt: mensajes[0]?.enviadoAt ?? null,
  });

  const atendidos = turnosMes.filter((turno) => turno.inicio < ahora);
  const cobrado = atendidos.reduce((total, t) => total + (t.pago ? Number(t.pago.monto) : 0), 0);
  const pendiente = atendidos.reduce((total, t) => total + (t.pago ? 0 : (honorarioBase ?? 0)), 0);

  return {
    profesional: {
      id: user.id,
      nombre: user.nombre,
      especialidad: user.profesional?.especialidad ?? null,
      matricula: user.profesional?.matricula ?? null,
      honorarioBase,
      tono: user.profesional?.tonoComunicacion ?? null,
    },
    kpis: {
      pacientesAtendidos: new Set(atendidos.map((turno) => turno.pacienteId)).size,
      cobrado,
      pendiente,
      pendientesCantidad: atendidos.filter((turno) => !turno.pago).length,
      turnosMes: turnosMes.length,
    },
    recordatorios: {
      horasAntes,
      turnos: turnosRecordatorio.map(toTurnoLista),
    },
  };
}

module.exports = { getDashboardProfesional };
