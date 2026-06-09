import dayjs from 'dayjs';

/**
 * Construye el objeto `data` que consumen las plantillas de Control de Presupuesto
 * (la default `PdfControlPresupuestoDocument` y las custom generadas con IA) a partir
 * de los movimientos que abrió un drawer + el contexto del presupuesto.
 *
 * MONEDA / INDEXACIÓN (espejo de PresupuestoItem y la pestaña Movimientos del
 * PresupuestoDrawer, que es la lógica ya validada):
 *  - Presupuesto indexado (CAC o dólar): la unidad NATIVA (CAC / USD) es la base de
 *    comparación coherente. Mostramos PESOS A HOY = nativo × índice actual, y la
 *    equivalencia en la unidad nativa al lado. Así presupuestado/ejecutado/saldo
 *    quedan SIEMPRE en la misma unidad (nunca pesos − CAC).
 *  - Presupuesto en dólares (nativo, sin indexar): solo dólares.
 *  - Presupuesto en pesos plano: solo pesos.
 *
 * Cada movimiento trae `equivalencias.total.{ars, usd_blue, cac}` (y `.subtotal` si
 * el presupuesto compara por neto). De ahí salen las equivalencias por fila.
 */

const fechaSecs = (m) => m?.fecha_factura?._seconds || m?.fecha_factura?.seconds || 0;

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

/**
 * @param {Object} opts
 * @param {Array}  opts.movimientos          Movimientos con shape de backend.
 * @param {string} opts.titulo               Título del documento (editable en el export).
 * @param {string} [opts.indexacion]         'CAC' | 'USD' | null (indexación del presupuesto en pesos).
 * @param {string} [opts.monedaPresupuesto]  Moneda nativa del presupuesto: 'ARS' | 'USD' | 'CAC'.
 * @param {string} [opts.cacTipo]            'general' | 'mano_obra' | 'materiales'.
 * @param {string} [opts.baseCalculo]        'total' | 'subtotal'.
 * @param {number} [opts.presupuestadoNativo] Monto presupuestado en unidad nativa (CAC units / USD / ARS).
 * @param {number} [opts.presupuestado]      Compat: monto ya en moneda de vista (export a nivel proyecto).
 * @param {number} [opts.montoIngresado]     Pesos originales (fallback si falta el nativo).
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
  indexacion = null,
  monedaPresupuesto = null,
  cacTipo = null,
  baseCalculo = 'total',
  presupuestadoNativo = null,
  presupuestado = 0,
  montoIngresado = null,
  cacIndiceActual = null,
  tipoCambioActual = null,
} = {}) {
  const orden = [...movimientos].sort((a, b) => fechaSecs(a) - fechaSecs(b));
  const campo = baseCalculo === 'subtotal' ? 'subtotal' : 'total';
  const eqOf = (m) => (m?.equivalencias?.[campo] || m?.equivalencias?.total || {});

  // Cotización vigente y clave de equivalencia según el tipo de presupuesto.
  const cotiz = indexacion === 'CAC' ? num(cacIndiceActual)
    : indexacion === 'USD' ? num(tipoCambioActual)
      : null;
  const indexado = (indexacion === 'CAC' || indexacion === 'USD') && cotiz > 0;
  const usdNativo = !indexado && monedaPresupuesto === 'USD';

  // Por movimiento: valor en la unidad PRIMARIA (lo que se muestra) y en la EQUIVALENTE.
  let primaryOf;   // pesos a hoy (indexado/ARS) o USD (nativo)
  let equivOf;     // unidad nativa CAC/USD (solo indexado) o null

  if (indexado) {
    const equivKey = indexacion === 'CAC' ? 'cac' : 'usd_blue';
    // nativo: equivalencia guardada; si falta, lo derivamos del valor en pesos.
    equivOf = (m) => {
      const eq = eqOf(m);
      if (eq[equivKey] != null) return num(eq[equivKey]);
      const pesos = num(eq.ars) || num(m.total);
      return cotiz > 0 ? pesos / cotiz : 0;
    };
    primaryOf = (m) => equivOf(m) * cotiz; // pesos a hoy
  } else if (usdNativo) {
    equivOf = null;
    primaryOf = (m) => {
      const eq = eqOf(m);
      if ((m.moneda || 'ARS') === 'USD') return num(m.total);
      return num(eq.usd_blue);
    };
  } else {
    // Pesos plano / fallback a nivel proyecto (presupuestos mixtos).
    equivOf = null;
    primaryOf = (m) => {
      const eq = eqOf(m);
      if ((m.moneda || 'ARS') === 'USD') return num(eq.ars) || num(m.total);
      return num(m.total);
    };
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

  // ── Totales en unidad coherente ──────────────────────────────────────────────
  const ejecutadoEquiv = equivOf ? acumEquiv : null;            // unidad nativa
  const ejecutado = acumPrimary;                                // unidad primaria

  // Presupuestado nativo: provisto, o derivado de los pesos originales.
  const nativo = presupuestadoNativo != null
    ? num(presupuestadoNativo)
    : (montoIngresado != null && cotiz > 0 ? num(montoIngresado) / cotiz : null);

  let presupuestadoPrimary;
  let presupuestadoEquiv;
  if (indexado) {
    presupuestadoEquiv = nativo != null ? nativo : (ejecutadoEquiv || 0);
    presupuestadoPrimary = presupuestadoEquiv * cotiz;          // pesos a hoy
  } else {
    presupuestadoEquiv = null;
    presupuestadoPrimary = presupuestadoNativo != null ? num(presupuestadoNativo) : num(presupuestado);
  }

  const saldo = presupuestadoPrimary - ejecutado;
  const saldoEquiv = equivOf ? (presupuestadoEquiv - ejecutadoEquiv) : null;
  const avance_pct = presupuestadoPrimary ? (ejecutado / presupuestadoPrimary) * 100 : 0;

  const moneda = usdNativo ? 'USD' : 'ARS';
  const equiv_label = indexacion === 'CAC' ? cacLabel(cacTipo)
    : indexacion === 'USD' ? 'USD'
      : '';

  return {
    titulo,
    fecha_emision: dayjs().format('D/M/YYYY'),
    empresa_nombre: empresaNombre,
    domicilio,
    contratista,
    obra,
    presupuesto_label: presupuestoLabel,
    tipo,
    moneda,
    indexacion: indexado ? indexacion : null,
    mostrar_equiv: !!equivOf,
    equiv_label,
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
