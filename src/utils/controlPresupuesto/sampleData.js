/**
 * Datos de muestra para previsualizar plantillas de Control de Presupuesto.
 *
 * `buildSampleData(modo)` arma la muestra pasando movimientos de ejemplo por el MISMO
 * `buildControlPresupuestoData`, así el preview del editor refleja exactamente lo que
 * verá el usuario en cada modo:
 *  - 'nominal' (default): pesos reales, sin columna de equivalencia.
 *  - 'cac': movimientos en $ nominal + columna CAC; resumen en CAC (≈ pesos a hoy).
 *  - 'usd': movimientos en $ nominal + columna USD; resumen en USD (≈ pesos a hoy).
 */
import buildControlPresupuestoData from './buildControlPresupuestoData';

const INDICE_CAC = 500;   // pesos por unidad CAC (muestra)
const DOLAR = 1250;       // pesos por USD (muestra)
const PRESUPUESTADO_ARS = 8750000;

const ROWS = [
  { fecha: '27/3/2026', ars: 300000 },
  { fecha: '28/3/2026', ars: 400000 },
  { fecha: '10/4/2026', ars: 1050000 },
  { fecha: '17/4/2026', ars: 600000 },
  { fecha: '24/4/2026', ars: 900000 },
  { fecha: '30/4/2026', ars: 1000000 },
  { fecha: '8/5/2026', ars: 1000000 },
  { fecha: '15/5/2026', ars: 1000000 },
  { fecha: '22/5/2026', ars: 1000000 },
];

const movimientos = ROWS.map((r) => {
  const [d, m, y] = r.fecha.split('/').map(Number);
  const seconds = Math.floor(new Date(y, m - 1, d).getTime() / 1000);
  return {
    fecha_factura: { seconds },
    total: r.ars,
    moneda: 'ARS',
    nombre_proveedor: 'Rodrigo Soria',
    categoria: 'Albañilería',
    equivalencias: { total: { ars: r.ars, cac: r.ars / INDICE_CAC, usd_blue: r.ars / DOLAR } },
  };
});

const BASE = {
  titulo: 'RECIBO DE PAGOS',
  presupuestoLabel: 'Albañilería 1° etapa',
  contratista: 'Rodrigo Soria',
  obra: 'Casa Tatán',
  empresaNombre: 'Tu empresa',
  domicilio: 'Costa de Oro',
  tipo: 'gastos',
  movimientos,
};

export function buildSampleData(modo = 'nominal') {
  if (modo === 'cac') {
    return buildControlPresupuestoData({
      ...BASE, modo: 'cac', indexacion: 'CAC', cacTipo: 'general',
      presupuestadoNativo: PRESUPUESTADO_ARS / INDICE_CAC, cacIndiceActual: INDICE_CAC,
    });
  }
  if (modo === 'usd') {
    return buildControlPresupuestoData({
      ...BASE, modo: 'usd', indexacion: 'USD',
      presupuestadoNativo: PRESUPUESTADO_ARS / DOLAR, tipoCambioActual: DOLAR,
    });
  }
  return buildControlPresupuestoData({ ...BASE, modo: 'nominal', presupuestadoNominal: PRESUPUESTADO_ARS });
}

// Compat: muestra por defecto (modo nominal).
const CONTROL_PRESUPUESTO_SAMPLE_DATA = buildSampleData('nominal');

export default CONTROL_PRESUPUESTO_SAMPLE_DATA;
