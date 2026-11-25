const { Router } = require('express');
const {
  listProfesionales,
  listFichas,
  getFicha,
  updateFicha,
} = require('../data/profesionales.repository');
const { findByEmail, addProfesional } = require('../data/users.repository');
const { PASSWORD_MIN_LENGTH } = require('../constants/auth.constants');
const {
  MODALIDADES,
  RECORDATORIO_MAX_HORAS,
  FICHA_TEXTO_MAX,
  HONORARIO_MAX,
} = require('../constants/profesionales.constants');
const { normalizeTelefono } = require('../utils/telefono');

const { requireGestion, profesionalVisible } = require('../middleware/auth');
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

  if (cambios.telefono) {
    const { telefono, error } = normalizeTelefono(cambios.telefono);
    if (error) return { error };
    cambios.telefono = telefono;
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

  if ('modalidad' in body) {
    const { modalidad } = body;
    if (modalidad !== null && !Object.values(MODALIDADES).includes(modalidad)) {
      return { error: 'La modalidad no es válida.' };
    }
    cambios.modalidad = modalidad;
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

  return { cambios };
}

/** GET /api/profesionales — id y nombre. Un Profesional solo se ve a sí mismo. */
router.get('/', async (req, res) => {
  const profesionales = await listProfesionales();
  const soloYo = profesionalVisible(req);
  res.json({
    profesionales: soloYo ? profesionales.filter((p) => p.id === soloYo) : profesionales,
  });
});

/** GET /api/profesionales/fichas — ficha completa de cada profesional. */
router.get('/fichas', requireGestion, async (_req, res) => {
  res.json({ fichas: await listFichas() });
});

/**
 * POST /api/profesionales — Gestión crea la cuenta de un profesional (no hay registro
 * público). Body: { nombre, email, password } → { ficha } (la ficha nace con valores por
 * defecto y se completa con el PATCH de abajo).
 */
router.post('/', requireGestion, async (req, res) => {
  const { nombre, email, password } = req.body ?? {};

  if (
    typeof nombre !== 'string' ||
    !nombre.trim() ||
    typeof email !== 'string' ||
    !email.includes('@') ||
    typeof password !== 'string' ||
    password.length < PASSWORD_MIN_LENGTH
  ) {
    return res.status(400).json({
      message: `Completá nombre, email y una contraseña de al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    });
  }

  if (await findByEmail(email)) {
    return res.status(409).json({ message: 'Ya existe una cuenta con ese email.' });
  }

  const user = await addProfesional({ nombre: nombre.trim(), email, password });
  return res.status(201).json({ ficha: await getFicha(user.id) });
});

/** PATCH /api/profesionales/:id/ficha — actualización parcial de la ficha (`:id` = id del usuario). */
router.patch('/:id/ficha', requireGestion, async (req, res) => {
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
