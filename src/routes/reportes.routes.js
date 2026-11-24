const { Router } = require('express');
const { getReporteMensual } = require('../data/reportes.repository');
const { profesionalVisible } = require('../middleware/auth');
const { REPORTE_MAX_RANGE_DAYS } = require('../constants/reportes.constants');

const router = Router();
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value) {
  const date = new Date(typeof value === 'string' ? value : NaN);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * GET /api/reportes/mensual?profesionalId=&desde=ISO&hasta=ISO
 * Turnos del mes con su estado de cobro y el resumen. El rango del mes lo manda el
 * front-end en su zona horaria. Gestión elige el profesional; un Profesional solo puede
 * ver el suyo (se ignora el que pida).
 */
router.get('/mensual', async (req, res) => {
  const profesionalId = profesionalVisible(req, req.query.profesionalId);
  if (!profesionalId) {
    return res.status(400).json({ message: 'Elegí un profesional.' });
  }

  const desde = parseDate(req.query.desde);
  const hasta = parseDate(req.query.hasta);
  if (!desde || !hasta || hasta <= desde) {
    return res
      .status(400)
      .json({ message: 'Indicá un rango válido con "desde" y "hasta" (ISO 8601).' });
  }
  if (hasta - desde > REPORTE_MAX_RANGE_DAYS * DAY_MS) {
    return res
      .status(400)
      .json({ message: `El rango no puede superar ${REPORTE_MAX_RANGE_DAYS} días.` });
  }

  const reporte = await getReporteMensual(profesionalId, { desde, hasta });
  if (!reporte) return res.status(404).json({ message: 'El profesional no existe.' });
  return res.json(reporte);
});

module.exports = router;
