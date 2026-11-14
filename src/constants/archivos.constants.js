const path = require('node:path');

/** Dónde se guardan los archivos subidos. Deben coincidir con `STORAGE_DRIVER` del .env. */
const STORAGE_DRIVERS = {
  /** Carpeta en el disco del servidor (desarrollo). */
  local: 'local',
  /** Cloudflare R2 (producción). Todavía no implementado. */
  r2: 'r2',
};

/** Driver en uso (variable STORAGE_DRIVER; por defecto, disco local). */
const STORAGE_DRIVER = process.env.STORAGE_DRIVER || STORAGE_DRIVERS.local;

/** Carpeta del driver local (variable STORAGE_LOCAL_DIR; por defecto `back-end/uploads`). */
const STORAGE_LOCAL_DIR = path.resolve(
  __dirname,
  '../..',
  process.env.STORAGE_LOCAL_DIR || 'uploads',
);

/** Carpeta (prefijo de la clave) donde van los comprobantes de pago. */
const CARPETA_COMPROBANTES = 'comprobantes';

/** Tamaño máximo de un comprobante: 5 MB. */
const COMPROBANTE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Tipos de archivo aceptados como comprobante, con su extensión y la "firma" con la que
 * empieza el archivo (para no confiar solo en lo que declara el navegador).
 */
const COMPROBANTE_TIPOS = {
  'image/jpeg': { extension: 'jpg', firma: [0xff, 0xd8, 0xff] },
  'image/png': { extension: 'png', firma: [0x89, 0x50, 0x4e, 0x47] },
  'image/webp': { extension: 'webp', firma: [0x52, 0x49, 0x46, 0x46] },
  'application/pdf': { extension: 'pdf', firma: [0x25, 0x50, 0x44, 0x46] },
};

/** Nombre del campo del formulario (multipart) que trae el archivo. */
const CAMPO_ARCHIVO = 'archivo';

module.exports = {
  STORAGE_DRIVERS,
  STORAGE_DRIVER,
  STORAGE_LOCAL_DIR,
  CARPETA_COMPROBANTES,
  COMPROBANTE_MAX_BYTES,
  COMPROBANTE_TIPOS,
  CAMPO_ARCHIVO,
};
