import dayjs from 'dayjs';
import { pickCac } from '../cac/pickCac';

/**
 * Construye el objeto `data` que consumen las plantillas de Control de Presupuesto
 * (la default `PdfControlPresupuestoDocument` y las custom generadas con IA) a partir
 * de los movimientos que abrió un drawer + el contexto del presupuesto.
 *
 * MODO DE VISUALIZACIÓN (`modo`) — qué moneda se muestra, decidido por el usuario en
 * el export (selector) y NO por la plantilla:
 *  - 'nominal' (default): PESOS REALES del momento. Espeja la tabla de movimientos del
 *    drawer. Presupuestado = nominal (monto_ingresado + adicionales a su snapshot),
 *    ejecutado = Σ pesos pagados. Sin columna de equivalencia.
 *  - 'cac': pesos "a hoy" = unidad nativa CAC × índice actual, con la unidad CAC al lado
 *    como equivalencia (comparación coherente en pesos de hoy).
 *  - 'usd': importes en dólares (equivalencia usd_blue de cada movimiento).
 *
 * Cada movimiento trae `equivalencias.total.{ars, usd_blue, cac}` (y `.subtotal` si
 * el presupuesto compara por neto). De ahí salen los valores por fila en cada modo.
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

const MODO_LABEL = { nominal: 'Nominal', cac: 'CAC a hoy', usd: 'USD' };

/**
 * @param {Object} opts
 * @param {Array}  opts.movimientos          Movimientos con shape de backend.
 * @param {string} opts.titulo               Título del documento (editable en el export).
 * @param {string} [opts.modo]               'nominal' | 'cac' | 'usd' (default 'nominal').
 * @param {string} [opts.indexacion]         'CAC' | 'USD' | null (indexación del presupuesto en pesos).
 * @param {string} [opts.monedaPresupuesto]  Moneda nativa del presupuesto: 'ARS' | 'USD' | 'CAC'.
 * @param {string} [opts.cacTipo]            'general' | 'mano_obra' | 'materiales'.
 * @param {number} [opts.presupuestadoNativo] Monto presupuestado en unidad nativa (CAC units / USD / ARS).
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
  cacModo = 'legacy',
} = {}) {
  const orden = [...movimientos].sort((a, b) => fechaSecs(a) - fechaSecs(b));
  const campo = baseCalculo === 'subtotal' ? 'subtotal' : 'total';
  const eqOf = (m) => (m?.equivalencias?.[campo] || m?.equivalencias?.total || {});

  // Cotización vigente para los modos que reexpresan a "hoy".
  const cotizCac = num(cacIndiceActual);
  const cotizUsd = num(tipoCambioActual);

  // ── Estrategia por movimiento según el modo ──────────────────────────────────
  // primaryOf: valor que se muestra; equivOf: unidad nativa al lado (o null).
  let primaryOf;
  let equivOf = null;
  let moneda = 'ARS';
  let equivLabel = '';

  if (modo === 'cac' && (indexacion === 'CAC') && cotizCac > 0) {
    // Pesos a hoy = unidad CAC × índice actual; equivalencia en unidades CAC.
    // La equivalencia guardada es una variante {legacy,estimado,automatico} → se elige la del modo.
    equivOf = (m) => {
      const eq = eqOf(m);
      const guardado = pickCac(eq.cac, cacModo);
      if (guardado != null) return num(guardado);
      const pesos = num(eq.ars) || num(m.total);
      return cotizCac > 0 ? pesos / cotizCac : 0;
    };
    primaryOf = (m) => equivOf(m) * cotizCac;
    equivLabel = cacLabel(cacTipo);
  } else if (modo === 'usd') {
    // Importes en dólares: usd_blue del movimiento (o total nativo si ya es USD).
    moneda = 'USD';
    primaryOf = (m) => {
      const eq = eqOf(m);
      if ((m.moneda || 'ARS') === 'USD') return num(m.total);
      return num(eq.usd_blue);
    };
  } else {
    // 'nominal' (default y fallback): pesos reales del momento.
    primaryOf = (m) => {
      const eq = eqOf(m);
      if (eq.ars != null) return num(eq.ars);
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

  const ejecutadoEquiv = equivOf ? acumEquiv : null;
  const ejecutado = acumPrimary;

  // ── Presupuestado en la unidad primaria del modo ─────────────────────────────
  let presupuestadoPrimary;
  let presupuestadoEquiv = null;
  if (modo === 'cac' && indexacion === 'CAC' && cotizCac > 0) {
    const nativo = presupuestadoNativo != null
      ? num(presupuestadoNativo)
      : (montoIngresado != null ? num(montoIngresado) / cotizCac : (ejecutadoEquiv || 0));
    presupuestadoEquiv = nativo;
    presupuestadoPrimary = nativo * cotizCac;
  } else if (modo === 'usd') {
    if (monedaPresupuesto === 'USD' && presupuestadoNativo != null) {
      presupuestadoPrimary = num(presupuestadoNativo);
    } else {
      const nominalARS = presupuestadoNominal != null ? num(presupuestadoNominal)
        : montoIngresado != null ? num(montoIngresado)
          : num(presupuestadoNativo != null ? presupuestadoNativo : presupuestado);
      presupuestadoPrimary = cotizUsd > 0 ? nominalARS / cotizUsd : 0;
    }
  } else {
    // nominal
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
    indexacion: modo === 'cac' ? indexacion : null,
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
