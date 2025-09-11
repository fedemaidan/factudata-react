import dayjs from "dayjs";

// Parse seguro de fechas en varios formatos
export const getTimeSafe = (v) => {
  if (!v) return 0;
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.getTime();
  const p = dayjs(
    v,
    ["DD/MM/YYYY", "D/M/YYYY", "YYYY-MM-DD", "YYYY/MM/DD", "MM/DD/YYYY", "M/D/YYYY"],
    true
  );
  return p.isValid() ? p.valueOf() : 0;
};

// Si usás Mongo ObjectId, extrae el timestamp inicial del id como desempate
export const getTimeFromObjectId = (id) => {
  if (!id || id.length < 8) return 0;
  const secs = parseInt(id.substring(0, 8), 16);
  if (Number.isNaN(secs)) return 0;
  return secs * 1000;
};

// Clave de orden: fecha -> createdAt/id -> id string
export const orderKey = (row) => {
  const tFecha = getTimeSafe(row && row.fecha);
  const tCreated =
    getTimeSafe(row && row.originalData && row.originalData.createdAt) ||
    getTimeFromObjectId(row && row.id) ||
    0;

  return [tFecha, tCreated, String((row && row.id) || "")];
};

export const ascByOrderKey = (a, b) => {
  const A = orderKey(a);
  const B = orderKey(b);
  if (A[0] !== B[0]) return A[0] - B[0];
  if (A[1] !== B[1]) return A[1] - B[1];
  return A[2] < B[2] ? -1 : A[2] > B[2] ? 1 : 0;
};

export const descByOrderKey = (a, b) => -ascByOrderKey(a, b);
