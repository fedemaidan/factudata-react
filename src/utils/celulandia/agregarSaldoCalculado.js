import { ascByOrderKey } from "src/utils/dateOrder";

const n = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const r2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function agregarSaldoCalculado(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];

  // Orden determinístico (ASC)
  //const rowsSorted = [...items].sort(ascByOrderKey);
  const rowsSorted = [...items].reverse()

  const idToComputed = new Map();
  let running = 0;

  for (const row of rowsSorted) {
    const baseMonto = row && row.montoCC != null ? row.montoCC : row && row.monto;
    const monto = n(baseMonto);
    const debe = row && row.debe != null ? n(row.debe) : monto < 0 ? Math.abs(monto) : 0;
    const haber = row && row.haber != null ? n(row.haber) : monto > 0 ? monto : 0;

    running = r2(running + (haber - debe));

    idToComputed.set(row.id, {
      debe: n(debe),
      haber: n(haber),
      saldoAcumulado: n(running),
    });
  }

  return items.map((it) => ({
    ...it,
    ...(idToComputed.get(it.id) || { debe: 0, haber: 0, saldoAcumulado: 0 }),
  }));
}

export default agregarSaldoCalculado;
