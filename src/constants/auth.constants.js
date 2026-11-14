/** Costo de bcrypt al hashear contraseñas. */
const PASSWORD_SALT_ROUNDS = 10;

/** Largo mínimo de contraseña aceptado en el registro. */
const PASSWORD_MIN_LENGTH = 6;

/** Duración del token de sesión: normal, o con "Recordarme" tildado en el login. */
const TOKEN_EXPIRES_IN = { sesion: '12h', recordarme: '30d' };

/** Clave secreta para firmar los tokens (variable de entorno JWT_SECRET, obligatoria). */
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = { PASSWORD_SALT_ROUNDS, PASSWORD_MIN_LENGTH, TOKEN_EXPIRES_IN, JWT_SECRET };
