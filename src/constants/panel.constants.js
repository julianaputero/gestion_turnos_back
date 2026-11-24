/** Estado del semáforo de cada profesional en el Panel Principal. Debe coincidir con el front-end. */
const SEMAFORO = {
  rojo: 'rojo',
  amarillo: 'amarillo',
  verde: 'verde',
};

/** "Turnos próximos": los que empiezan desde ahora hasta dentro de N días. */
const PANEL_TURNOS_PROXIMOS_DIAS = 7;

/** Un cobro pendiente de un turno que terminó hace más de N días pone el semáforo en rojo. */
const SEMAFORO_COBRO_DIAS_ROJO = 7;

module.exports = { SEMAFORO, PANEL_TURNOS_PROXIMOS_DIAS, SEMAFORO_COBRO_DIAS_ROJO };
