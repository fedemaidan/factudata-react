import dayjs from 'dayjs';

// 'DD/MM/YYYY' -> 'HH:mm' si es hoy, 'D/M' si es otro día
export const formatFecha = (fecha) => {
  const date = dayjs(fecha);
  const hoy = dayjs();
  if (date.isSame(hoy, "day")) {
    return date.format("HH:mm");
  }
  return date.format("D/M");
};

export const formatDateDDMMYYYY = (fecha) => {
  if (!fecha) return '-';
  const fechaParsed = dayjs(fecha);
  if (!fechaParsed.isValid()) return '-';
  return fechaParsed.format('DD-MM-YYYY');
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