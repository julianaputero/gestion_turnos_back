require('./src/config/env');

const app = require('./src/app');
const { SERVER_PORT } = require('./src/constants/server.constants');

app.listen(SERVER_PORT, () => {
  console.log(`Backend escuchando en http://localhost:${SERVER_PORT}`);
});
