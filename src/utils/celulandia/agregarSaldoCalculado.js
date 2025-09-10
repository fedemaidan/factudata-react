import dayjs from "dayjs";

const n = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const r2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const getTimeSafe = (value) => {
  if (!value) return 0;
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.getTime();
  const p = dayjs(
    value,
    ["DD/MM/YYYY", "D/M/YYYY", "YYYY-MM-DD", "YYYY/MM/DD", "MM/DD/YYYY", "M/D/YYYY"],
    true
  );
  return p.isValid() ? p.valueOf() : 0;
};

export function agregarSaldoCalculado(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];

  // Orden cronológico ASC (más viejo primero)
  const rowsSorted = [...items].sort((a, b) => getTimeSafe(a?.fecha) - getTimeSafe(b?.fecha));

  // Calculamos y mapeamos por id para reinyectar en el arreglo original
  const idToComputed = new Map();

  let running = 0;
  for (const row of rowsSorted) {
    const baseMonto = row?.montoCC != null ? row.montoCC : row?.monto;
    const monto = n(baseMonto);
    const debe = row?.debe != null ? n(row.debe) : monto < 0 ? Math.abs(monto) : 0;
    const haber = row?.haber != null ? n(row.haber) : monto > 0 ? monto : 0;

    running = r2(running + (haber - debe));

    idToComputed.set(row.id, {
      debe: n(debe),
      haber: n(haber),
      saldoAcumulado: n(running),
    });
  }

  // Devolver nuevos objetos con las propiedades calculadas
  return items.map((it) => ({
    ...it,
    ...(idToComputed.get(it.id) || { debe: 0, haber: 0, saldoAcumulado: 0 }),
  }));
}

export default agregarSaldoCalculado;
