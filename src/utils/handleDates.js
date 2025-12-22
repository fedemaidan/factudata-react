import dayjs from 'dayjs';

export const formatDateDDMMYYYY = (fecha) => {
  if (!fecha) return '-';
  const fechaParsed = dayjs(fecha);
  if (!fechaParsed.isValid()) return '-';
  return fechaParsed.format('DD-MM-YYYY');
};


export const parseDDMMYYYYAnyToISO = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  }
  if (typeof value !== "string") return null;

  const s = value.trim();
  if (!s) return null;

  // Soportar también "DD-MM-YYYY"
  const normalized = s.includes("-") && !s.includes("/")
    ? s.replaceAll("-", "/")
    : s;

  // Reutiliza el parser existente (DD/MM/YYYY)
  return parseDDMMYYYYToISO(normalized);
};

export const formatearFechaHora = (s) => {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const parseDDMMYYYYToISO = (value) => {
  if (!value || typeof value !== "string") return null;
  const [dd, mm, yyyy] = value.split("/");
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    year < 1900
  ) {
    return null;
  }
  const d = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

export const normalizeDDMMYYYYString = (value) => {
  const iso = parseDDMMYYYYToISO(value);
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// Normaliza el string de fecha detectada para LICENCIAS.
// Acepta:
//   - "DD/MM/YYYY"
//   - "DD/MM/YYYY - DD/MM/YYYY" (con o sin espacios)
// Devuelve:
//   - "DD/MM/YYYY" o "DD/MM/YYYY - DD/MM/YYYY" ya normalizados, o null si es inválido.
export const normalizeLicenciaFechasDetectadasString = (value) => {
  if (!value || typeof value !== "string") return null;
  const parts = value.split("-").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 1) {
    return normalizeDDMMYYYYString(parts[0]);
  }
  if (parts.length >= 2) {
    const start = normalizeDDMMYYYYString(parts[0]);
    const end = normalizeDDMMYYYYString(parts[1]);
    if (!start || !end) return null;
    return `${start} - ${end}`;
  }
  return null;
};

// Formatea fechas a "DD/MM/YYYY HH:mm" (sin segundos).
// - Acepta Date, ISO string, timestamp o "YYYY-MM-DD".
// - Para "YYYY-MM-DD" usa 12:00 UTC para evitar corrimientos por zona horaria.
export const formatDateTimeToMinutes = (value) => {
  if (!value) return "-";

  let d = null;

  if (value instanceof Date) {
    d = value;
  } else if (typeof value === "number") {
    d = new Date(value);
  } else if (typeof value === "string") {
    const s = value.trim();
    if (!s) return "-";

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      d = new Date(`${s}T12:00:00.000Z`);
    } else {
      d = new Date(s);
    }
  } else {
    try {
      d = new Date(value);
    } catch (_e) {
      d = null;
    }
  }

  if (!d || Number.isNaN(d.getTime())) return "-";

  const parsed = dayjs(d);
  if (!parsed.isValid()) return "-";
  return parsed.format("DD/MM/YYYY HH:mm");
};

// Formatea fechas a "DD/MM/YYYY" (sin hora).
// - Acepta Date, ISO string, timestamp o "YYYY-MM-DD".
// - Para "YYYY-MM-DD" usa 12:00 UTC para evitar corrimientos por zona horaria.
export const formatDateToDDMMYYYY = (value) => {
  if (!value) return "-";

  let d = null;

  if (value instanceof Date) {
    d = value;
  } else if (typeof value === "number") {
    d = new Date(value);
  } else if (typeof value === "string") {
    const s = value.trim();
    if (!s) return "-";

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      d = new Date(`${s}T12:00:00.000Z`);
    } else {
      d = new Date(s);
    }
  } else {
    try {
      d = new Date(value);
    } catch (_e) {
      d = null;
    }
  }

  if (!d || Number.isNaN(d.getTime())) return "-";

  const parsed = dayjs(d);
  if (!parsed.isValid()) return "-";
  return parsed.format("DD/MM/YYYY");
};