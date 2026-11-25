const prisma = require('./prisma');
const { PLANTILLAS_DEFAULT } = require('../constants/mensajes.constants');

/**
 * Las plantillas de un profesional, una por tipo: la que le guardó Gestión si existe,
 * si no la de por defecto. `personalizada` indica cuál de las dos es, y `contenidoDefault`
 * trae siempre la de por defecto (para "Restaurar").
 */
async function listPlantillas(profesionalId) {
  const guardadas = await prisma.plantillaMensaje.findMany({
    where: { profesionalId },
    select: { tipo: true, contenido: true },
  });
  const porTipo = new Map(guardadas.map((p) => [p.tipo, p.contenido]));

  return Object.entries(PLANTILLAS_DEFAULT).map(([tipo, contenidoDefault]) => {
    const guardada = porTipo.get(tipo);
    return {
      tipo,
      contenido: guardada ?? contenidoDefault,
      contenidoDefault,
      personalizada: guardada !== undefined,
    };
  });
}

/** Crea o reemplaza la plantilla de ese profesional y tipo. */
async function savePlantilla({ profesionalId, tipo, contenido }) {
  await prisma.plantillaMensaje.upsert({
    where: { profesionalId_tipo: { profesionalId, tipo } },
    create: { profesionalId, tipo, contenido },
    update: { contenido },
  });
  return { tipo, contenido, contenidoDefault: PLANTILLAS_DEFAULT[tipo], personalizada: true };
}

/** Borra la plantilla propia de ese profesional y tipo: vuelve a usar la de por defecto. */
async function deletePlantilla({ profesionalId, tipo }) {
  await prisma.plantillaMensaje.deleteMany({ where: { profesionalId, tipo } });
  const contenidoDefault = PLANTILLAS_DEFAULT[tipo];
  return { tipo, contenido: contenidoDefault, contenidoDefault, personalizada: false };
}

/** Registra un mensaje enviado (`turnoId` opcional: el turno al que se refiere). */
function createMensaje({ pacienteId, profesionalId, tipo, contenido, turnoId = null }) {
  return prisma.mensaje.create({
    data: { pacienteId, profesionalId, tipo, contenido, turnoId },
    select: { id: true, tipo: true, enviadoAt: true },
  });
}

module.exports = { listPlantillas, savePlantilla, deletePlantilla, createMensaje };
