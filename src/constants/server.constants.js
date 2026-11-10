const SERVER_PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';

module.exports = { SERVER_PORT, CORS_ORIGIN };
