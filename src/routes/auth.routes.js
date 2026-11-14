const { Router } = require('express');
const { findByEmail, verifyCredentials, addProfesional } = require('../data/users.repository');
const { PASSWORD_MIN_LENGTH } = require('../constants/auth.constants');
const { signToken } = require('../middleware/auth');

const router = Router();

/** POST /api/auth/login — Body: { email, password, recordarme? } → { user, token } */
router.post('/login', async (req, res) => {
  const { email, password, recordarme } = req.body ?? {};
  const user = await verifyCredentials(email, password);

  if (!user) {
    return res.status(401).json({ message: 'Email o contraseña incorrectos' });
  }

  return res.json({ user, token: signToken(user, recordarme === true) });
});

/** POST /api/auth/register — Body: { nombre, email, password, recordarme? } → { user, token } */
router.post('/register', async (req, res) => {
  const { nombre, email, password, recordarme } = req.body ?? {};

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
  return res.status(201).json({ user, token: signToken(user, recordarme === true) });
});

module.exports = router;
