const { Router } = require('express');
const { verifyCredentials } = require('../data/users.repository');
const { signToken } = require('../middleware/auth');

/**
 * Solo login. No hay registro público: las cuentas de profesionales las crea Gestión
 * con `POST /api/profesionales`, y las de Gestión se crean con `npm run db:seed`.
 */
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

module.exports = router;
