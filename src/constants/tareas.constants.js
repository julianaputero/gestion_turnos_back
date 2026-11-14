const { TIPOS_MENSAJE } = require('./mensajes.constants');

/**
 * Tipos de tarea. Deben coincidir con el enum `TipoTarea` de Prisma y con el front-end.
 * Usan los mismos valores que el tipo de mensaje con el que se resuelven.
 */
const TIPOS_TAREA = {
  recordatorioTurno: TIPOS_MENSAJE.recordatorioTurno,
  cobroPendiente: TIPOS_MENSAJE.cobroPendiente,
};

/** Estados. Deben coincidir con el enum `EstadoTarea` de Prisma y con el front-end. */
const ESTADOS_TAREA = {
  pendiente: 'pendiente',
  completada: 'completada',
  vencida: 'vencida',
};

/** Solo se reclaman cobros de turnos de los últimos N días (para no llenar de tareas viejas). */
const TAREAS_COBRO_DIAS_ATRAS = 30;

/** En "Hechas" se muestran las tareas cerradas en los últimos N días. */
const TAREAS_HECHAS_DIAS = 7;

module.exports = { TIPOS_TAREA, ESTADOS_TAREA, TAREAS_COBRO_DIAS_ATRAS, TAREAS_HECHAS_DIAS };
