const { Router } = require('express');
const { listPlantillas, savePlantilla, createMensaje } = require('../data/mensajes.repository');
const { findPacienteById, isProfesionalAsignado } = require('../data/pacientes.repository');
const { findTurnoById } = require('../data/turnos.repository');
const { TIPOS_MENSAJE, MENSAJE_MAX } = require('../constants/mensajes.constants');
const { requireGestion } = require('../middleware/auth');
const { TONOS_COMUNICACION } = require('../constants/profesionales.constants');

const router = Router();

// Mensajes y plantillas: solo Gestión.
router.use(requireGestion);

const isTipo = (tipo) => Object.values(TIPOS_MENSAJE).includes(tipo);

/** Contenido recortado si es válido; si no, `{ error }`. */
function parseContenido(contenido) {
  const texto = typeof contenido === 'string' ? contenido.trim() : '';
  if (!texto) return { error: 'Escribí el mensaje.' };
  if (texto.length > MENSAJE_MAX) {
    return { error: `El mensaje no puede superar ${MENSAJE_MAX} caracteres.` };
  }
  return { texto };
}

/** GET /api/mensajes/plantillas — una plantilla por tipo y tono. */
router.get('/plantillas', async (_req, res) => {
  res.json({ plantillas: await listPlantillas() });
});

/** PUT /api/mensajes/plantillas/:tipo/:tono — Body: { contenido } (con marcadores). */
router.put('/plantillas/:tipo/:tono', async (req, res) => {
  const { tipo, tono } = req.params;
  if (!isTipo(tipo) || !Object.values(TONOS_COMUNICACION).includes(tono)) {
    return res.status(400).json({ message: 'El tipo o el tono de la plantilla no es válido.' });
  }

  const { texto, error } = parseContenido(req.body?.contenido);
  if (error) return res.status(400).json({ message: error });

  return res.json({ plantilla: await savePlantilla({ tipo, tono, contenido: texto }) });
});

/**
 * POST /api/mensajes — registra un mensaje como enviado.
 * Body: { pacienteId, profesionalId, tipo, contenido, turnoId? }
 * `turnoId` asocia el mensaje a un turno (ej. "recordatorio enviado" de ese turno).
 */
router.post('/', async (req, res) => {
  const { pacienteId, profesionalId, tipo, contenido, turnoId } = req.body ?? {};
  if (typeof pacienteId !== 'string' || typeof profesionalId !== 'string' || !isTipo(tipo)) {
    return res.status(400).json({ message: 'Faltan el paciente, el profesional o el tipo.' });
  }

  const { texto, error } = parseContenido(contenido);
  if (error) return res.status(400).json({ message: error });

  if (!(await findPacienteById(pacienteId))) {
    return res.status(404).json({ message: 'El paciente no existe.' });
  }
  if (!(await isProfesionalAsignado(pacienteId, profesionalId))) {
    return res.status(400).json({ message: 'El paciente no está asignado a ese profesional.' });
  }

  if (turnoId !== undefined && turnoId !== null) {
    const turno = typeof turnoId === 'string' ? await findTurnoById(turnoId) : null;
    if (!turno || turno.paciente.id !== pacienteId || turno.profesionalId !== profesionalId) {
      return res.status(400).json({ message: 'El turno no corresponde a ese paciente y profesional.' });
    }
  }

  const mensaje = await createMensaje({
    pacienteId,
    profesionalId,
    tipo,
    contenido: texto,
    turnoId: turnoId ?? null,
  });
  return res.status(201).json({ mensaje });
});

module.exports = router;
