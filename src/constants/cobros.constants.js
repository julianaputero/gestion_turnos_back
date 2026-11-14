const { HONORARIO_MAX } = require('./profesionales.constants');

/** Medios de pago. Deben coincidir con el enum `MedioPago` de Prisma y con el front-end. */
const MEDIOS_PAGO = {
  transferencia: 'transferencia',
  efectivo: 'efectivo',
  mercadoPago: 'mercado_pago',
  tarjeta: 'tarjeta',
  otro: 'otro',
};

/** Largo máximo de la referencia del comprobante. */
const PAGO_REFERENCIA_MAX = 120;

/** Monto máximo de un pago (entra en DECIMAL(12,2)); el mismo límite que el honorario. */
const PAGO_MONTO_MAX = HONORARIO_MAX;

/** Rango máximo (en días) que se puede pedir en GET /api/cobros. */
const COBROS_MAX_RANGE_DAYS = 62;

module.exports = { MEDIOS_PAGO, PAGO_REFERENCIA_MAX, PAGO_MONTO_MAX, COBROS_MAX_RANGE_DAYS };
