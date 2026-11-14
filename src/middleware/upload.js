const multer = require('multer');
const {
  COMPROBANTE_MAX_BYTES,
  COMPROBANTE_TIPOS,
  CAMPO_ARCHIVO,
} = require('../constants/archivos.constants');

const MB = 1024 * 1024;

const uploadComprobante = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: COMPROBANTE_MAX_BYTES, files: 1 },
}).single(CAMPO_ARCHIVO);

/** ¿El contenido empieza con la firma del tipo declarado? (evita, ej., un .exe renombrado a .pdf) */
function coincideFirma(buffer, tipo) {
  const { firma } = COMPROBANTE_TIPOS[tipo];
  return firma.every((byte, index) => buffer[index] === byte);
}

/**
 * Recibe un comprobante (campo `archivo`, multipart/form-data) en `req.file`, validando
 * tamaño, tipo (imagen JPG/PNG/WebP o PDF) y que el contenido corresponda al tipo.
 */
function recibirComprobante(req, res, next) {
  uploadComprobante(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(413)
        .json({ message: `El archivo no puede superar ${COMPROBANTE_MAX_BYTES / MB} MB.` });
    }
    if (error) {
      return res.status(400).json({ message: 'No se pudo leer el archivo enviado.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Elegí un archivo.' });
    }
    if (!COMPROBANTE_TIPOS[req.file.mimetype] || !coincideFirma(req.file.buffer, req.file.mimetype)) {
      return res
        .status(400)
        .json({ message: 'El comprobante tiene que ser una imagen (JPG, PNG o WebP) o un PDF.' });
    }
    return next();
  });
}

module.exports = { recibirComprobante };
