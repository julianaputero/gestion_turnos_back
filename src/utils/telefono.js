const { TELEFONO_AR, TELEFONO_INTERNACIONAL } = require('../constants/telefono.constants');

const { codigoPais, prefijoCelular, prefijoNacional, prefijoLocalCelular, largoNacional } =
  TELEFONO_AR;

const ERROR_CODIGO_AREA =
  'El teléfono tiene que incluir el código de área, sin 0 ni 15 (ej. 11 4444-1111).';

/**
 * Normaliza un teléfono al formato internacional de celular argentino (+549 + código de
 * área + número), que es el que usa WhatsApp. Acepta cómo lo escribe la gente:
 * "11 4444-1111", "011 15 4444-1111", "54 11 4444 1111", "+54 9 11 4444-1111"…
 *
 * Un número que empieza con "+" (o "00") y otro código de país se guarda tal cual,
 * para pacientes del exterior.
 *
 * Devuelve `{ telefono }` (null si vino vacío) o `{ error }`.
 */
function normalizeTelefono(valor) {
  const texto = valor?.trim() ?? '';
  if (!texto) return { telefono: null };

  const internacional = texto.startsWith('+') || texto.startsWith('00');
  let digitos = texto.replace(/\D/g, '');
  if (texto.startsWith('00')) digitos = digitos.slice(2);

  if (internacional && !digitos.startsWith(codigoPais)) {
    const { min, max } = TELEFONO_INTERNACIONAL;
    if (digitos.length < min || digitos.length > max) {
      return { error: 'El teléfono internacional no es válido.' };
    }
    return { telefono: `+${digitos}` };
  }

  // Sacar el 54 (y el 9) si vienen: con "+" o si el número es demasiado largo para ser nacional.
  let nacional = digitos;
  if (digitos.startsWith(codigoPais) && (internacional || digitos.length > largoNacional + 1)) {
    nacional = digitos.slice(codigoPais.length);
    if (nacional.startsWith(prefijoCelular)) nacional = nacional.slice(prefijoCelular.length);
  }

  if (nacional.startsWith(prefijoNacional)) nacional = nacional.slice(prefijoNacional.length);

  // "11 15 4444-1111": el 15 va después del código de área (de 2 a 4 dígitos).
  if (nacional.length === largoNacional + prefijoLocalCelular.length) {
    for (const largoArea of [2, 3, 4]) {
      if (nacional.startsWith(prefijoLocalCelular, largoArea)) {
        nacional =
          nacional.slice(0, largoArea) + nacional.slice(largoArea + prefijoLocalCelular.length);
        break;
      }
    }
  }

  // Ningún código de área argentino empieza con 15: si queda así, faltó el código de área.
  if (nacional.length !== largoNacional || nacional.startsWith(prefijoLocalCelular)) {
    return { error: ERROR_CODIGO_AREA };
  }
  return { telefono: `+${codigoPais}${prefijoCelular}${nacional}` };
}

module.exports = { normalizeTelefono };
