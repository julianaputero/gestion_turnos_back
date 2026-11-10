/** Costo de bcrypt al hashear contraseñas. */
const PASSWORD_SALT_ROUNDS = 10;

/** Largo mínimo de contraseña aceptado en el registro. */
const PASSWORD_MIN_LENGTH = 6;

module.exports = { PASSWORD_SALT_ROUNDS, PASSWORD_MIN_LENGTH };
