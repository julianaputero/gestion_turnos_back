/** Deben coincidir con el enum `Modalidad` de Prisma y con el front-end. */
const MODALIDADES = {
  presencial: 'presencial',
  virtual: 'virtual',
  /** Atiende de las dos formas. */
  mixta: 'mixta',
};


/** Límite de horas de anticipación del recordatorio (una semana). */
const RECORDATORIO_MAX_HORAS = 168;

/** Horas de anticipación si el profesional no tiene ficha (igual al default de Prisma). */
const RECORDATORIO_HORAS_DEFAULT = 24;

/** Largo máximo de los textos libres de la ficha (especialidad, matrícula, teléfono). */
const FICHA_TEXTO_MAX = 120;

/** Honorario base máximo aceptado (entra en DECIMAL(12,2)). */
const HONORARIO_MAX = 9999999999.99;

/** Bytes aleatorios del token del link de solo lectura (se guarda en hex: el doble de caracteres). */
const LINK_TOKEN_BYTES = 16;

module.exports = {
  MODALIDADES,
  RECORDATORIO_MAX_HORAS,
  RECORDATORIO_HORAS_DEFAULT,
  FICHA_TEXTO_MAX,
  HONORARIO_MAX,
  LINK_TOKEN_BYTES,
};
