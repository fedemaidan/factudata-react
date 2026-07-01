/**
 * Datos de muestra para previsualizar plantillas de Control de Presupuesto.
 * Mismo shape que el objeto `data` que produce `buildControlPresupuestoData`.
 *
 * `buildSampleData(modo)` arma la muestra según el modo de moneda elegido en el
 * editor, para que el preview refleje exactamente lo que verá el usuario:
 *  - 'nominal' (default): pesos reales, sin columna de equivalencia.
 *  - 'cac': pesos a hoy + columna de equivalencia en unidades CAC.
 *  - 'usd': importes en dólares.
 */

const INDICE_CAC = 500;   // pesos por unidad CAC (muestra)
const DOLAR = 1250;       // pesos por USD (muestra)

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

const PRESUPUESTADO_ARS = 8750000;

const MODO_LABEL = { nominal: 'Nominal', cac: 'CAC a hoy', usd: 'USD' };

export function buildSampleData(modo = 'nominal') {
  const esCac = modo === 'cac';
  const esUsd = modo === 'usd';
  const moneda = esUsd ? 'USD' : 'ARS';

  const montoDe = (ars) => (esUsd ? Math.round(ars / DOLAR) : ars);
  const equivDe = (ars) => ars / INDICE_CAC; // unidades CAC

  let acum = 0;
  let acumEquiv = 0;
  const movimientos = ROWS.map((r, i) => {
    const monto = montoDe(r.ars);
    acum += monto;
    const monto_equiv = esCac ? equivDe(r.ars) : null;
    if (esCac) acumEquiv += monto_equiv;
    return {
      numero: i + 1,
      fecha: r.fecha,
      detalle: 'Entrega',
      proveedor: 'Rodrigo Soria',
      categoria: 'Albañilería',
      monto,
      acumulado: acum,
      monto_equiv,
      acumulado_equiv: esCac ? acumEquiv : null,
    };
  });

  const presupuestado = montoDe(PRESUPUESTADO_ARS);
  const ejecutado = acum;
  const saldo = presupuestado - ejecutado;
  const presupuestado_equiv = esCac ? equivDe(PRESUPUESTADO_ARS) : null;
  const ejecutado_equiv = esCac ? acumEquiv : null;

  return {
    titulo: 'RECIBO DE PAGOS',
    fecha_emision: '22/5/2026',
    empresa_nombre: 'Tu empresa',
    domicilio: 'Costa de Oro',
    contratista: 'Rodrigo Soria',
    obra: 'Casa Tatán',
    presupuesto_label: 'Albañilería 1° etapa',
    tipo: 'gastos',
    modo,
    modo_label: MODO_LABEL[modo] || MODO_LABEL.nominal,
    moneda,
    indexacion: esCac ? 'CAC' : null,
    mostrar_equiv: esCac,
    equiv_label: esCac ? 'CAC' : '',
    presupuestado,
    ejecutado,
    saldo,
    avance_pct: presupuestado ? (ejecutado / presupuestado) * 100 : 0,
    presupuestado_equiv,
    ejecutado_equiv,
    saldo_equiv: esCac ? presupuestado_equiv - ejecutado_equiv : null,
    movimientos,
  };
}

// Compat: muestra por defecto (modo nominal).
const CONTROL_PRESUPUESTO_SAMPLE_DATA = buildSampleData('nominal');

export default CONTROL_PRESUPUESTO_SAMPLE_DATA;
