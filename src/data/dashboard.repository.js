const prisma = require('./prisma');
const { USER_ROLES } = require('../constants/roles.constants');
const { TIPOS_MENSAJE } = require('../constants/mensajes.constants');
const { RECORDATORIO_HORAS_DEFAULT } = require('../constants/profesionales.constants');
const { TIPOS_TAREA, TAREAS_COBRO_DIAS_ATRAS } = require('../constants/tareas.constants');
const {
  SEMAFORO,
  PANEL_TURNOS_PROXIMOS_DIAS,
  SEMAFORO_COBRO_DIAS_ROJO,
} = require('../constants/panel.constants');
const { listTareas } = require('./tareas.repository');

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

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
 * - `profesional`: datos de su ficha (especialidad, matrícula, honorario).
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

/** Orden de las tarjetas del panel: primero lo urgente. */
const SEMAFORO_ORDEN = [SEMAFORO.rojo, SEMAFORO.amarillo, SEMAFORO.verde];

/**
 * Panel Principal (semáforo): una tarjeta por profesional con
 * - `turnosProximos`: turnos que empiezan en los próximos `PANEL_TURNOS_PROXIMOS_DIAS` días.
 * - `cobrosPendientes`: turnos que ya terminaron, sin pago, de los últimos
 *   `TAREAS_COBRO_DIAS_ATRAS` días (la misma ventana que las tareas de cobro), valorizados
 *   al honorario base actual. `atrasados` = los que terminaron hace más de
 *   `SEMAFORO_COBRO_DIAS_ROJO` días.
 * - `tareas`: sus tareas pendientes del Motor de Tareas (conviene generarlas antes).
 *   `recordatoriosHoy` = recordatorios pendientes de turnos que empiezan antes de `hoyHasta`.
 * - `semaforo`: rojo si hay cobros atrasados o recordatorios de hoy sin enviar; amarillo si
 *   hay algún otro cobro o tarea pendiente; verde si está todo al día.
 * Ordenado por semáforo (rojo primero) y nombre.
 */
async function getPanel({ hoyHasta }) {
  const ahora = new Date();
  const limiteAtrasado = new Date(ahora.getTime() - SEMAFORO_COBRO_DIAS_ROJO * DIA_MS);

  const [profesionales, tareas] = await Promise.all([
    prisma.user.findMany({
      where: { role: USER_ROLES.profesional },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        profesional: { select: { especialidad: true, honorarioBase: true } },
        _count: {
          select: {
            turnos: {
              where: {
                inicio: {
                  gte: ahora,
                  lt: new Date(ahora.getTime() + PANEL_TURNOS_PROXIMOS_DIAS * DIA_MS),
                },
              },
            },
          },
        },
        turnos: {
          where: {
            fin: { lte: ahora, gte: new Date(ahora.getTime() - TAREAS_COBRO_DIAS_ATRAS * DIA_MS) },
            pago: { is: null },
          },
          select: { fin: true },
        },
      },
    }),
    listTareas({ hechas: false }),
  ]);

  const tarjetas = profesionales.map(({ id, nombre, profesional, _count, turnos }) => {
    const honorarioBase = toNumber(profesional?.honorarioBase ?? null);
    const tareasPropias = tareas.filter((tarea) => tarea.turno.profesional.id === id);
    const atrasados = turnos.filter((turno) => turno.fin < limiteAtrasado).length;
    const recordatoriosHoy = tareasPropias.filter(
      (tarea) => tarea.tipo === TIPOS_TAREA.recordatorioTurno && tarea.turno.inicio < hoyHasta,
    ).length;

    let semaforo = SEMAFORO.verde;
    if (atrasados || recordatoriosHoy) semaforo = SEMAFORO.rojo;
    else if (turnos.length || tareasPropias.length) semaforo = SEMAFORO.amarillo;

    return {
      id,
      nombre,
      especialidad: profesional?.especialidad ?? null,
      semaforo,
      turnosProximos: _count.turnos,
      cobrosPendientes: {
        cantidad: turnos.length,
        /** null si el profesional no tiene honorario base cargado. */
        monto: honorarioBase === null ? null : turnos.length * honorarioBase,
        atrasados,
      },
      recordatoriosHoy,
      tareas: tareasPropias,
    };
  });

  return tarjetas.sort(
    (a, b) => SEMAFORO_ORDEN.indexOf(a.semaforo) - SEMAFORO_ORDEN.indexOf(b.semaforo),
  );
}

module.exports = { getDashboardProfesional, getPanel };
