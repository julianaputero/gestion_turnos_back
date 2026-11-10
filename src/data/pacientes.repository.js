const prisma = require('./prisma');

const PACIENTE_RESUMEN_FIELDS = { id: true, nombre: true, apellido: true };

/** Lista de pacientes (resumen), ordenada por apellido y nombre. */
function listPacientes() {
  return prisma.paciente.findMany({
    select: PACIENTE_RESUMEN_FIELDS,
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });
}

function findPacienteById(id) {
  return prisma.paciente.findUnique({ where: { id }, select: PACIENTE_RESUMEN_FIELDS });
}

module.exports = { listPacientes, findPacienteById };
