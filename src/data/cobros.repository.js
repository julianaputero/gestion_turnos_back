const prisma = require('./prisma');
const { USER_ROLES } = require('../constants/roles.constants');

const PAGO_FIELDS = {
  id: true,
  monto: true,
  medio: true,
  referencia: true,
  fechaPago: true,
  comprobanteNombre: true,
  comprobanteTipo: true,
  comprobanteBytes: true,
};

/** Decimal de Prisma → number, para la API. */
const toNumber = (decimal) => (decimal === null || decimal === undefined ? null : Number(decimal));

/** Pago para la API: monto como number y el archivo agrupado en `comprobante` (o null). */
function toPago(pago) {
  if (!pago) return null;
  const { comprobanteNombre, comprobanteTipo, comprobanteBytes, ...resto } = pago;
  return {
    ...resto,
    monto: toNumber(pago.monto),
    comprobante: comprobanteNombre
      ? { nombre: comprobanteNombre, tipo: comprobanteTipo, bytes: comprobanteBytes }
      : null,
  };
}

/**
 * Cobros agrupados por profesional: los turnos ya atendidos (que empezaron antes de ahora)
 * dentro de [desde, hasta), cada uno con su pago o `pago: null` si está pendiente.
 * El monto de un turno pendiente es el honorario base actual del profesional.
 * Incluye a todos los profesionales, aunque no tengan turnos en el rango.
 */
async function listCobros({ desde, hasta }) {
  const ahora = new Date();
  const hastaAtendidos = hasta < ahora ? hasta : ahora;

  const profesionales = await prisma.user.findMany({
    where: { role: USER_ROLES.profesional },
    orderBy: { nombre: 'asc' },
    select: {
      id: true,
      nombre: true,
      profesional: { select: { especialidad: true, honorarioBase: true } },
      turnos: {
        where: { inicio: { gte: desde, lt: hastaAtendidos } },
        orderBy: { inicio: 'asc' },
        select: {
          id: true,
          inicio: true,
          paciente: { select: { id: true, nombre: true, apellido: true } },
          pago: { select: PAGO_FIELDS },
        },
      },
    },
  });

  return profesionales.map(({ id, nombre, profesional, turnos }) => {
    const honorarioBase = toNumber(profesional?.honorarioBase ?? null);
    const cobros = turnos.map(({ id: turnoId, inicio, paciente, pago }) => ({
      turnoId,
      inicio,
      paciente,
      monto: pago ? toNumber(pago.monto) : honorarioBase,
      pago: toPago(pago),
    }));
    return {
      id,
      nombre,
      especialidad: profesional?.especialidad ?? null,
      honorarioBase,
      pendientes: cobros.filter((cobro) => !cobro.pago).length,
      cobros,
    };
  });
}

/** Turno con su pago (si tiene), o null si el turno no existe. */
function findTurnoConPago(turnoId) {
  return prisma.turno.findUnique({
    where: { id: turnoId },
    select: { id: true, pago: { select: { id: true } } },
  });
}

async function createPago({ turnoId, monto, medio, referencia, fechaPago }) {
  const pago = await prisma.pago.create({
    data: { turnoId, monto, medio, referencia, fechaPago },
    select: PAGO_FIELDS,
  });
  return toPago(pago);
}

/** Pago del turno con la clave de su archivo (uso interno), o null. */
function findPago(turnoId) {
  return prisma.pago.findUnique({
    where: { turnoId },
    select: { id: true, comprobanteKey: true, comprobanteNombre: true, comprobanteTipo: true },
  });
}

/**
 * Anula (borra) el pago del turno: vuelve a quedar pendiente.
 * Devuelve `{ comprobanteKey }` (para borrar el archivo) o null si no tenía pago.
 */
async function deletePago(turnoId) {
  const pago = await findPago(turnoId);
  if (!pago) return null;
  await prisma.pago.delete({ where: { turnoId } });
  return { comprobanteKey: pago.comprobanteKey };
}

/** Guarda (o reemplaza, con `null` quita) los datos del archivo del comprobante. */
async function setComprobante(turnoId, archivo) {
  const pago = await prisma.pago.update({
    where: { turnoId },
    data: {
      comprobanteKey: archivo?.key ?? null,
      comprobanteNombre: archivo?.nombre ?? null,
      comprobanteTipo: archivo?.tipo ?? null,
      comprobanteBytes: archivo?.bytes ?? null,
    },
    select: PAGO_FIELDS,
  });
  return toPago(pago);
}

module.exports = {
  listCobros,
  findTurnoConPago,
  createPago,
  findPago,
  deletePago,
  setComprobante,
};
