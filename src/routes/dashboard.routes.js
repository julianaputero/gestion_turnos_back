const { Router } = require('express');
const { getDashboardProfesional } = require('../data/dashboard.repository');
const { requireGestion } = require('../middleware/auth');

const router = Router();

// Dashboard por profesional: solo Gestión.
router.use(requireGestion);

function parseDate(value) {
  const date = new Date(typeof value === 'string' ? value : NaN);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * GET /api/dashboard/profesionales/:id?mesDesde=ISO&mesHasta=ISO&hoyDesde=ISO&hoyHasta=ISO
 * Los rangos los manda el front-end en su zona horaria (mes en curso y día de hoy; el día
 * define desde cuándo y como mínimo hasta cuándo se listan los recordatorios).
 */
router.get('/profesionales/:id', async (req, res) => {
  const rangos = {};
  for (const campo of ['mesDesde', 'mesHasta', 'hoyDesde', 'hoyHasta']) {
    rangos[campo] = parseDate(req.query[campo]);
  }
  if (
    Object.values(rangos).some((fecha) => !fecha) ||
    rangos.mesHasta <= rangos.mesDesde ||
    rangos.hoyHasta <= rangos.hoyDesde
  ) {
    return res.status(400).json({ message: 'Indicá rangos válidos para el mes y el día.' });
  }

  const dashboard = await getDashboardProfesional(req.params.id, rangos);
  if (!dashboard) return res.status(404).json({ message: 'El profesional no existe.' });
  return res.json(dashboard);
});

module.exports = router;
