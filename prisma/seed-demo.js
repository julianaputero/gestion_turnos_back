/**
 * Datos de DEMO para desarrollo: pacientes ficticios y turnos repartidos entre
 * los profesionales que ya existen en la base, desde el mes pasado hasta el
 * mes que viene. No usar en producción.
 *
 * Solo corre si la tabla de turnos está vacía (no duplica datos).
 *
 *   npm run db:seed:demo
 */
require('../src/config/env');
const prisma = require('../src/data/prisma');
const { listProfesionales } = require('../src/data/profesionales.repository');

/** Pacientes ficticios: [nombre, apellido]. DNI, contacto y cobertura se generan abajo. */
const DEMO_PACIENTES = [
  ['Ana', 'Pérez'],
  ['Bruno', 'Gómez'],
  ['Carla', 'Fernández'],
  ['Diego', 'López'],
  ['Elena', 'Martínez'],
  ['Facundo', 'Romero'],
  ['Gabriela', 'Sosa'],
  ['Hernán', 'Torres'],
  ['Inés', 'Álvarez'],
  ['Julián', 'Ruiz'],
  ['Lucía', 'Díaz'],
  ['Martín', 'Herrera'],
];

/** Coberturas y notas administrativas de ejemplo (null = sin dato). */
const DEMO_COBERTURAS = ['OSDE 310', 'Swiss Medical SMG20', 'Galeno 220', 'IOMA', 'Particular'];
const DEMO_NOTAS = [
  'Prefiere turnos por la tarde. Avisar antes por WhatsApp.',
  'Confirmar turno el día anterior por teléfono.',
  null,
  null,
];
const DEMO_DNI_BASE = 30000000;
const DEMO_TELEFONO_BASE = 5491140000000;

/** Horarios posibles de inicio (hora, minuto) y duraciones en minutos. */
const SLOTS = [
  [9, 0], [9, 45], [10, 30], [11, 15], [12, 0], [14, 0], [14, 45], [15, 30], [16, 15], [17, 0],
];
const DURACIONES = [30, 45];
const TURNOS_POR_DIA_MAX = 3;

/** Generador pseudoaleatorio determinístico (mismos datos en cada corrida). */
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

async function main() {
  if ((await prisma.turno.count()) > 0) {
    console.log('[seed-demo] Ya hay turnos cargados, se omite.');
    return;
  }

  const profesionales = await listProfesionales();
  if (profesionales.length === 0) {
    console.log('[seed-demo] No hay profesionales en la base. Corré primero `npm run db:seed`.');
    return;
  }

  const random = seededRandom(42);
  const pick = (list) => list[Math.floor(random() * list.length)];

  const pacientes = [];
  for (const [index, [nombre, apellido]] of DEMO_PACIENTES.entries()) {
    const usuarioEmail = `${nombre}.${apellido}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    pacientes.push(
      await prisma.paciente.create({
        data: {
          nombre,
          apellido,
          dni: String(DEMO_DNI_BASE + Math.floor(random() * 15000000)),
          telefono: `+${DEMO_TELEFONO_BASE + index * 1111}`,
          email: `${usuarioEmail}@ejemplo.com`,
          cobertura: pick(DEMO_COBERTURAS),
          notasAdministrativas: pick(DEMO_NOTAS),
          profesionalAsignadoId: pick(profesionales).id,
        },
      }),
    );
  }

  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 1);

  const turnos = [];
  for (let dia = new Date(desde); dia < hasta; dia.setDate(dia.getDate() + 1)) {
    const diaSemana = dia.getDay();
    if (diaSemana === 0 || diaSemana === 6) continue; // sin turnos el fin de semana

    for (const profesional of profesionales) {
      const cantidad = Math.floor(random() * (TURNOS_POR_DIA_MAX + 1));
      const slots = [...SLOTS].sort(() => random() - 0.5).slice(0, cantidad);

      for (const [hora, minuto] of slots) {
        const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), hora, minuto);
        const fin = new Date(inicio.getTime() + pick(DURACIONES) * 60 * 1000);
        turnos.push({
          inicio,
          fin,
          profesionalId: profesional.id,
          pacienteId: pick(pacientes).id,
        });
      }
    }
  }

  await prisma.turno.createMany({ data: turnos });
  console.log(
    `[seed-demo] Creados ${pacientes.length} pacientes y ${turnos.length} turnos para ${profesionales.length} profesional(es).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
