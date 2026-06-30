import dayjs from 'dayjs';

/**
 * Construye el objeto `data` que consumen las plantillas de Control de Presupuesto
 * (la default `PdfControlPresupuestoDocument` y las custom generadas con IA) a partir
 * de los movimientos que abrió un drawer + el contexto del presupuesto.
 *
 * MODO DE VISUALIZACIÓN (`modo`) — qué moneda se muestra, decidido por el usuario en
 * el export (selector) y NO por la plantilla:
 *  - 'nominal' (default): pesos reales del momento. Sin columna de equivalencia.
 *  - 'cac' / 'usd' (indexado): los MOVIMIENTOS muestran la moneda real (pesos nominales,
 *    o dólares si es nativo USD) y al lado el equivalente en el índice (CAC / USD). El
 *    RESUMEN (presupuestado/ejecutado/saldo) se expresa en la UNIDAD DEL ÍNDICE
 *    (campos `*_equiv`), con su ≈ pesos a hoy como referencia (campos `*`). Nunca se
 *    muestra el "pesos a hoy" caquificado como columna principal de los movimientos.
 *  - 'usd' nativo (presupuesto en dólares, sin indexar): solo dólares, sin equivalencia.
 *
 * Cada movimiento trae `equivalencias.total.{ars, usd_blue, cac, cac_mano_obra,
 * cac_materiales}` (y `.subtotal` si el presupuesto compara por neto). De ahí salen los
 * valores por fila en cada modo.
 *
 * Asimetría intencional en modos índice: el `≈ pesos a hoy` del resumen (índice ×
 * cotización actual) puede no coincidir con la suma de la columna nominal de los
 * movimientos (plata real pagada). Son conceptos distintos.
 */

// Segundos epoch de fecha_factura. Soporta Firestore Timestamp ({_seconds}/{seconds})
// y también Date/string ISO (Mongo) — si no, el sort cronológico no ordena y el
// acumulado queda en el orden de entrada (del más nuevo al más viejo).
const fechaSecs = (m) => {
  const f = m?.fecha_factura;
  if (!f) return 0;
  if (typeof f._seconds === 'number') return f._seconds;
  if (typeof f.seconds === 'number') return f.seconds;
  const d = dayjs(f);
  return d.isValid() ? d.unix() : 0;
};

const fechaStr = (m) => {
  const s = fechaSecs(m);
  if (s) return dayjs.unix(s).format('D/M/YYYY');
  if (m?.fecha_factura) return dayjs(m.fecha_factura).format('D/M/YYYY');
  return '';
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const cacLabel = (cacTipo) =>
  cacTipo === 'mano_obra' ? 'CAC MO' : cacTipo === 'materiales' ? 'CAC MAT' : 'CAC';

const cacEquivKey = (cacTipo) =>
  cacTipo === 'mano_obra' ? 'cac_mano_obra' : cacTipo === 'materiales' ? 'cac_materiales' : 'cac';

const MODO_LABEL = { nominal: 'Nominal', cac: 'CAC a hoy', usd: 'USD' };

/**
 * @param {Object} opts
 * @param {Array}  opts.movimientos          Movimientos con shape de backend.
 * @param {string} opts.titulo               Título del documento (editable en el export).
 * @param {string} [opts.modo]               'nominal' | 'cac' | 'usd' (default 'nominal').
 * @param {string} [opts.indexacion]         'CAC' | 'USD' | null (indexación del presupuesto en pesos).
 * @param {string} [opts.monedaPresupuesto]  Moneda nativa del presupuesto: 'ARS' | 'USD' | 'CAC'.
 * @param {string} [opts.cacTipo]            'general' | 'mano_obra' | 'materiales'.
 * @param {number} [opts.presupuestadoNativo] Presupuestado en unidad índice (CAC units / USD).
 * @param {number} [opts.presupuestadoNominal] Presupuestado nominal en pesos (calcPresupuestadoNominal).
 * @param {number} [opts.presupuestado]      Compat: monto ya en moneda de vista (export a nivel proyecto).
 * @param {number} [opts.montoIngresado]     Pesos originales (fallback para nominal/derivados).
 * @param {number} [opts.cacIndiceActual]    Índice CAC de hoy (según cacTipo).
 * @param {number} [opts.tipoCambioActual]   Dólar de hoy.
 */
export function buildControlPresupuestoData({
  movimientos = [],
  titulo = 'RECIBO DE PAGOS',
  presupuestoLabel = '',
  contratista = '',
  obra = '',
  empresaNombre = '',
  domicilio = '',
  tipo = 'gastos',
  modo = 'nominal',
  indexacion = null,
  monedaPresupuesto = null,
  cacTipo = null,
  baseCalculo = 'total',
  presupuestadoNativo = null,
  presupuestadoNominal = null,
  presupuestado = 0,
  montoIngresado = null,
  cacIndiceActual = null,
  tipoCambioActual = null,
} = {}) {
  const orden = [...movimientos].sort((a, b) => fechaSecs(a) - fechaSecs(b));
  const campo = baseCalculo === 'subtotal' ? 'subtotal' : 'total';
  const eqOf = (m) => (m?.equivalencias?.[campo] || m?.equivalencias?.total || {});

  const cotizCac = num(cacIndiceActual);
  const cotizUsd = num(tipoCambioActual);

  const nominalOf = (m) => {
    const eq = eqOf(m);
    return eq.ars != null ? num(eq.ars) : num(m.total);
  };

  // Clasificación del modo. Los modos índice (cac / usd-indexado) muestran nominal +
  // equivalente; usd-nativo muestra solo dólares; nominal solo pesos.
  const esCac = modo === 'cac' && cotizCac > 0;
  const esUsdNativo = modo === 'usd' && monedaPresupuesto === 'USD' && !indexacion;
  const esUsdIndex = modo === 'usd' && !esUsdNativo;

  let primaryOf;       // columna principal de movimientos (moneda real)
  let equivOf = null;  // columna equivalente (unidad índice) o null
  let moneda = 'ARS';
  let equivLabel = '';
  let cotizModo = null; // índice → pesos a hoy en el resumen (cac o usd-indexado)

  if (esCac) {
    const key = cacEquivKey(cacTipo);
    equivLabel = cacLabel(cacTipo);
    cotizModo = cotizCac;
    primaryOf = nominalOf;
    equivOf = (m) => {
      const eq = eqOf(m);
      if (eq[key] != null) return num(eq[key]);
      return cotizCac > 0 ? nominalOf(m) / cotizCac : 0;
    };
  } else if (esUsdIndex) {
    equivLabel = 'USD';
    cotizModo = cotizUsd;
    primaryOf = nominalOf;
    equivOf = (m) => {
      const eq = eqOf(m);
      if (eq.usd_blue != null) return num(eq.usd_blue);
      if ((m.moneda || 'ARS') === 'USD') return num(m.total);
      return cotizUsd > 0 ? nominalOf(m) / cotizUsd : 0;
    };
  } else if (esUsdNativo) {
    moneda = 'USD';
    primaryOf = (m) => {
      const eq = eqOf(m);
      return (m.moneda || 'ARS') === 'USD' ? num(m.total) : num(eq.usd_blue);
    };
  } else {
    primaryOf = nominalOf; // nominal
  }

  let acumPrimary = 0;
  let acumEquiv = 0;
  const movs = orden.map((m, i) => {
    const monto = primaryOf(m);
    const montoEquiv = equivOf ? equivOf(m) : null;
    acumPrimary += monto;
    if (equivOf) acumEquiv += montoEquiv;
    return {
      numero: i + 1,
      fecha: fechaStr(m),
      detalle: m.nombre_proveedor || m.categoria || m.observacion || 'Movimiento',
      proveedor: m.nombre_proveedor || '',
      categoria: m.categoria || '',
      monto,
      acumulado: acumPrimary,
      monto_equiv: equivOf ? montoEquiv : null,
      acumulado_equiv: equivOf ? acumEquiv : null,
    };
  });

  // ── Resumen ──────────────────────────────────────────────────────────────────
  // En modos índice el resumen va en unidad índice (`*_equiv`) + ≈ pesos a hoy (`*`).
  const ejecutadoEquiv = equivOf ? acumEquiv : null;
  const ejecutado = cotizModo != null ? acumEquiv * cotizModo : acumPrimary;

  let presupuestadoPrimary;
  let presupuestadoEquiv = null;
  if (cotizModo != null) {
    const nativo = presupuestadoNativo != null ? num(presupuestadoNativo)
      : presupuestadoNominal != null ? num(presupuestadoNominal) / cotizModo
        : montoIngresado != null ? num(montoIngresado) / cotizModo
          : (ejecutadoEquiv || 0);
    presupuestadoEquiv = nativo;
    presupuestadoPrimary = nativo * cotizModo; // pesos a hoy
  } else if (esUsdNativo) {
    presupuestadoPrimary = presupuestadoNativo != null ? num(presupuestadoNativo)
      : presupuestadoNominal != null && cotizUsd > 0 ? num(presupuestadoNominal) / cotizUsd
        : num(presupuestado);
  } else {
    presupuestadoPrimary = presupuestadoNominal != null ? num(presupuestadoNominal)
      : montoIngresado != null ? num(montoIngresado)
        : num(presupuestadoNativo != null ? presupuestadoNativo : presupuestado);
  }

  const saldo = presupuestadoPrimary - ejecutado;
  const saldoEquiv = equivOf ? (presupuestadoEquiv - ejecutadoEquiv) : null;
  const avance_pct = presupuestadoPrimary ? (ejecutado / presupuestadoPrimary) * 100 : 0;

  return {
    titulo,
    fecha_emision: dayjs().format('D/M/YYYY'),
    empresa_nombre: empresaNombre,
    domicilio,
    contratista,
    obra,
    presupuesto_label: presupuestoLabel,
    tipo,
    modo,
    modo_label: MODO_LABEL[modo] || MODO_LABEL.nominal,
    moneda,
    indexacion: esCac ? 'CAC' : esUsdIndex ? 'USD' : null,
    mostrar_equiv: !!equivOf,
    equiv_label: equivLabel,
    presupuestado: presupuestadoPrimary,
    ejecutado,
    saldo,
    avance_pct,
    presupuestado_equiv: presupuestadoEquiv,
    ejecutado_equiv: ejecutadoEquiv,
    saldo_equiv: saldoEquiv,
    movimientos: movs,
  };
}

export default buildControlPresupuestoData;
