import {
  parseDDMMYYYYToISO,
  normalizeDDMMYYYYString,
  normalizeLicenciaFechasDetectadasString,
} from "src/utils/handleDates";

export const buildFechaDetectadaPatch = ({ tipo }, nuevaFecha) => {
  const patch = {};
  const tipoNormalizado = String(tipo || "").toLowerCase();

  if (tipoNormalizado === "parte") {
    const iso = parseDDMMYYYYToISO(nuevaFecha);
    if (iso) {
      patch.fecha = iso;
      const normalized = normalizeDDMMYYYYString(nuevaFecha);
      if (normalized) {
        patch.fechasDetectadas = normalized;
      }
    }
    return patch;
  }

  if (tipoNormalizado === "licencia") {
    const normalizedRange = normalizeLicenciaFechasDetectadasString(nuevaFecha);
    if (normalizedRange) {
      patch.fechasDetectadas = normalizedRange;
    }
  }

  return patch;
};
