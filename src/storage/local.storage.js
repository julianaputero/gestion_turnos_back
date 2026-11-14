const fs = require('node:fs/promises');
const path = require('node:path');
const { STORAGE_LOCAL_DIR } = require('../constants/archivos.constants');

/** Ruta en disco de una clave, sin dejar salir de la carpeta de almacenamiento. */
function rutaDe(key) {
  const ruta = path.resolve(STORAGE_LOCAL_DIR, key);
  if (!ruta.startsWith(STORAGE_LOCAL_DIR + path.sep)) {
    throw new Error(`Clave de archivo inválida: ${key}`);
  }
  return ruta;
}

/** Driver de almacenamiento en una carpeta del disco (desarrollo). */
module.exports = {
  async guardar(key, buffer) {
    const ruta = rutaDe(key);
    await fs.mkdir(path.dirname(ruta), { recursive: true });
    await fs.writeFile(ruta, buffer);
  },

  /** Contenido del archivo, o null si no existe. */
  async leer(key) {
    try {
      return await fs.readFile(rutaDe(key));
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  },

  /** Claves de todos los archivos guardados dentro de `prefijo` (ej. "comprobantes"). */
  async listar(prefijo) {
    const carpeta = rutaDe(prefijo);
    try {
      const nombres = await fs.readdir(carpeta, { recursive: true, withFileTypes: true });
      return nombres
        .filter((entrada) => entrada.isFile())
        .map((entrada) =>
          path.relative(STORAGE_LOCAL_DIR, path.join(entrada.parentPath, entrada.name)),
        )
        .map((clave) => clave.split(path.sep).join('/'));
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  },

  /** Borra el archivo (si no existe, no hace nada). */
  async borrar(key) {
    await fs.rm(rutaDe(key), { force: true });
  },
};
