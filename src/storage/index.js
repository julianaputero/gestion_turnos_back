/**
 * Almacenamiento de archivos con una interfaz única, para poder cambiar dónde se guardan
 * sin tocar el resto del código:
 *   guardar(key, buffer)  ·  leer(key) → Buffer | null  ·  borrar(key)
 *
 * El driver se elige con STORAGE_DRIVER en el .env: `local` (carpeta del disco, desarrollo)
 * o `r2` (Cloudflare R2, producción; pendiente de implementar con su API compatible con S3).
 */
const { STORAGE_DRIVER, STORAGE_DRIVERS } = require('../constants/archivos.constants');

function cargarDriver() {
  switch (STORAGE_DRIVER) {
    case STORAGE_DRIVERS.local:
      return require('./local.storage');
    case STORAGE_DRIVERS.r2:
      throw new Error('El almacenamiento en Cloudflare R2 todavía no está implementado.');
    default:
      throw new Error(`STORAGE_DRIVER desconocido: "${STORAGE_DRIVER}" (usá "local" o "r2").`);
  }
}

module.exports = cargarDriver();
