const { Router } = require('express');
const {
  generarTareas,
  listTareas,
  completarTarea,
  reabrirTarea,
} = require('../data/tareas.repository');
const { requireGestion } = require('../middleware/auth');

const router = Router();

// Motor de tareas: solo Gestión.
router.use(requireGestion);

/**
 * POST /api/tareas/generar — crea las tareas que falten y pone al día los estados.
 * Body: { hoyHasta: ISO } (fin del día de hoy en la zona horaria del front-end). → { creadas }
 */
router.post('/generar', async (req, res) => {
  const hoyHasta = new Date(typeof req.body?.hoyHasta === 'string' ? req.body.hoyHasta : NaN);
  if (Number.isNaN(hoyHasta.getTime())) {
    return res.status(400).json({ message: 'Indicá "hoyHasta" (fin del día de hoy, ISO 8601).' });
  }
  return res.json({ creadas: await generarTareas({ hoyHasta }) });
});

/** GET /api/tareas[?hechas=true][&profesionalId=...] */
router.get('/', async (req, res) => {
  const { hechas, profesionalId } = req.query;
  const tareas = await listTareas({
    hechas: hechas === 'true',
    profesionalId: typeof profesionalId === 'string' && profesionalId ? profesionalId : undefined,
  });
  return res.json({ tareas });
});

/** PATCH /api/tareas/:id/completar — "Marcar lista". */
router.patch('/:id/completar', async (req, res) => {
  const tarea = await completarTarea(req.params.id, req.user.id);
  if (!tarea) return res.status(404).json({ message: 'La tarea no existe.' });
  return res.json({ tarea });
});

/** PATCH /api/tareas/:id/reabrir — "Volver a pendiente" (solo si se marcó lista a mano). */
router.patch('/:id/reabrir', async (req, res) => {
  const resultado = await reabrirTarea(req.params.id);
  if (!resultado) return res.status(404).json({ message: 'La tarea no existe.' });
  if (resultado.error) return res.status(409).json({ message: resultado.error });
  return res.json({ tarea: resultado.tarea });
});

module.exports = router;
