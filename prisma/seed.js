/**
 * Carga los usuarios iniciales en la base. Los datos salen de variables de
 * entorno (ver .env.example) — nada de nombres ni contraseñas en el código.
 * Se puede correr varias veces: si el email ya existe, no lo duplica.
 *
 *   npm run db:seed
 */
require('../src/config/env');
const prisma = require('../src/data/prisma');
const { createUser, findByEmail } = require('../src/data/users.repository');
const { USER_ROLES } = require('../src/constants/roles.constants');

/** Un usuario por rol; cada uno se crea solo si sus 3 variables están definidas. */
const SEED_USERS = [
  { role: USER_ROLES.gestion, prefix: 'SEED_GESTION' },
  { role: USER_ROLES.profesional, prefix: 'SEED_PROFESIONAL' },
];

async function main() {
  for (const { role, prefix } of SEED_USERS) {
    const nombre = process.env[`${prefix}_NOMBRE`];
    const email = process.env[`${prefix}_EMAIL`];
    const password = process.env[`${prefix}_PASSWORD`];

    if (!nombre || !email || !password) {
      console.log(`[seed] ${role}: faltan ${prefix}_NOMBRE/EMAIL/PASSWORD, se omite.`);
      continue;
    }

    if (await findByEmail(email)) {
      console.log(`[seed] ${role}: ${email} ya existe, se omite.`);
      continue;
    }

    await createUser({ nombre, email, password, role });
    console.log(`[seed] ${role}: creado ${email}.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
