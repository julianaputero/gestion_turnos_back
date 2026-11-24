/**
 * Estado de cada turno en el reporte mensual. Debe coincidir con el front-end.
 * - cobrado: tiene pago registrado (aunque el turno sea futuro).
 * - pendiente: ya empezó y no tiene pago.
 * - agendado: todavía no empezó y no tiene pago.
 */
const REPORTE_ESTADOS_TURNO = {
  cobrado: 'cobrado',
  pendiente: 'pendiente',
  agendado: 'agendado',
};

/** Rango máximo (en días) de un reporte: un mes, con margen por cambios de horario. */
const REPORTE_MAX_RANGE_DAYS = 32;

module.exports = { REPORTE_ESTADOS_TURNO, REPORTE_MAX_RANGE_DAYS };
