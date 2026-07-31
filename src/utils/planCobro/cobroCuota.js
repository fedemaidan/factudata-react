/**
 * Lógica pura del cobro de una cuota de Plan de Cobro (TAR-632).
 *
 * "Monto calculado" es el valor de la cuota ajustado por el índice al día del cobro;
 * la "diferencia aceptada" es lo que separa a ese monto de lo efectivamente cobrado
 * cuando el usuario confirma que la cuota queda totalmente pagada.
 */

// Diferencias por debajo de un peso son ruido de redondeo del índice.
const EPSILON = 0.01;

/**
 * Monto calculado de la cuota: el valor ajustado por el índice del día. Sin índice
 * disponible (o plan no indexado) cae al monto nominal pactado, que es lo que el
 * backend también cobra en ese caso.
 */
export function montoCalculadoDeCuota({ cuota, plan, cacActual, usdActual }) {
  if (!cuota) return 0;
  if (plan?.indexacion === 'CAC' && cuota.monto_cac && cacActual) {
    return Math.round(Number(cuota.monto_cac) * Number(cacActual) * 100) / 100;
  }
  if (plan?.indexacion === 'USD' && cuota.monto_usd && usdActual) {
    return Math.round(Number(cuota.monto_usd) * Number(usdActual) * 100) / 100;
  }
  return Number(cuota.monto) || 0;
}

/** Importe que se va a registrar según cómo esté armado el diálogo de cobro. */
export function importeDelCobro({ modo, tipoCobro, montoParcial, movimiento, restante }) {
  if (modo === 'vincular') return Number(movimiento?.monto) || 0;
  if (tipoCobro === 'parcial') return Number(montoParcial) || 0;
  return Number(restante) || 0;
}

/**
 * Diferencia aceptada que resultaría de confirmar este cobro. Positiva = se cobra
 * menos que el monto calculado; negativa = se cobra de más. Null si no hay monto
 * calculado contra el cual comparar.
 */
export function diferenciaAceptadaPreview({ montoCalculado, montoCobradoPrevio = 0, importe }) {
  const calculado = Number(montoCalculado) || 0;
  if (calculado <= 0) return null;
  const cobradoTotal = (Number(montoCobradoPrevio) || 0) + (Number(importe) || 0);
  return Math.round((calculado - cobradoTotal) * 100) / 100;
}

/**
 * Diferencia aceptada ya persistida de una cuota saldada con cobro total confirmado.
 * Null si la cuota no se saldó así, si no tiene snapshot (cobros anteriores a la
 * funcionalidad) o si la diferencia es puro redondeo.
 */
export function diferenciaAceptadaDeCuota(cuota) {
  if (!cuota?.cobro_total_confirmado) return null;
  const calculado = Number(cuota.monto_calculado_snapshot) || 0;
  if (calculado <= 0) return null;
  const diferencia = calculado - (Number(cuota.monto_cobrado) || 0);
  return Math.abs(diferencia) < EPSILON ? null : Math.round(diferencia * 100) / 100;
}

/** Mensaje de confirmación de un cobro ya registrado, según cómo se registró. */
export function mensajeCobroRegistrado(payload = {}) {
  if (payload.cobro_total_confirmado) return 'Cuota saldada por el importe cobrado.';
  if (payload.modo === 'vincular') return 'Cuota cobrada vinculando el movimiento existente.';
  if (payload.modo === 'solo_estado') return 'Cuota marcada como cobrada (sin movimiento de caja).';
  if (payload.monto_parcial != null) return 'Pago parcial registrado.';
  return 'Cuota cobrada. Movimiento de caja registrado.';
}

/** ¿El importe a registrar difiere del restante de la cuota? */
export function importeDifiereDelRestante(importe, restante) {
  const imp = Number(importe) || 0;
  if (imp <= 0) return false;
  return Math.abs(imp - (Number(restante) || 0)) > EPSILON;
}
