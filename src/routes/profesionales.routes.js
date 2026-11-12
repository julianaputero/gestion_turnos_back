const { Router } = require('express');
const { listProfesionales, listFichas, updateFicha } = require('../data/profesionales.repository');
const {
  MODALIDADES,
  TONOS_COMUNICACION,
  RECORDATORIO_MAX_HORAS,
  FICHA_TEXTO_MAX,
  HONORARIO_MAX,
} = require('../constants/profesionales.constants');

const router = Router();

const DIAS_VALIDOS = [0, 1, 2, 3, 4, 5, 6];
const TEXTOS = { especialidad: 'La especialidad', matricula: 'La matrícula', telefono: 'El teléfono' };

/**
 * Valida el body del PATCH. Solo toma los campos presentes (actualización parcial).
 * Devuelve `{ cambios }` o `{ error }` con el mensaje para el usuario.
 */
function parseFicha(body) {
  const cambios = {};

  for (const [campo, nombre] of Object.entries(TEXTOS)) {
    if (!(campo in body)) continue;
    const valor = body[campo];
    if (valor !== null && typeof valor !== 'string') return { error: `${nombre} no es válida.` };
    const texto = valor?.trim() ?? '';
    if (texto.length > FICHA_TEXTO_MAX) {
      return { error: `${nombre} no puede superar ${FICHA_TEXTO_MAX} caracteres.` };
    }
    cambios[campo] = texto || null;
  }

  if ('activo' in body) {
    if (typeof body.activo !== 'boolean') return { error: 'El estado activo no es válido.' };
    cambios.activo = body.activo;
  }

  if ('honorarioBase' in body) {
    const { honorarioBase } = body;
    if (
      honorarioBase !== null &&
      (typeof honorarioBase !== 'number' ||
        !Number.isFinite(honorarioBase) ||
        honorarioBase < 0 ||
        honorarioBase > HONORARIO_MAX)
    ) {
      return { error: 'El honorario base tiene que ser un número positivo.' };
    }
    cambios.honorarioBase = honorarioBase === null ? null : Math.round(honorarioBase * 100) / 100;
  }

  if ('modalidades' in body) {
    const { modalidades } = body;
    const validas = Object.values(MODALIDADES);
    if (!Array.isArray(modalidades) || modalidades.some((m) => !validas.includes(m))) {
      return { error: 'Las modalidades no son válidas.' };
    }
    cambios.modalidades = validas.filter((m) => modalidades.includes(m));
  }

  if ('diasAtencion' in body) {
    const { diasAtencion } = body;
    if (!Array.isArray(diasAtencion) || diasAtencion.some((d) => !DIAS_VALIDOS.includes(d))) {
      return { error: 'Los días de atención no son válidos.' };
    }
    cambios.diasAtencion = DIAS_VALIDOS.filter((d) => diasAtencion.includes(d));
  }

  if ('recordatorioHorasAntes' in body) {
    const horas = body.recordatorioHorasAntes;
    if (!Number.isInteger(horas) || horas < 0 || horas > RECORDATORIO_MAX_HORAS) {
      return {
        error: `Las horas de anticipación tienen que ser un número entero entre 0 y ${RECORDATORIO_MAX_HORAS}.`,
      };
    }
    cambios.recordatorioHorasAntes = horas;
  }

  if ('tono' in body) {
    if (!Object.values(TONOS_COMUNICACION).includes(body.tono)) {
      return { error: 'El tono de comunicación no es válido.' };
    }
    cambios.tono = body.tono;
  }

  return { cambios };
}

router.get('/', async (_req, res) => {
  res.json({ profesionales: await listProfesionales() });
});

/** GET /api/profesionales/fichas — ficha completa de cada profesional. */
router.get('/fichas', async (_req, res) => {
  res.json({ fichas: await listFichas() });
});

/** PATCH /api/profesionales/:id/ficha — actualización parcial de la ficha (`:id` = id del usuario). */
router.patch('/:id/ficha', async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ message: 'Enviá los datos de la ficha.' });
  }

  const { cambios, error } = parseFicha(body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  const ficha = await updateFicha(req.params.id, cambios);
  if (!ficha) {
    return res.status(404).json({ message: 'El profesional no existe.' });
  }

  return res.json({ ficha });
});

module.exports = router;
