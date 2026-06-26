/**
 * Valores NOMINALES (pesos reales, sin "caquificar") de un presupuesto y sus
 * movimientos. Fuente única de las fórmulas que antes vivían inline en los
 * tooltips del PresupuestoDrawer, reutilizadas por el export a PDF (modo nominal).
 *
 * "Nominal" = el peso del momento, sin reexpresar a pesos de hoy vía índice CAC.
 * Para presupuestos indexados, los adicionales se valúan con su PROPIO
 * cotizacion_snapshot (el valor del momento en que se agregaron, no el actual).
 */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Presupuestado nominal en pesos (o en su moneda nativa si el presupuesto es plano).
 * - Indexado (CAC/USD): monto_ingresado original + Σ adicionales valuados a su snapshot.
 * - Plano: presupuesto.monto (ya incluye adicionales, en su moneda nativa).
 */
export function calcPresupuestadoNominal(presupuesto) {
  const p = presupuesto || {};
  if (p.indexacion === 'CAC' || p.indexacion === 'USD') {
    const base = num(p.monto_ingresado);
    const adicionales = (p.adicionales || []).reduce((s, a) => {
      const monto = num(a?.monto);
      const snap = a?.cotizacion_snapshot || {};
      const cotiz = p.indexacion === 'CAC'
        ? (snap.cac_indice ?? snap.cac_general ?? null)
        : (snap.dolar_blue ?? null);
      return s + (cotiz ? monto * num(cotiz) : 0);
    }, 0);
    return base + adicionales;
  }
  return num(p.monto);
}

/**
 * Ejecutado nominal en pesos: suma de los movimientos al peso del momento.
 * Usa la equivalencia en ARS guardada en cada movimiento (que ya refleja el valor
 * nominal pagado), con fallback al total nativo. Mismo criterio por fila que el
 * modo nominal de buildControlPresupuestoData, para que totales y filas coincidan.
 */
export function calcEjecutadoNominalARS(movimientos, baseCalculo = 'total') {
  const campo = baseCalculo === 'subtotal' ? 'subtotal' : 'total';
  return (movimientos || []).reduce((s, m) => {
    const eq = m?.equivalencias?.[campo] || m?.equivalencias?.total || {};
    const ars = eq.ars != null ? num(eq.ars) : num(m?.[campo] ?? m?.total);
    return s + ars;
  }, 0);
}
