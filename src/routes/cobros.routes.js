const { randomUUID } = require('node:crypto');
const { Router } = require('express');
const {
  listCobros,
  findTurnoConPago,
  createPago,
  findPago,
  deletePago,
  setComprobante,
} = require('../data/cobros.repository');
const storage = require('../storage');
const { recibirComprobante } = require('../middleware/upload');
const {
  CARPETA_COMPROBANTES,
  COMPROBANTE_TIPOS,
} = require('../constants/archivos.constants');
const {
  MEDIOS_PAGO,
  PAGO_REFERENCIA_MAX,
  PAGO_MONTO_MAX,
  COBROS_MAX_RANGE_DAYS,
} = require('../constants/cobros.constants');
const { requireGestion } = require('../middleware/auth');

const router = Router();
const DAY_MS = 24 * 60 * 60 * 1000;
/** Fecha de pago: `YYYY-MM-DD`. */
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Cobros: solo Gestión.
router.use(requireGestion);

function parseDate(value) {
  const date = new Date(typeof value === 'string' ? value : NaN);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Valida el body del pago. Devuelve `{ data }` o `{ error }`. */
function parsePago(body) {
  const { monto, medio, referencia, fechaPago } = body ?? {};

  if (typeof monto !== 'number' || !Number.isFinite(monto) || monto <= 0 || monto > PAGO_MONTO_MAX) {
    return { error: 'Indicá un monto válido, mayor a cero.' };
  }
  if (!Object.values(MEDIOS_PAGO).includes(medio)) {
    return { error: 'Elegí el medio de pago.' };
  }
  if (referencia !== undefined && referencia !== null && typeof referencia !== 'string') {
    return { error: 'La referencia no es válida.' };
  }
  const ref = referencia?.trim() || null;
  if (ref && ref.length > PAGO_REFERENCIA_MAX) {
    return { error: `La referencia no puede superar ${PAGO_REFERENCIA_MAX} caracteres.` };
  }
  const fecha = typeof fechaPago === 'string' && FECHA_REGEX.test(fechaPago) ? parseDate(fechaPago) : null;
  if (!fecha) {
    return { error: 'Indicá la fecha del pago.' };
  }

  return { data: { monto: Math.round(monto * 100) / 100, medio, referencia: ref, fechaPago: fecha } };
}

/** GET /api/cobros?desde=ISO&hasta=ISO — turnos ya atendidos en el rango, por profesional. */
router.get('/', async (req, res) => {
  const desde = parseDate(req.query.desde);
  const hasta = parseDate(req.query.hasta);
  if (!desde || !hasta || hasta <= desde) {
    return res
      .status(400)
      .json({ message: 'Indicá un rango válido con "desde" y "hasta" (ISO 8601).' });
  }
  if (hasta - desde > COBROS_MAX_RANGE_DAYS * DAY_MS) {
    return res
      .status(400)
      .json({ message: `El rango no puede superar ${COBROS_MAX_RANGE_DAYS} días.` });
  }

  return res.json({ profesionales: await listCobros({ desde, hasta }) });
});

/**
 * POST /api/cobros/:turnoId/pago — registra el pago del turno.
 * Body: { monto, medio, referencia?, fechaPago: "YYYY-MM-DD" }
 */
router.post('/:turnoId/pago', async (req, res) => {
  const { data, error } = parsePago(req.body);
  if (error) return res.status(400).json({ message: error });

  const turno = await findTurnoConPago(req.params.turnoId);
  if (!turno) return res.status(404).json({ message: 'El turno no existe.' });
  if (turno.pago) return res.status(409).json({ message: 'Este turno ya tiene un pago cargado.' });

  const pago = await createPago({ turnoId: turno.id, ...data });
  return res.status(201).json({ pago });
});

/** DELETE /api/cobros/:turnoId/pago — anula el pago (y borra su comprobante, si tenía). */
router.delete('/:turnoId/pago', async (req, res) => {
  const borrado = await deletePago(req.params.turnoId);
  if (!borrado) {
    return res.status(404).json({ message: 'Ese turno no tiene un pago cargado.' });
  }
  if (borrado.comprobanteKey) await storage.borrar(borrado.comprobanteKey);
  return res.status(204).end();
});

const SIN_PAGO = 'Primero cargá el pago del turno.';

/**
 * PUT /api/cobros/:turnoId/comprobante — adjunta (o reemplaza) el archivo del comprobante.
 * multipart/form-data con el campo `archivo` (JPG, PNG, WebP o PDF, hasta 5 MB). → { pago }
 */
router.put('/:turnoId/comprobante', recibirComprobante, async (req, res) => {
  const pago = await findPago(req.params.turnoId);
  if (!pago) return res.status(404).json({ message: SIN_PAGO });

  const { originalname, mimetype, size, buffer } = req.file;
  const key = `${CARPETA_COMPROBANTES}/${randomUUID()}.${COMPROBANTE_TIPOS[mimetype].extension}`;
  await storage.guardar(key, buffer);

  const actualizado = await setComprobante(req.params.turnoId, {
    key,
    nombre: originalname,
    tipo: mimetype,
    bytes: size,
  });
  if (pago.comprobanteKey) await storage.borrar(pago.comprobanteKey);

  return res.json({ pago: actualizado });
});

/** GET /api/cobros/:turnoId/comprobante — descarga el archivo del comprobante. */
router.get('/:turnoId/comprobante', async (req, res) => {
  const pago = await findPago(req.params.turnoId);
  const contenido = pago?.comprobanteKey ? await storage.leer(pago.comprobanteKey) : null;
  if (!contenido) {
    return res.status(404).json({ message: 'Este pago no tiene comprobante adjunto.' });
  }

  res.set({
    'Content-Type': pago.comprobanteTipo,
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(pago.comprobanteNombre)}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  });
  return res.send(contenido);
});

/** DELETE /api/cobros/:turnoId/comprobante — quita el archivo (el pago sigue registrado). */
router.delete('/:turnoId/comprobante', async (req, res) => {
  const pago = await findPago(req.params.turnoId);
  if (!pago) return res.status(404).json({ message: SIN_PAGO });
  if (!pago.comprobanteKey) {
    return res.status(404).json({ message: 'Este pago no tiene comprobante adjunto.' });
  }

  const actualizado = await setComprobante(req.params.turnoId, null);
  await storage.borrar(pago.comprobanteKey);
  return res.json({ pago: actualizado });
});

module.exports = router;
