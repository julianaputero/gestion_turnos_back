const express = require('express');
const cors = require('cors');
const { CORS_ORIGIN } = require('./constants/server.constants');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.use('/api/auth', authRoutes);

module.exports = app;
