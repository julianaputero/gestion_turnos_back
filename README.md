# TurnosPro — Back-end

API REST de **TurnosPro**, el sistema de gestión de turnos para profesionales de la salud. La consume el front-end Angular de `../front-end`.

**Stack:** Node.js + Express 5 (JavaScript, CommonJS) · PostgreSQL · Prisma 6 · bcryptjs.

---

## Requisitos

- **Node.js ≥ 20.19** (en esta máquina, vía nvm: `nvm use v20.19.4`).
- **PostgreSQL** corriendo localmente (puerto 5432 por defecto).

## Instalación (primera vez)

```bash
cd back-end
source ~/.nvm/nvm.sh && nvm use v20.19.4
export NODE_OPTIONS="--no-network-family-autoselection"   # solo en esta máquina, ver "Problemas comunes"

npm install            # también genera el cliente de Prisma (postinstall)
cp .env.example .env   # y completar los valores (ver "Configuración")
npm run db:migrate     # crea las tablas en la base
npm run db:seed        # crea los usuarios iniciales definidos en .env
```

La base de datos indicada en `DATABASE_URL` tiene que existir antes de migrar. Se puede crear desde pgAdmin o con `createdb`.

## Levantar el servidor

```bash
cd back-end
source ~/.nvm/nvm.sh && nvm use v20.19.4
npm run dev
```

Queda escuchando en `http://localhost:3000`. Para probar la app completa, levantar también el front-end (`npm start` en `../front-end`, puerto 4200).

## Configuración

Todo se configura con variables de entorno en `back-end/.env`. Ese archivo **no se versiona**; la plantilla es [`.env.example`](.env.example).

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión a PostgreSQL: `postgresql://USUARIO:PASSWORD@localhost:5432/gestion_turnos?schema=public` |
| `PORT` | No | Puerto del servidor. Por defecto `3000`. |
| `CORS_ORIGIN` | No | Origen permitido para el front-end. Por defecto `http://localhost:4200`. |
| `SEED_GESTION_NOMBRE` / `_EMAIL` / `_PASSWORD` | No | Cuenta de Gestión que crea `npm run db:seed`. |
| `SEED_PROFESIONAL_NOMBRE` / `_EMAIL` / `_PASSWORD` | No | Cuenta de Profesional de prueba que crea `npm run db:seed`. |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el servidor y lo reinicia al guardar cambios. |
| `npm start` | Levanta el servidor sin reinicio automático. |
| `npm run db:migrate` | `prisma migrate dev`: aplica las migraciones pendientes y, si cambió el esquema, crea una nueva. |
| `npm run db:deploy` | `prisma migrate deploy`: aplica migraciones pendientes sin crear nuevas (para producción). |
| `npm run db:seed` | Crea los usuarios iniciales del `.env`. Se puede correr varias veces: no duplica emails existentes. |
| `npm run db:studio` | Abre Prisma Studio, un visor web de los datos. |

## Base de datos y migraciones

El esquema vive en [`prisma/schema.prisma`](prisma/schema.prisma) y cada cambio queda registrado como una migración en `prisma/migrations/`.

**Cuándo migrar:**
- **Cambiaste el esquema** (tablas o columnas nuevas): `npx prisma migrate dev --name descripcion_del_cambio`.
- **Base nueva o vacía**, o bajaste código con migraciones nuevas: `npm run db:migrate`.
- **Para levantar el servidor no hace falta.**

**Reglas:**
- No modificar tablas a mano desde pgAdmin ni editar migraciones que ya se aplicaron. Todo cambio de estructura pasa por `schema.prisma` + una migración nueva.
- Si `migrate dev` ofrece **resetear la base**, eso borra todos los datos. Cancelar y revisar antes de aceptar.

### Tablas actuales

**`users`**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID (texto) | Clave primaria, se genera automáticamente. |
| `nombre` | texto | |
| `email` | texto, único | Se guarda siempre en minúsculas. |
| `password_hash` | texto | Hash bcrypt. Nunca se guarda ni se devuelve la contraseña en texto plano. |
| `role` | enum `Role` | `gestion` o `profesional`. |
| `created_at`, `updated_at` | timestamp | Automáticos. |

## Usuarios y roles

Hay dos roles, definidos en [`src/constants/roles.constants.js`](src/constants/roles.constants.js). Tienen que coincidir con los del front-end y con el enum `Role` de Prisma.

- **`profesional`**: se registra solo desde la web (`/registro`). El back-end **siempre** le asigna este rol, aunque el cliente mande otro.
- **`gestion`**: **no tiene registro público.** Las cuentas las crea quien administra el sistema:
  1. Completar `SEED_GESTION_NOMBRE`, `SEED_GESTION_EMAIL` y `SEED_GESTION_PASSWORD` en `.env`.
  2. Correr `npm run db:seed`.

  No crear usuarios insertando filas a mano en la base: la contraseña tiene que guardarse hasheada, si no el login falla.

## API

Base: `http://localhost:3000/api`. Todas las requests y respuestas son JSON. Las respuestas exitosas devuelven `{ user: {...} }`; los errores devuelven `{ message: '...' }`.

### `POST /api/auth/login`

```json
{ "email": "usuario@ejemplo.com", "password": "secreto" }
```

| Código | Respuesta |
|---|---|
| 200 | `{ "user": { "id", "nombre", "email", "role" } }` |
| 401 | Email o contraseña incorrectos. |

### `POST /api/auth/register`

Crea una cuenta con rol `profesional` e ignora cualquier `role` que mande el cliente.

```json
{ "nombre": "Dra. Ana López", "email": "ana@ejemplo.com", "password": "secreto" }
```

| Código | Respuesta |
|---|---|
| 201 | `{ "user": { "id", "nombre", "email", "role": "profesional" } }` |
| 400 | Falta el nombre, el email no es válido o la contraseña tiene menos de 6 caracteres. |
| 409 | Ya existe una cuenta con ese email (sin importar mayúsculas). |

Por ahora no hay tokens ni sesiones del lado del servidor: el front-end guarda el usuario devuelto por login/registro.

## Estructura

```
back-end/
├── index.js                     # Punto de entrada: carga .env y levanta el servidor
├── prisma/
│   ├── schema.prisma            # Modelo de datos
│   ├── migrations/              # Historial de migraciones (versionado)
│   └── seed.js                  # Usuarios iniciales desde variables SEED_*
└── src/
    ├── app.js                   # Express: CORS, JSON y rutas
    ├── config/env.js            # Carga de .env (dotenv)
    ├── constants/               # Valores fijos: roles, servidor, auth
    ├── data/
    │   ├── prisma.js            # Cliente único de Prisma
    │   └── users.repository.js  # Acceso a la tabla users
    └── routes/
        └── auth.routes.js       # /api/auth/login y /api/auth/register
```

## Convenciones

- **Nada hardcodeado.** Los valores fijos reutilizables (roles, puertos, reglas de contraseña, etc.) van en `src/constants/`. La configuración por entorno y los datos sensibles van en `.env`.
- **Acceso a datos solo desde `src/data/`.** Las rutas no usan Prisma directamente: llaman a funciones del repositorio correspondiente.
- **Nunca devolver `passwordHash`** ni otros datos sensibles en las respuestas.

## Problemas comunes

- **`npm install` o `npx` falla con `ETIMEDOUT` o un `ERESOLVE` raro:** en esta máquina el IPv6 no funciona. Antes de correr npm, ejecutar `export NODE_OPTIONS="--no-network-family-autoselection"`.
- **Errores de versión de Node:** el Node por defecto de nvm (v20.15) es viejo. Correr `nvm use v20.19.4`.
- **`password authentication failed`** al levantar o migrar: revisar usuario y contraseña en `DATABASE_URL` del `.env`. Son los de PostgreSQL, no los de la computadora.
- **`Can't reach database server`:** PostgreSQL no está corriendo. Revisar con `pg_isready`.
