FROM node:22-bookworm-slim

# Prisma necesita OpenSSL para su motor de consultas.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# El schema va antes del `npm ci` porque el postinstall corre `prisma generate`.
# --include=dev: el CLI de Prisma (devDependency) hace falta para `npm run db:deploy`.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --include=dev

COPY . .

# Carpeta de comprobantes (STORAGE_DRIVER=local). En Railway el disco se borra en cada deploy:
# hay que montar un Volume acá o pasar a un almacenamiento externo (pendiente).
RUN mkdir -p uploads && chown -R node:node uploads
USER node

EXPOSE 3000
CMD ["node", "index.js"]
