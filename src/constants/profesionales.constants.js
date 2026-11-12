/** Deben coincidir con los enums de Prisma (`Modalidad`, `TonoComunicacion`) y con el front-end. */
const MODALIDADES = {
  presencial: 'presencial',
  virtual: 'virtual',
};

const TONOS_COMUNICACION = {
  cercano: 'cercano',
  formal: 'formal',
  neutro: 'neutro',
};

/** Límite de horas de anticipación del recordatorio (una semana). */
const RECORDATORIO_MAX_HORAS = 168;

/** Largo máximo de los textos libres de la ficha (especialidad, matrícula, teléfono). */
const FICHA_TEXTO_MAX = 120;

/** Honorario base máximo aceptado (entra en DECIMAL(12,2)). */
const HONORARIO_MAX = 9999999999.99;

/** Bytes aleatorios del token del link de solo lectura (se guarda en hex: el doble de caracteres). */
const LINK_TOKEN_BYTES = 16;

module.exports = {
  MODALIDADES,
  TONOS_COMUNICACION,
  RECORDATORIO_MAX_HORAS,
  FICHA_TEXTO_MAX,
  HONORARIO_MAX,
  LINK_TOKEN_BYTES,
};
