const prisma = require('./prisma');
const { PLANTILLAS_DEFAULT } = require('../constants/mensajes.constants');

/**
 * Todas las plantillas (una por tipo y tono): la guardada por Gestión si existe,
 * si no la de por defecto. `personalizada` indica cuál de las dos es.
 */
async function listPlantillas() {
  const guardadas = await prisma.plantillaMensaje.findMany({
    select: { tipo: true, tono: true, contenido: true },
  });
  const porClave = new Map(guardadas.map((p) => [`${p.tipo}:${p.tono}`, p.contenido]));

  return Object.entries(PLANTILLAS_DEFAULT).flatMap(([tipo, porTono]) =>
    Object.entries(porTono).map(([tono, contenidoDefault]) => {
      const guardada = porClave.get(`${tipo}:${tono}`);
      return {
        tipo,
        tono,
        contenido: guardada ?? contenidoDefault,
        personalizada: guardada !== undefined,
      };
    }),
  );
}

/** Crea o reemplaza la plantilla de ese tipo y tono. */
async function savePlantilla({ tipo, tono, contenido }) {
  await prisma.plantillaMensaje.upsert({
    where: { tipo_tono: { tipo, tono } },
    create: { tipo, tono, contenido },
    update: { contenido },
  });
  return { tipo, tono, contenido, personalizada: true };
}

/** Registra un mensaje enviado. */
function createMensaje({ pacienteId, profesionalId, tipo, contenido }) {
  return prisma.mensaje.create({
    data: { pacienteId, profesionalId, tipo, contenido },
    select: { id: true, tipo: true, enviadoAt: true },
  });
}

module.exports = { listPlantillas, savePlantilla, createMensaje };
