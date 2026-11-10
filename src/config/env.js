/**
 * Carga las variables de `.env` (si existe) en process.env.
 * Se requiere una sola vez, antes que cualquier otro módulo que lea process.env.
 */
require('dotenv').config({ quiet: true });
