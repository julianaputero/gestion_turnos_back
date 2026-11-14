/** Tipos de mensaje. Deben coincidir con el enum `TipoMensaje` de Prisma y con el front-end. */
const TIPOS_MENSAJE = {
  recordatorioTurno: 'recordatorio_turno',
  cobroPendiente: 'cobro_pendiente',
  confirmacionReserva: 'confirmacion_reserva',
};

/** Largo máximo de una plantilla o de un mensaje. */
const MENSAJE_MAX = 1000;

/**
 * Plantillas por defecto, por tipo y tono (`TONOS_COMUNICACION`). Se usan mientras Gestión
 * no guarde una propia. Marcadores: {nombre} (nombre de pila), {paciente} (nombre y apellido),
 * {profesional}, {fecha} y {hora} (del próximo turno con ese profesional).
 */
const PLANTILLAS_DEFAULT = {
  [TIPOS_MENSAJE.recordatorioTurno]: {
    formal:
      'Estimado/a {paciente}: le recordamos su turno con {profesional} el {fecha} a las {hora} hs. Le solicitamos confirmar su asistencia. Muchas gracias.',
    cercano:
      '¡Hola {nombre}! Te recordamos tu turno con {profesional} el {fecha} a las {hora} hs. ¿Nos confirmás si podés venir? ¡Te esperamos!',
    neutro:
      'Hola {nombre}. Recordatorio: turno con {profesional} el {fecha} a las {hora} hs. Por favor, confirmá tu asistencia.',
  },
  [TIPOS_MENSAJE.cobroPendiente]: {
    formal:
      'Estimado/a {paciente}: le informamos que registra un saldo pendiente por la atención con {profesional}. Le agradeceremos regularizarlo a la brevedad. Quedamos a disposición ante cualquier consulta.',
    cercano:
      '¡Hola {nombre}! Te escribimos porque quedó pendiente el pago de tu atención con {profesional}. Cuando puedas, avisanos y te pasamos los datos. ¡Gracias!',
    neutro:
      'Hola {nombre}. Tenés un pago pendiente por la atención con {profesional}. Avisanos si necesitás los datos para abonar.',
  },
  [TIPOS_MENSAJE.confirmacionReserva]: {
    formal:
      'Estimado/a {paciente}: le confirmamos su turno con {profesional} para el {fecha} a las {hora} hs. Ante cualquier cambio, le pedimos que nos avise con anticipación.',
    cercano:
      '¡Hola {nombre}! Ya quedó reservado tu turno con {profesional} para el {fecha} a las {hora} hs. Cualquier cosa, escribinos. ¡Nos vemos!',
    neutro: 'Hola {nombre}. Turno confirmado con {profesional}: {fecha} a las {hora} hs.',
  },
};

module.exports = { TIPOS_MENSAJE, MENSAJE_MAX, PLANTILLAS_DEFAULT };
