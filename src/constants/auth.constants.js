/** Costo de bcrypt al hashear contraseñas. */
const PASSWORD_SALT_ROUNDS = 10;

/** Largo mínimo de contraseña (alta de profesionales). */
const PASSWORD_MIN_LENGTH = 6;

/** Duración del token de sesión: normal, o con "Recordarme" tildado en el login. */
const TOKEN_EXPIRES_IN = { sesion: '12h', recordarme: '30d' };

/** Clave secreta para firmar los tokens (variable de entorno JWT_SECRET, obligatoria). */
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Header con el que Gestión pide ver la app "como" un profesional (su id). Solo vale en
 * lecturas: ver `requireAuth`. Debe coincidir con VER_COMO_HEADER del front-end.
 */
const VER_COMO_HEADER = 'x-ver-como';

/** Métodos HTTP de solo lectura (los únicos permitidos en "ver como"). */
const METODOS_LECTURA = ['GET', 'HEAD'];

module.exports = {
  PASSWORD_SALT_ROUNDS,
  PASSWORD_MIN_LENGTH,
  TOKEN_EXPIRES_IN,
  JWT_SECRET,
  VER_COMO_HEADER,
  METODOS_LECTURA,
};
