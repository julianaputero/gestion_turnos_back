const prisma = require('./prisma');
const { USER_ROLES } = require('../constants/roles.constants');
const { MEDIOS_PAGO } = require('../constants/cobros.constants');
const { REPORTE_ESTADOS_TURNO } = require('../constants/reportes.constants');

const toNumber = (decimal) => (decimal === null || decimal === undefined ? null : Number(decimal));
/** Suma de montos redondeada a centavos (evita 0.1 + 0.2). */
const sumar = (lista) => Math.round(lista.reduce((total, t) => total + (t.monto ?? 0), 0) * 100) / 100;

/**
 * Reporte mensual de un profesional: todos sus turnos en [desde, hasta) con su horario,
 * paciente, monto y estado de cobro, más un resumen.
 *
 * Mismo criterio que Cobros y el Dashboard por Profesional:
 * - Un turno con pago está "cobrado" (por su monto real).
 * - Un turno que ya empezó sin pago está "pendiente", valorizado al honorario base actual.
 * - Un turno futuro sin pago está "agendado"; su monto estimado también es el honorario base.
 *
 * Devuelve null si el profesional no existe.
 */
async function getReporteMensual(profesionalId, { desde, hasta }) {
  const user = await prisma.user.findFirst({
    where: { id: profesionalId, role: USER_ROLES.profesional },
    select: {
      id: true,
      nombre: true,
      profesional: { select: { especialidad: true, matricula: true, honorarioBase: true } },
      turnos: {
        where: { inicio: { gte: desde, lt: hasta } },
        orderBy: { inicio: 'asc' },
        select: {
          id: true,
          inicio: true,
          fin: true,
          paciente: { select: { id: true, nombre: true, apellido: true, cobertura: true } },
          pago: { select: { monto: true, medio: true, referencia: true, fechaPago: true } },
        },
      },
    },
  });
  if (!user) return null;

  const ahora = new Date();
  const honorarioBase = toNumber(user.profesional?.honorarioBase ?? null);

  const turnos = user.turnos.map(({ id, inicio, fin, paciente, pago }) => {
    let estado = REPORTE_ESTADOS_TURNO.agendado;
    if (pago) estado = REPORTE_ESTADOS_TURNO.cobrado;
    else if (inicio < ahora) estado = REPORTE_ESTADOS_TURNO.pendiente;
    return {
      id,
      inicio,
      fin,
      paciente,
      estado,
      monto: pago ? toNumber(pago.monto) : honorarioBase,
      pago: pago ? { ...pago, monto: toNumber(pago.monto) } : null,
    };
  });

  const porEstado = (estado) => turnos.filter((turno) => turno.estado === estado);
  const cobrados = porEstado(REPORTE_ESTADOS_TURNO.cobrado);
  const pendientes = porEstado(REPORTE_ESTADOS_TURNO.pendiente);
  const agendados = porEstado(REPORTE_ESTADOS_TURNO.agendado);

  const cobradoPorMedio = Object.values(MEDIOS_PAGO)
    .map((medio) => {
      const delMedio = cobrados.filter((turno) => turno.pago.medio === medio);
      return { medio, cantidad: delMedio.length, monto: sumar(delMedio) };
    })
    .filter((item) => item.cantidad > 0);

  return {
    profesional: {
      id: user.id,
      nombre: user.nombre,
      especialidad: user.profesional?.especialidad ?? null,
      matricula: user.profesional?.matricula ?? null,
      honorarioBase,
    },
    resumen: {
      turnos: turnos.length,
      realizados: turnos.filter((turno) => turno.inicio < ahora).length,
      pacientes: new Set(turnos.map((turno) => turno.paciente.id)).size,
      cobrado: { cantidad: cobrados.length, monto: sumar(cobrados) },
      pendiente: { cantidad: pendientes.length, monto: sumar(pendientes) },
      agendado: { cantidad: agendados.length, monto: sumar(agendados) },
      total: sumar(turnos),
      cobradoPorMedio,
    },
    turnos,
  };
}

module.exports = { getReporteMensual };
