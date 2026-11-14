/** DNI: solo dígitos (se aceptan con puntos/espacios y se limpian), entre 7 y 9 cifras. */
const DNI_REGEX = /^\d{7,9}$/;

/** Largo máximo de los textos cortos del paciente (nombre, apellido, teléfono, email, cobertura). */
const PACIENTE_TEXTO_MAX = 120;

/** Largo máximo de las notas administrativas. */
const PACIENTE_NOTAS_MAX = 1000;

/** Filtro de estado de `GET /api/pacientes?estado=` (debe coincidir con el front-end). */
const PACIENTE_ESTADOS = {
  activos: 'activos',
  inactivos: 'inactivos',
  todos: 'todos',
};

/** Estado que se lista si no se indica ninguno. */
const PACIENTE_ESTADO_DEFAULT = PACIENTE_ESTADOS.activos;

module.exports = {
  DNI_REGEX,
  PACIENTE_TEXTO_MAX,
  PACIENTE_NOTAS_MAX,
  PACIENTE_ESTADOS,
  PACIENTE_ESTADO_DEFAULT,
};
