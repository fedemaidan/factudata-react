/**
 * Desglose del Cash Flow y totales de la vista de Gestión (TAR-683/684).
 *
 * El backend etiqueta cada fila del `detalle` con el mismo `bucket_key` que usó
 * para armar el agregado, así que acá NO se re-implementa el bucketing: sólo se
 * filtra. Esa es la razón por la que la suma del desglose siempre coincide con la
 * celda de la que se abrió.
 *
 * Cada fila del detalle trae:
 *   tipo        'esperado' | 'cobrado'
 *   bucket_key  clave del período del agregado, o null si no pertenece a ninguno
 *   track       'ARS' | 'USD' (la moneda en la que se cobra la cuota)
 *   monto       lo que esa fila aporta a su celda
 *   vencida / realizado_anterior  por qué la fila no tiene bucket
 */

/** Filas que componen una celda del Cash Flow (un período × track × esperado/cobrado). */
export function filasDeCelda(detalle, { bucketKey, track, tipo }) {
  return (detalle || [])
    .filter((r) => r.bucket_key === bucketKey && r.track === track && r.tipo === tipo)
    .sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));
}

/** Total por moneda de un conjunto de filas. Pesos y dólares nunca se suman entre sí. */
export function totalPorTrack(filas) {
  return (filas || []).reduce(
    (acc, r) => {
      const track = r.track === 'USD' ? 'USD' : 'ARS';
      acc[track] = Math.round((acc[track] + (Number(r.monto) || 0)) * 100) / 100;
      acc.cuotas += 1;
      return acc;
    },
    { ARS: 0, USD: 0, cuotas: 0 },
  );
}

/**
 * Filas que se reclaman en la vista de Gestión: las de esperado. Las de cobrado
 * viven en el desglose del Cash Flow y no son trabajo de cobranza pendiente.
 * Las vencidas se siguen listando aunque no pertenezcan a ningún período.
 */
export function filasDeGestion(detalle) {
  return (detalle || []).filter((r) => r.tipo === 'esperado');
}

/**
 * Cobros anteriores a la ventana del Cash Flow: el agregado los colapsa en
 * `realizado_anterior` en vez de darles una fila, y esto explica cuáles son.
 */
export function filasRealizadoAnterior(detalle, track) {
  return (detalle || [])
    .filter((r) => r.tipo === 'cobrado' && r.realizado_anterior && r.track === track)
    .sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));
}

/** Clave estable de una fila del detalle (una cuota puede aparecer como esperado y como cobrado). */
export function claveDeFila(fila) {
  return `${fila.tipo}-${fila.cuota_id}`;
}
