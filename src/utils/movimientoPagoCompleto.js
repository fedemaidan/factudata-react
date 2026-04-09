import { dateToTimestamp } from 'src/utils/formatters';

/** @param {unknown} fechaPago */
export const fechaPagoTieneValor = (fechaPago) => {
  if (fechaPago == null) return false;
  if (typeof fechaPago === 'string') return fechaPago.trim() !== '';
  if (fechaPago instanceof Date) return !Number.isNaN(fechaPago.getTime());
  if (typeof fechaPago.seconds === 'number' || typeof fechaPago._seconds === 'number') return true;
  if (typeof fechaPago?.toDate === 'function') return true;
  return false;
};

/**
 * Egreso en Pendiente o Parcialmente Pagado con saldo pendiente.
 * @param {{ type?: string, estado?: string, total?: unknown, monto_pagado?: unknown } | null | undefined} mov
 */
export const puedeCompletarPagoEgreso = (mov) => {
  if (!mov || mov.type !== 'egreso') return false;
  const total = Number(mov.total);
  if (!Number.isFinite(total) || total <= 0) return false;
  const estado = mov.estado || 'Pendiente';
  const pagadoRaw = mov.monto_pagado;
  const pagado = Number(pagadoRaw);
  const pagadoNum = Number.isFinite(pagado) ? pagado : 0;
  if (estado === 'Pendiente') return true;
  if (estado === 'Parcialmente Pagado') return pagadoNum < total - 0.005;
  return false;
};

/**
 * Campos para PUT (solo los que deben cambiar). Si ya hay fecha de pago, no se envía fecha_pago.
 * @param {{ total?: unknown, fecha_pago?: unknown }} mov
 */
export const buildCompletarPagoUpdateFields = (mov) => {
  const total = Number(mov?.total) || 0;
  const patch = {
    estado: 'Pagado',
    monto_pagado: total,
  };
  if (!fechaPagoTieneValor(mov?.fecha_pago)) {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    patch.fecha_pago = dateToTimestamp(`${y}-${m}-${d}`);
  }
  return patch;
};
