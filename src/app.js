const express = require('express');
const cors = require('cors');
const { CORS_ORIGIN } = require('./constants/server.constants');
const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth.routes');
const profesionalesRoutes = require('./routes/profesionales.routes');
const turnosRoutes = require('./routes/turnos.routes');
const pacientesRoutes = require('./routes/pacientes.routes');
const mensajesRoutes = require('./routes/mensajes.routes');
const cobrosRoutes = require('./routes/cobros.routes');

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.use('/api/auth', authRoutes);
// Todo lo que no es login/registro exige sesión. Los permisos por rol están en cada ruta.
app.use('/api/profesionales', requireAuth, profesionalesRoutes);
app.use('/api/turnos', requireAuth, turnosRoutes);
app.use('/api/pacientes', requireAuth, pacientesRoutes);
app.use('/api/mensajes', requireAuth, mensajesRoutes);
app.use('/api/cobros', requireAuth, cobrosRoutes);

module.exports = app;
