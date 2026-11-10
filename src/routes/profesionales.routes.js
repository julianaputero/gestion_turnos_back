const { Router } = require('express');
const { listProfesionales } = require('../data/profesionales.repository');

const router = Router();

router.get('/', async (_req, res) => {
  res.json({ profesionales: await listProfesionales() });
});

module.exports = router;
