const { Router } = require('express');
const { findByEmail, verifyCredentials, addProfesional } = require('../data/users.repository');
const { PASSWORD_MIN_LENGTH } = require('../constants/auth.constants');

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = await verifyCredentials(email, password);

  if (!user) {
    return res.status(401).json({ message: 'Email o contraseña incorrectos' });
  }

  return res.json({ user });
});

router.post('/register', async (req, res) => {
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
    return res.status(409).json({ message: 'Ya existe una cuenta con ese email' });
  }

  const user = await addProfesional({ nombre: nombre.trim(), email, password });
  return res.status(201).json({ user });
});

module.exports = router;
