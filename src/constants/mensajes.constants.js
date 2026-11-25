/** Tipos de mensaje. Deben coincidir con el enum `TipoMensaje` de Prisma y con el front-end. */
const TIPOS_MENSAJE = {
  recordatorioTurno: 'recordatorio_turno',
  cobroPendiente: 'cobro_pendiente',
  confirmacionReserva: 'confirmacion_reserva',
};

/** Largo máximo de una plantilla o de un mensaje. */
const MENSAJE_MAX = 1000;

/**
 * Plantilla por defecto de cada tipo. Se usa para un profesional mientras Gestión no le
 * guarde una propia (tabla `plantillas_mensajes`, una por profesional y tipo).
 * Marcadores: {nombre} (nombre de pila), {paciente} (nombre y apellido), {profesional},
 * {fecha} y {hora} (del turno).
 */
const PLANTILLAS_DEFAULT = {
  [TIPOS_MENSAJE.recordatorioTurno]:
    'Hola {nombre}. Recordatorio: turno con {profesional} el {fecha} a las {hora} hs. Por favor, confirmá tu asistencia.',
  [TIPOS_MENSAJE.cobroPendiente]:
    'Hola {nombre}. Tenés un pago pendiente por la atención con {profesional}. Avisanos si necesitás los datos para abonar.',
  [TIPOS_MENSAJE.confirmacionReserva]: 'Hola {nombre}. Turno confirmado con {profesional}: {fecha} a las {hora} hs.',
};

module.exports = { TIPOS_MENSAJE, MENSAJE_MAX, PLANTILLAS_DEFAULT };
