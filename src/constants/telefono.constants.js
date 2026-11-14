/** Argentina: código de país, prefijo de celular para WhatsApp y largos del número nacional. */
const TELEFONO_AR = {
  /** Código de país. */
  codigoPais: '54',
  /** Prefijo internacional de celulares (va entre el 54 y el código de área). */
  prefijoCelular: '9',
  /** Prefijo de larga distancia nacional que se marca antes del código de área. */
  prefijoNacional: '0',
  /** Prefijo local de celulares que va entre el código de área y el número. */
  prefijoLocalCelular: '15',
  /** Dígitos de código de área + número, sin 0 ni 15 (ej. 11 4444-1111). */
  largoNacional: 10,
};

/** Largo válido (en dígitos) de un número internacional que no es de Argentina. */
const TELEFONO_INTERNACIONAL = { min: 8, max: 15 };

module.exports = { TELEFONO_AR, TELEFONO_INTERNACIONAL };
