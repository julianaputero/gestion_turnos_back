const express = require('express');
const cors = require('cors');
const { CORS_ORIGIN } = require('./constants/server.constants');
const authRoutes = require('./routes/auth.routes');
const profesionalesRoutes = require('./routes/profesionales.routes');
const turnosRoutes = require('./routes/turnos.routes');
const pacientesRoutes = require('./routes/pacientes.routes');

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profesionales', profesionalesRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/pacientes', pacientesRoutes);

module.exports = app;
