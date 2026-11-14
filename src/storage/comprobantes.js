/**
 * Limpieza de archivos de comprobantes cuando se borran turnos.
 *
 * La base borra los pagos en cascada al borrar un turno (o un paciente), pero el archivo
 * vive en el almacenamiento (carpeta local / Cloudflare R2) y hay que borrarlo aparte:
 *   1. dentro de la misma transacción, antes de borrar, se juntan las claves con
 *      `clavesDeComprobantes(tx, { ...filtro de turnos })`;
 *   2. cuando la transacción terminó bien, se borran con `borrarArchivos(claves)`.
 * Si la transacción falla, no se borra ningún archivo.
 *
 * Para casos que no pasan por el código (borrar un usuario a mano, el trigger de pacientes
 * sin profesionales), está `npm run storage:limpiar`.
 */
const storage = require('./index');

/** Claves de los archivos de comprobante de los pagos de los turnos que cumplen `whereTurno`. */
async function clavesDeComprobantes(db, whereTurno) {
  const pagos = await db.pago.findMany({
    where: { turno: whereTurno, comprobanteKey: { not: null } },
    select: { comprobanteKey: true },
  });
  return pagos.map((pago) => pago.comprobanteKey);
}

/**
 * Borra los archivos. Un error al borrar uno no corta la operación (el turno ya se borró):
 * se registra en la consola y lo levanta después `npm run storage:limpiar`.
 */
async function borrarArchivos(claves) {
  for (const clave of claves) {
    try {
      await storage.borrar(clave);
    } catch (error) {
      console.error(`[storage] No se pudo borrar ${clave}:`, error.message);
    }
  }
}

module.exports = { clavesDeComprobantes, borrarArchivos };
