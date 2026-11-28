const jwt = require('jsonwebtoken');
const {
  JWT_SECRET,
  TOKEN_EXPIRES_IN,
  VER_COMO_HEADER,
  METODOS_LECTURA,
} = require('../constants/auth.constants');
const { findById } = require('../data/users.repository');
const { USER_ROLES } = require('../constants/roles.constants');

if (!JWT_SECRET) {
  throw new Error('Falta la variable de entorno JWT_SECRET (ver .env.example).');
}

const BEARER = 'Bearer ';

/** Token firmado con el id del usuario. `recordarme` lo hace durar más. */
function signToken(user, recordarme = false) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, {
    expiresIn: recordarme ? TOKEN_EXPIRES_IN.recordarme : TOKEN_EXPIRES_IN.sesion,
  });
}

/**
 * Exige un token válido en `Authorization: Bearer <token>`. Deja el usuario en `req.user`
 * ({ id, nombre, email, role }), leído de la base: si se borró o cambió de rol, vale lo actual.
 *
 * "Ver como profesional": si un usuario Gestión manda el header `x-ver-como: <id>`, el
 * pedido se atiende como si lo hiciera ese profesional (`req.user` pasa a ser él, y
 * `req.realUser` queda con el de Gestión). Así aplican solas todas las reglas del rol
 * Profesional (solo lo suyo). Es **solo lectura**: con ese header, cualquier pedido que no
 * sea GET/HEAD se rechaza con 403.
 */
async function requireAuth(req, res, next) {
  const header = req.get('authorization') ?? '';
  if (!header.startsWith(BEARER)) {
    return res.status(401).json({ message: 'Iniciá sesión para continuar.' });
  }

  let payload;
  try {
    payload = jwt.verify(header.slice(BEARER.length), JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Tu sesión venció. Volvé a iniciar sesión.' });
  }

  const user = typeof payload.sub === 'string' ? await findById(payload.sub) : null;
  if (!user) {
    return res.status(401).json({ message: 'Tu sesión ya no es válida. Volvé a iniciar sesión.' });
  }

  const verComo = req.get(VER_COMO_HEADER);
  if (verComo) {
    if (user.role !== USER_ROLES.gestion) {
      return res.status(403).json({ message: 'No tenés permiso para hacer esto.' });
    }
    if (!METODOS_LECTURA.includes(req.method)) {
      return res.status(403).json({
        message: 'Estás viendo la app como un profesional: es solo lectura.',
      });
    }
    const profesional = await findById(verComo);
    if (!profesional || profesional.role !== USER_ROLES.profesional) {
      return res.status(404).json({ message: 'El profesional no existe.' });
    }
    req.realUser = user;
    req.user = profesional;
    return next();
  }

  req.user = user;
  return next();
}

/** Solo deja pasar a los usuarios con alguno de estos roles (usar después de `requireAuth`). */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'No tenés permiso para hacer esto.' });
    }
    return next();
  };
}

/** Atajo: solo usuarios Gestión (altas, bajas, modificaciones y datos de todos). */
const requireGestion = requireRole(USER_ROLES.gestion);

/**
 * Filtro de profesional para las lecturas: un Profesional solo ve lo suyo, sin importar
 * qué pida; Gestión ve lo que pida (`pedido`, o todos si no pide ninguno).
 */
function profesionalVisible(req, pedido) {
  if (req.user.role === USER_ROLES.profesional) return req.user.id;
  return typeof pedido === 'string' && pedido ? pedido : undefined;
}

module.exports = { signToken, requireAuth, requireRole, requireGestion, profesionalVisible };
