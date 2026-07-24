// Valuación en dólares para la Vista única de obra.
//
// Regla del cliente (Plam, TAR-579): la pantalla se muestra SIEMPRE dolarizada.
// Cada movimiento de caja ya guarda su equivalente en USD, así que para los
// movimientos reusamos `getAmount(mov, 'USD', 'total')` del motor de reportes
// (fuente única de verdad). Para presupuestos y cuotas de cobro, que no siempre
// traen el equivalente precomputado, convertimos con el snapshot de cotización
// que quedó guardado al crearlos, cayendo al dólar live sólo como último recurso.

import { getAmount } from '../../tools/reportEngine';

// —— Movimiento de caja → USD ——
// Delega en el motor: lee equivalencias.total.usd_blue / total_dolar / dolar_referencia.
export function movimientoUsd(mov, campo = 'total') {
  const val = getAmount(mov, 'USD', campo);
  return Number.isFinite(val) ? val : 0;
}

// Devuelve el dólar guardado en un snapshot de cotización, con fallbacks.
function dolarDesdeSnapshot(snapshot, fallbackDolar = 0) {
  const d =
    snapshot?.dolar_blue ??
    snapshot?.dolar ??
    snapshot?.dolar_indice ??
    fallbackDolar;
  const n = Number(d);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// —— Presupuesto (control de presupuestos) → USD ——
// monto_presupuestado en moneda_almacenamiento; si ya está en USD se usa tal cual,
// si está en ARS/CAC se divide por el dólar del snapshot.
export function presupuestoUsd(p, fallbackDolar = 0) {
  const base = Number(p?.monto_presupuestado ?? p?.monto ?? 0) || 0;
  const moneda = p?.moneda_almacenamiento ?? p?.moneda ?? 'ARS';
  if (moneda === 'USD') return base;
  const dolar = dolarDesdeSnapshot(p?.cotizacion_snapshot, fallbackDolar);
  return dolar > 0 ? base / dolar : 0;
}

// —— Cuota de un plan de cobro → USD ——
// Prioridad: si el plan cobra/indexa en USD y la cuota trae el monto en USD, se usa;
// si el plan es en USD sin campo dedicado, el nominal ya está en USD;
// en pesos se convierte con el snapshot del plan (o de la cuota).
function cuotaUsd(nominal, cuota, plan, fallbackDolar) {
  const enUsd = plan?.moneda === 'USD' || plan?.indexacion === 'USD';
  if (enUsd) {
    if (Number.isFinite(Number(cuota?.monto_usd)) && Number(cuota?.monto_usd) > 0 && nominal === cuota?.monto) {
      return Number(cuota.monto_usd);
    }
    return Number(nominal) || 0;
  }
  const dolar = dolarDesdeSnapshot(
    plan?.cotizacion_snapshot || cuota?.cotizacion_snapshot,
    fallbackDolar,
  );
  return dolar > 0 ? (Number(nominal) || 0) / dolar : 0;
}

// Monto esperado (nominal pactado) de una cuota, en USD.
export function cuotaEsperadoUsd(cuota, plan, fallbackDolar = 0) {
  return cuotaUsd(cuota?.monto ?? 0, cuota, plan, fallbackDolar);
}

// Monto efectivamente cobrado de una cuota, en USD.
export function cuotaCobradoUsd(cuota, plan, fallbackDolar = 0) {
  return cuotaUsd(cuota?.monto_cobrado ?? 0, cuota, plan, fallbackDolar);
}

// Estados de cuota que cuentan como "todavía se debe".
export const ESTADOS_PENDIENTES = new Set([
  'pendiente',
  'vencida',
  'cobrada_parcial',
  'parcial',
]);

export function cuotaEstaVencida(cuota) {
  if (cuota?.estado === 'vencida') return true;
  const f = fechaCuota(cuota);
  if (!f) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return f < hoy && ESTADOS_PENDIENTES.has(cuota?.estado);
}

// Una cuota "adicional" es la que entró por un anexo posterior al plan original.
export function cuotaEsAdicional(cuota) {
  return Boolean(
    cuota?.es_anexo ||
      cuota?.es_adicional ||
      cuota?.origen === 'anexo' ||
      cuota?.origen === 'adicional' ||
      cuota?.anexo_id,
  );
}

// Normaliza la fecha de vencimiento (ISO string, Timestamp Firestore o {seconds}).
export function fechaCuota(cuota) {
  const raw = cuota?.fecha_vencimiento ?? cuota?.fecha;
  if (!raw) return null;
  if (typeof raw === 'string') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const seconds = raw.seconds ?? raw._seconds;
  if (seconds !== undefined) return new Date(seconds * 1000);
  if (raw instanceof Date) return raw;
  return null;
}

// Devuelve el proyecto_id de un plan de cobro (puede venir como objeto o como id).
export function planProyectoId(plan) {
  const p = plan?.proyecto_id ?? plan?.proyecto;
  if (!p) return null;
  return typeof p === 'object' ? p.id ?? p._id ?? null : p;
}
