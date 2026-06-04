import dayjs from 'dayjs';

/**
 * Construye el objeto `data` que consumen las plantillas de Control de Presupuesto
 * (la default `PdfControlPresupuestoDocument` y las custom generadas con IA) a partir
 * de los movimientos que abrió un drawer + el contexto disponible.
 *
 * Mismo contrato que `sampleData.js`. Los movimientos llegan con el shape del backend
 * (`total`, `moneda`, `fecha_factura`, `nombre_proveedor`, `categoria`, `type`…).
 */

const fechaSecs = (m) => m?.fecha_factura?._seconds || m?.fecha_factura?.seconds || 0;

const fechaStr = (m) => {
  const s = fechaSecs(m);
  if (s) return dayjs.unix(s).format('D/M/YYYY');
  if (m?.fecha_factura) return dayjs(m.fecha_factura).format('D/M/YYYY');
  return '';
};

const monedaDominante = (movs) => {
  const counts = {};
  movs.forEach((m) => {
    const k = m.moneda || 'ARS';
    counts[k] = (counts[k] || 0) + 1;
  });
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 'ARS';
};

export function buildControlPresupuestoData({
  movimientos = [],
  titulo = 'RECIBO DE PAGOS',
  presupuestoLabel = '',
  contratista = '',
  obra = '',
  empresaNombre = '',
  domicilio = '',
  moneda = null,
  presupuestado = 0,
  tipo = 'gastos',
} = {}) {
  // Orden cronológico ascendente para que el acumulado tenga sentido.
  const orden = [...movimientos].sort((a, b) => fechaSecs(a) - fechaSecs(b));
  const monedaDoc = moneda || monedaDominante(orden);

  let acum = 0;
  const movs = orden.map((m, i) => {
    const monto = Number(m.total) || 0;
    acum += monto;
    const detalle = m.nombre_proveedor || m.categoria || m.observacion || 'Movimiento';
    return {
      numero: i + 1,
      fecha: fechaStr(m),
      detalle,
      proveedor: m.nombre_proveedor || '',
      categoria: m.categoria || '',
      monto,
      acumulado: acum,
    };
  });

  const ejecutado = acum;
  const presup = Number(presupuestado) || 0;
  const saldo = presup ? presup - ejecutado : 0;

  return {
    titulo,
    fecha_emision: dayjs().format('D/M/YYYY'),
    empresa_nombre: empresaNombre,
    domicilio,
    contratista,
    obra,
    presupuesto_label: presupuestoLabel,
    tipo,
    moneda: monedaDoc,
    presupuestado: presup,
    ejecutado,
    saldo,
    avance_pct: presup ? (ejecutado / presup) * 100 : 0,
    movimientos: movs,
  };
}

export default buildControlPresupuestoData;
