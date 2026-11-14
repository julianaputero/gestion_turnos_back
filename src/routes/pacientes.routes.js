const { Router } = require('express');
const {
  listPacientes,
  findPacienteByDni,
  createPaciente,
  updatePaciente,
  setPacienteActivo,
  deletePaciente,
} = require('../data/pacientes.repository');
const { countProfesionales } = require('../data/profesionales.repository');
const {
  DNI_REGEX,
  PACIENTE_TEXTO_MAX,
  PACIENTE_NOTAS_MAX,
  PACIENTE_ESTADOS,
  PACIENTE_ESTADO_DEFAULT,
} = require('../constants/pacientes.constants');

const router = Router();

/** Texto opcional: string recortado o null. Devuelve `undefined` si el tipo es inválido. */
function optionalText(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return undefined;
  return value.trim() || null;
}

/** Valida el body del alta. Devuelve `{ data }` o `{ error }`. */
function parsePaciente(body) {
  const nombre = optionalText(body.nombre);
  const apellido = optionalText(body.apellido);
  if (!nombre || !apellido) return { error: 'Completá el nombre y el apellido.' };

  const campos = {
    telefono: optionalText(body.telefono),
    email: optionalText(body.email),
    cobertura: optionalText(body.cobertura),
    notasAdministrativas: optionalText(body.notasAdministrativas),
  };
  if (Object.values(campos).includes(undefined)) return { error: 'Hay datos con un formato inválido.' };

  const largos = [nombre, apellido, campos.telefono, campos.email, campos.cobertura];
  if (largos.some((texto) => texto && texto.length > PACIENTE_TEXTO_MAX)) {
    return { error: `Los datos no pueden superar ${PACIENTE_TEXTO_MAX} caracteres.` };
  }
  if (campos.notasAdministrativas && campos.notasAdministrativas.length > PACIENTE_NOTAS_MAX) {
    return { error: `Las notas no pueden superar ${PACIENTE_NOTAS_MAX} caracteres.` };
  }
  if (campos.email && !campos.email.includes('@')) return { error: 'El email no es válido.' };

  const dniTexto = optionalText(body.dni);
  if (dniTexto === undefined) return { error: 'El DNI no es válido.' };
  const dni = dniTexto ? dniTexto.replace(/[.\s]/g, '') : null;
  if (dni && !DNI_REGEX.test(dni)) return { error: 'El DNI tiene que tener entre 7 y 9 números.' };

  const { profesionalIds } = body;
  if (
    !Array.isArray(profesionalIds) ||
    profesionalIds.length === 0 ||
    profesionalIds.some((id) => typeof id !== 'string' || !id)
  ) {
    return { error: 'Asigná al menos un profesional.' };
  }

  return {
    data: { nombre, apellido, dni, profesionalIds: [...new Set(profesionalIds)], ...campos },
  };
}

/** GET /api/pacientes[?q=texto][&profesionalId=...][&estado=activos|inactivos|todos] */
router.get('/', async (req, res) => {
  const { q, profesionalId, estado = PACIENTE_ESTADO_DEFAULT } = req.query;
  if (!Object.values(PACIENTE_ESTADOS).includes(estado)) {
    return res.status(400).json({ message: 'El filtro de estado no es válido.' });
  }

  const pacientes = await listPacientes({
    q: typeof q === 'string' ? q : undefined,
    profesionalId: typeof profesionalId === 'string' && profesionalId ? profesionalId : undefined,
    estado,
  });
  return res.json({ pacientes });
});

/**
 * Valida el body y las referencias (profesionales existentes, DNI no repetido).
 * `pacienteId` es el paciente que se edita, para que su propio DNI no cuente como repetido.
 * Devuelve `{ data }` o `{ status, message }`.
 */
async function validatePaciente(body, pacienteId) {
  const { data, error } = parsePaciente(body ?? {});
  if (error) return { status: 400, message: error };

  if ((await countProfesionales(data.profesionalIds)) !== data.profesionalIds.length) {
    return { status: 400, message: 'Alguno de los profesionales no existe.' };
  }

  const mismoDni = data.dni ? await findPacienteByDni(data.dni) : null;
  if (mismoDni && mismoDni.id !== pacienteId) {
    return { status: 409, message: 'Ya existe un paciente con ese DNI.' };
  }

  return { data };
}

/** POST /api/pacientes — alta de paciente. */
router.post('/', async (req, res) => {
  const { data, status, message } = await validatePaciente(req.body);
  if (!data) {
    return res.status(status).json({ message });
  }

  const paciente = await createPaciente(data);
  return res.status(201).json({ paciente });
});

/**
 * PATCH /api/pacientes/:id — edición completa (mismos campos que el alta).
 * Si se quita un profesional, se cancelan los turnos futuros con él.
 * Responde { paciente, turnosCancelados }.
 */
router.patch('/:id', async (req, res) => {
  const { data, status, message } = await validatePaciente(req.body, req.params.id);
  if (!data) {
    return res.status(status).json({ message });
  }

  const resultado = await updatePaciente(req.params.id, data);
  if (!resultado) {
    return res.status(404).json({ message: 'El paciente no existe.' });
  }

  return res.json(resultado);
});

/**
 * PATCH /api/pacientes/:id/estado — baja lógica o reactivación. Body: { activo: boolean }
 * Al desactivar se cancelan los turnos futuros. Responde { paciente, turnosCancelados }.
 */
router.patch('/:id/estado', async (req, res) => {
  const activo = req.body?.activo;
  if (typeof activo !== 'boolean') {
    return res.status(400).json({ message: 'Indicá si el paciente queda activo o inactivo.' });
  }

  const resultado = await setPacienteActivo(req.params.id, activo);
  if (!resultado) {
    return res.status(404).json({ message: 'El paciente no existe.' });
  }

  return res.json(resultado);
});

/** DELETE /api/pacientes/:id — borrado definitivo del paciente y de todos sus turnos. */
router.delete('/:id', async (req, res) => {
  const turnosEliminados = await deletePaciente(req.params.id);
  if (turnosEliminados === null) {
    return res.status(404).json({ message: 'El paciente no existe.' });
  }

  return res.json({ turnosEliminados });
});

module.exports = router;
