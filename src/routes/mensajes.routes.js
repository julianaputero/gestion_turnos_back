const { Router } = require('express');
const {
  listPlantillas,
  savePlantilla,
  deletePlantilla,
  createMensaje,
} = require('../data/mensajes.repository');
const { findPacienteById, isProfesionalAsignado } = require('../data/pacientes.repository');
const { findTurnoById } = require('../data/turnos.repository');
const { TIPOS_MENSAJE, MENSAJE_MAX } = require('../constants/mensajes.constants');
const { requireGestion } = require('../middleware/auth');
const { findProfesionalById } = require('../data/profesionales.repository');

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

/** `{ status, message }` si el profesional o el tipo no son válidos; si no, null. */
async function plantillaInvalida(profesionalId, tipo) {
  if (tipo !== undefined && !isTipo(tipo)) {
    return { status: 400, message: 'El tipo de plantilla no es válido.' };
  }
  if (typeof profesionalId !== 'string' || !(await findProfesionalById(profesionalId))) {
    return { status: 404, message: 'El profesional no existe.' };
  }
  return null;
}

/** GET /api/mensajes/plantillas?profesionalId=… — las 3 plantillas de ese profesional. */
router.get('/plantillas', async (req, res) => {
  const { profesionalId } = req.query;
  const invalida = await plantillaInvalida(profesionalId);
  if (invalida) return res.status(invalida.status).json({ message: invalida.message });

  return res.json({ plantillas: await listPlantillas(profesionalId) });
});

/** PUT /api/mensajes/plantillas/:profesionalId/:tipo — Body: { contenido } (con marcadores). */
router.put('/plantillas/:profesionalId/:tipo', async (req, res) => {
  const { profesionalId, tipo } = req.params;
  const invalida = await plantillaInvalida(profesionalId, tipo);
  if (invalida) return res.status(invalida.status).json({ message: invalida.message });

  const { texto, error } = parseContenido(req.body?.contenido);
  if (error) return res.status(400).json({ message: error });

  return res.json({ plantilla: await savePlantilla({ profesionalId, tipo, contenido: texto }) });
});

/** DELETE /api/mensajes/plantillas/:profesionalId/:tipo — vuelve a la plantilla por defecto. */
router.delete('/plantillas/:profesionalId/:tipo', async (req, res) => {
  const { profesionalId, tipo } = req.params;
  const invalida = await plantillaInvalida(profesionalId, tipo);
  if (invalida) return res.status(invalida.status).json({ message: invalida.message });

  return res.json({ plantilla: await deletePlantilla({ profesionalId, tipo }) });
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
