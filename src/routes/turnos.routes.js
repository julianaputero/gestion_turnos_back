const { Router } = require('express');
const {
  listTurnos,
  findTurnoById,
  findOverlappingTurno,
  findProximoTurno,
  createTurno,
  updateHorario,
  deleteTurno,
} = require('../data/turnos.repository');
const { findPacienteById, isProfesionalAsignado } = require('../data/pacientes.repository');
const { findProfesionalById } = require('../data/profesionales.repository');
const { TURNOS_MAX_RANGE_DAYS } = require('../constants/turnos.constants');

const { requireGestion, profesionalVisible } = require('../middleware/auth');
const router = Router();
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value) {
  const date = new Date(typeof value === 'string' ? value : NaN);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatHora(date) {
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const HORARIO_INVALIDO = 'Indicá un horario válido: el fin tiene que ser posterior al inicio.';

/**
 * Mensaje de error si el horario choca con otro turno; si no, null. Choca si:
 * - el profesional ya tiene otro turno en ese horario, o
 * - el paciente ya tiene otro turno en ese horario (con cualquier profesional).
 */
async function overlapMessage({ profesionalId, pacienteId, inicio, fin, excludeId }) {
  const choqueProfesional = await findOverlappingTurno({ profesionalId, inicio, fin, excludeId });
  if (choqueProfesional) {
    const { paciente } = choqueProfesional;
    return `Se superpone con el turno de ${paciente.nombre} ${paciente.apellido} (${formatHora(choqueProfesional.inicio)} – ${formatHora(choqueProfesional.fin)}).`;
  }

  const choquePaciente = await findOverlappingTurno({ pacienteId, inicio, fin, excludeId });
  if (choquePaciente) {
    const { paciente, profesional } = choquePaciente;
    return `${paciente.nombre} ${paciente.apellido} ya tiene un turno con ${profesional.nombre} en ese horario (${formatHora(choquePaciente.inicio)} – ${formatHora(choquePaciente.fin)}).`;
  }

  return null;
}

/** GET /api/turnos?desde=ISO&hasta=ISO[&profesionalId=...] */
router.get('/', async (req, res) => {
  const desde = parseDate(req.query.desde);
  const hasta = parseDate(req.query.hasta);
  const { profesionalId } = req.query;

  if (!desde || !hasta || hasta <= desde) {
    return res
      .status(400)
      .json({ message: 'Indicá un rango válido con "desde" y "hasta" (ISO 8601).' });
  }

  if (hasta - desde > TURNOS_MAX_RANGE_DAYS * DAY_MS) {
    return res
      .status(400)
      .json({ message: `El rango no puede superar ${TURNOS_MAX_RANGE_DAYS} días.` });
  }

  const turnos = await listTurnos({
    desde,
    hasta,
    profesionalId: profesionalVisible(req, profesionalId),
  });

  return res.json({ turnos });
});

/** GET /api/turnos/proximo?pacienteId=...&profesionalId=... — { turno } o { turno: null }. */
router.get('/proximo', requireGestion, async (req, res) => {
  const { pacienteId, profesionalId } = req.query;
  if (typeof pacienteId !== 'string' || typeof profesionalId !== 'string') {
    return res.status(400).json({ message: 'Indicá el paciente y el profesional.' });
  }
  return res.json({ turno: await findProximoTurno({ pacienteId, profesionalId }) });
});

/** POST /api/turnos — Body: { pacienteId, profesionalId, inicio: ISO, fin: ISO, notas? } */
router.post('/', requireGestion, async (req, res) => {
  const { pacienteId, profesionalId, notas } = req.body ?? {};
  const inicio = parseDate(req.body?.inicio);
  const fin = parseDate(req.body?.fin);

  if (typeof pacienteId !== 'string' || typeof profesionalId !== 'string') {
    return res.status(400).json({ message: 'Elegí un paciente y un profesional.' });
  }
  if (!inicio || !fin || fin <= inicio) {
    return res.status(400).json({ message: HORARIO_INVALIDO });
  }
  const paciente = await findPacienteById(pacienteId);
  if (!paciente) {
    return res.status(400).json({ message: 'El paciente no existe.' });
  }
  if (!paciente.activo) {
    return res
      .status(400)
      .json({ message: 'El paciente está inactivo. Reactivalo para darle turnos nuevos.' });
  }
  if (!(await findProfesionalById(profesionalId))) {
    return res.status(400).json({ message: 'El profesional no existe.' });
  }
  if (!(await isProfesionalAsignado(pacienteId, profesionalId))) {
    return res.status(400).json({
      message: 'El paciente no está asignado a ese profesional. Asignáselo desde Pacientes.',
    });
  }

  const choque = await overlapMessage({ profesionalId, pacienteId, inicio, fin });
  if (choque) {
    return res.status(409).json({ message: choque });
  }

  const turno = await createTurno({
    pacienteId,
    profesionalId,
    inicio,
    fin,
    notas: typeof notas === 'string' && notas.trim() ? notas.trim() : null,
  });
  return res.status(201).json({ turno });
});

/** PATCH /api/turnos/:id — cambia el horario. Body: { inicio: ISO, fin: ISO } */
router.patch('/:id', requireGestion, async (req, res) => {
  const inicio = parseDate(req.body?.inicio);
  const fin = parseDate(req.body?.fin);

  if (!inicio || !fin || fin <= inicio) {
    return res.status(400).json({ message: HORARIO_INVALIDO });
  }

  const turno = await findTurnoById(req.params.id);
  if (!turno) {
    return res.status(404).json({ message: 'El turno no existe.' });
  }

  const choque = await overlapMessage({
    profesionalId: turno.profesionalId,
    pacienteId: turno.pacienteId,
    inicio,
    fin,
    excludeId: turno.id,
  });
  if (choque) {
    return res.status(409).json({ message: choque });
  }

  return res.json({ turno: await updateHorario(turno.id, { inicio, fin }) });
});

/** DELETE /api/turnos/:id */
router.delete('/:id', requireGestion, async (req, res) => {
  const turno = await findTurnoById(req.params.id);
  if (!turno) {
    return res.status(404).json({ message: 'El turno no existe.' });
  }

  await deleteTurno(turno.id);
  return res.status(204).end();
});

module.exports = router;
