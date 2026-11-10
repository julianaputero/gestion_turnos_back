const { Router } = require('express');
const { listPacientes } = require('../data/pacientes.repository');

const router = Router();

router.get('/', async (_req, res) => {
  res.json({ pacientes: await listPacientes() });
});

module.exports = router;
