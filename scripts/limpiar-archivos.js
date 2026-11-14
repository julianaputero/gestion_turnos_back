/**
 * Busca archivos de comprobantes que ya no pertenecen a ningún pago (huérfanos) y,
 * con --borrar, los elimina del almacenamiento (carpeta local o Cloudflare R2).
 *
 * La app ya borra el archivo al borrar un turno, un paciente o un pago. Esto cubre lo que
 * no pasa por el código: borrar un usuario profesional a mano, el trigger que borra
 * pacientes sin profesionales, o un error al borrar un archivo.
 *
 *   npm run storage:limpiar              # solo lista lo que borraría
 *   npm run storage:limpiar -- --borrar  # los borra
 */
require('../src/config/env');
const prisma = require('../src/data/prisma');
const storage = require('../src/storage');
const { CARPETA_COMPROBANTES } = require('../src/constants/archivos.constants');

const BORRAR = process.argv.includes('--borrar');

async function main() {
  const enUso = new Set(
    (
      await prisma.pago.findMany({
        where: { comprobanteKey: { not: null } },
        select: { comprobanteKey: true },
      })
    ).map((pago) => pago.comprobanteKey),
  );
  const guardados = await storage.listar(CARPETA_COMPROBANTES);
  const huerfanos = guardados.filter((clave) => !enUso.has(clave));

  console.log(
    `[storage] ${guardados.length} archivos guardados, ${enUso.size} en uso, ${huerfanos.length} huérfanos.`,
  );
  for (const clave of huerfanos) {
    if (BORRAR) await storage.borrar(clave);
    console.log(`  ${BORRAR ? 'borrado' : 'huérfano'}: ${clave}`);
  }
  if (huerfanos.length && !BORRAR) {
    console.log('Para borrarlos: npm run storage:limpiar -- --borrar');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
