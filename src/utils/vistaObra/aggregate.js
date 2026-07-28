// Agregación de la Vista única de obra (TAR-579).
//
// Cruza los tres datasets de reportes —movimientos, presupuestos, planes de cobro—
// y produce, TODO en dólares:
//   1. buildObraRows()  → una fila por obra (el "pantallazo Roberto: presupuesto 100, cobró 50")
//   2. buildTotales()   → los 4 KPIs de cartera (o de la obra elegida)
//   3. buildDetalle()   → el detalle de una obra (cash flow, cuotas, gasto por categoría, m²)
//
// Dos "presupuestos" distintos, separados por `tipo`:
//   - presupuesto de COSTO  = tipo 'egreso'  → se compara contra lo GASTADO (movimientos egreso)
//   - presupuesto de VENTA  = tipo 'ingreso' → se compara contra lo COBRADO (planes de cobro)
//   margen = venta − costo.

import {
  movimientoUsd,
  presupuestoUsd,
  cuotaEsperadoUsd,
  cuotaCobradoUsd,
  cuotaEstaVencida,
  cuotaEsAdicional,
  fechaCuota,
  planProyectoId,
  ESTADOS_PENDIENTES,
} from './valuation';

const proyIdDeMov = (m) => m?.proyecto_id ?? m?.proyecto ?? null;
const categoriaDeMov = (m) => (m?.categoria || 'Sin categoría').toString();

// Categorías presupuestadas de un presupuesto (clasificaciones[].categoria, o rubro).
function categoriasDePresupuesto(p) {
  if (Array.isArray(p?.clasificaciones) && p.clasificaciones.length > 0) {
    return p.clasificaciones.map((c) => (c?.categoria || 'Sin categoría').toString());
  }
  return [p?.rubro || 'Sin categoría'];
}

function safeDiv(a, b) {
  return b > 0 ? a / b : null;
}

// ─────────────────────────────────────────────────────────────
//  1. Filas por obra
// ─────────────────────────────────────────────────────────────
export function buildObraRows({ proyectos = [], movimientos = [], presupuestos = [], planes = [], dolar = 0 }) {
  const porId = new Map();
  const getBucket = (id, nombre) => {
    const key = id || 'sin_obra';
    if (!porId.has(key)) {
      porId.set(key, {
        proyectoId: id || null,
        nombre: nombre || 'Sin obra',
        venta: 0,
        costo: 0,
        gastado: 0,
        cobrado: 0,
        aCobrar: 0,
        esteMes: 0,
        vencido: 0,
        m2: 0,
        tienePlan: false,
      });
    }
    return porId.get(key);
  };

  // Sembrar con los proyectos conocidos (para que aparezcan aunque no tengan movimientos aún).
  const nombrePorId = new Map();
  proyectos.forEach((p) => {
    nombrePorId.set(p.id, p.nombre);
    const b = getBucket(p.id, p.nombre);
    b.m2 = Number(p?.superficie_total_m2 ?? p?.superficie ?? 0) || 0;
  });

  // Movimientos: gastado (egreso) y cobrado-caja (ingreso, sólo como fallback).
  movimientos.forEach((m) => {
    const id = proyIdDeMov(m);
    const b = getBucket(id, nombrePorId.get(id) || m?.proyecto_nombre || m?.proyecto);
    const usd = movimientoUsd(m, 'total');
    if (m?.type === 'egreso') b.gastado += usd;
    else if (m?.type === 'ingreso') b.cobradoCaja = (b.cobradoCaja || 0) + usd;
  });

  // Presupuestos: costo (egreso) y venta (ingreso).
  presupuestos.forEach((p) => {
    const id = p?.proyecto_id ?? null;
    const b = getBucket(id, nombrePorId.get(id) || p?.proyecto_nombre || p?.nombre_proyecto);
    const usd = presupuestoUsd(p, dolar);
    if (p?.tipo === 'ingreso') b.venta += usd;
    else b.costo += usd;
  });

  // Planes de cobro: a cobrar total, cobrado real, y buckets vencido / este mes.
  const now = new Date();
  const mesActual = now.getFullYear() * 12 + now.getMonth();
  planes.forEach((plan) => {
    const id = planProyectoId(plan);
    const b = getBucket(id, nombrePorId.get(id));
    b.tienePlan = true;
    (plan?.cuotas || []).forEach((cuota) => {
      const esperado = cuotaEsperadoUsd(cuota, plan, dolar);
      const cobrado = cuotaCobradoUsd(cuota, plan, dolar);
      b.aCobrar += esperado;
      b.cobrado += cobrado;
      const pendiente = ESTADOS_PENDIENTES.has(cuota?.estado);
      const restante = Math.max(esperado - cobrado, 0);
      if (pendiente && cuotaEstaVencida(cuota)) {
        b.vencido += restante;
      } else if (pendiente) {
        const f = fechaCuota(cuota);
        if (f && f.getFullYear() * 12 + f.getMonth() === mesActual) b.esteMes += restante;
      }
    });
  });

  const rows = [...porId.values()].map((b) => {
    // Venta: presupuesto de venta; si no hay, caemos al total del plan de cobro.
    const venta = b.venta > 0 ? b.venta : b.aCobrar;
    // Cobrado: real de planes; si la obra no tiene plan, usamos ingresos de caja.
    const cobrado = b.tienePlan ? b.cobrado : (b.cobradoCaja || 0);
    const margen = venta - b.costo;
    return {
      proyectoId: b.proyectoId,
      nombre: b.nombre,
      venta,
      cobrado,
      costo: b.costo,
      gastado: b.gastado,
      margen,
      margenPct: venta > 0 ? margen / venta : null,
      pctCobrado: venta > 0 ? cobrado / venta : null,
      pctGastado: b.costo > 0 ? b.gastado / b.costo : null,
      aCobrar: b.aCobrar,
      esteMes: b.esteMes,
      vencido: b.vencido,
      m2: b.m2,
      costoM2: safeDiv(b.costo, b.m2),
      precioM2: safeDiv(venta, b.m2),
      gananciaM2: safeDiv(margen, b.m2),
      modoCobro: b.tienePlan ? 'Por cuotas' : null,
    };
  });

  // Sin obra al final; el resto por venta desc.
  rows.sort((a, b) => {
    if (!a.proyectoId) return 1;
    if (!b.proyectoId) return -1;
    return b.venta - a.venta;
  });
  return rows;
}

// ─────────────────────────────────────────────────────────────
//  2. Totales de cartera (o de la obra filtrada)
// ─────────────────────────────────────────────────────────────
export function buildTotales(rows = []) {
  const t = rows.reduce(
    (acc, r) => {
      acc.venta += r.venta;
      acc.cobrado += r.cobrado;
      acc.costo += r.costo;
      acc.gastado += r.gastado;
      acc.aCobrar += r.aCobrar;
      acc.esteMes += r.esteMes;
      acc.vencido += r.vencido;
      acc.m2 += r.m2;
      return acc;
    },
    { venta: 0, cobrado: 0, costo: 0, gastado: 0, aCobrar: 0, esteMes: 0, vencido: 0, m2: 0 },
  );
  const margen = t.venta - t.costo;
  return {
    ...t,
    margen,
    margenPct: t.venta > 0 ? margen / t.venta : null,
    pctGastado: t.costo > 0 ? t.gastado / t.costo : null,
    costoM2: safeDiv(t.costo, t.m2),
    precioM2: safeDiv(t.venta, t.m2),
    gananciaM2: safeDiv(margen, t.m2),
  };
}

// ─────────────────────────────────────────────────────────────
//  3. Detalle de una obra
// ─────────────────────────────────────────────────────────────
export function buildDetalle({ proyecto, movimientos = [], presupuestos = [], planes = [], dolar = 0 }) {
  const proyectoId = proyecto?.id ?? null;
  const m2 = Number(proyecto?.superficie_total_m2 ?? proyecto?.superficie ?? 0) || 0;

  const movsObra = movimientos.filter((m) => proyIdDeMov(m) === proyectoId);
  const presObra = presupuestos.filter((p) => (p?.proyecto_id ?? null) === proyectoId);
  const planesObra = planes.filter((plan) => planProyectoId(plan) === proyectoId);

  return {
    cashflow: buildCashflow(planesObra, dolar),
    cuotas: buildCuotasQuienDebe(planesObra, dolar),
    gastoPorCategoria: buildGastoPorCategoria(movsObra, presObra, dolar),
    analisisM2: buildAnalisisM2(presObra, m2, dolar),
    m2,
  };
}

// Cash flow: esperado vs cobrado por mes (YYYY-MM).
export function buildCashflow(planes, dolar) {
  const meses = new Map();
  planes.forEach((plan) => {
    (plan?.cuotas || []).forEach((cuota) => {
      const f = fechaCuota(cuota);
      if (!f) return;
      const key = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
      if (!meses.has(key)) meses.set(key, { mes: key, esperado: 0, cobrado: 0 });
      const bucket = meses.get(key);
      bucket.esperado += cuotaEsperadoUsd(cuota, plan, dolar);
      bucket.cobrado += cuotaCobradoUsd(cuota, plan, dolar);
    });
  });
  return [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes));
}

// Cuotas que todavía se deben, ordenadas por vencimiento.
export function buildCuotasQuienDebe(planes, dolar) {
  const items = [];
  planes.forEach((plan) => {
    (plan?.cuotas || []).forEach((cuota) => {
      if (!ESTADOS_PENDIENTES.has(cuota?.estado)) return;
      const esperado = cuotaEsperadoUsd(cuota, plan, dolar);
      const cobrado = cuotaCobradoUsd(cuota, plan, dolar);
      const restante = Math.max(esperado - cobrado, 0);
      if (restante <= 0) return;
      items.push({
        id: cuota?.id ?? cuota?._id ?? `${plan?._id}-${cuota?.numero}`,
        label: cuota?.nombre || `Cuota ${cuota?.numero ?? ''}`.trim(),
        fecha: fechaCuota(cuota),
        monto: restante,
        vencida: cuotaEstaVencida(cuota),
        esAdicional: cuotaEsAdicional(cuota),
      });
    });
  });
  return items.sort((a, b) => {
    if (!a.fecha) return 1;
    if (!b.fecha) return -1;
    return a.fecha - b.fecha;
  });
}

// Gasto vs presupuesto por categoría.
export function buildGastoPorCategoria(movs, presupuestos, dolar) {
  const cats = new Map();
  const bucket = (nombre) => {
    if (!cats.has(nombre)) cats.set(nombre, { categoria: nombre, gastado: 0, presupuestado: 0 });
    return cats.get(nombre);
  };

  movs.filter((m) => m?.type === 'egreso').forEach((m) => {
    bucket(categoriaDeMov(m)).gastado += movimientoUsd(m, 'total');
  });

  presupuestos.filter((p) => p?.tipo !== 'ingreso').forEach((p) => {
    const usd = presupuestoUsd(p, dolar);
    const categorias = categoriasDePresupuesto(p);
    // Repartimos el monto en partes iguales entre las categorías del presupuesto.
    const parte = categorias.length > 0 ? usd / categorias.length : usd;
    categorias.forEach((c) => {
      bucket(c).presupuestado += parte;
    });
  });

  return [...cats.values()]
    .map((c) => ({
      ...c,
      pct: c.presupuestado > 0 ? c.gastado / c.presupuestado : null,
      excedido: c.presupuestado > 0 && c.gastado > c.presupuestado,
    }))
    .sort((a, b) => b.presupuestado - a.presupuestado);
}

// Análisis por m²: costo presupuestado por categoría dividido por los m² de la obra.
export function buildAnalisisM2(presupuestos, m2, dolar) {
  const cats = new Map();
  presupuestos.filter((p) => p?.tipo !== 'ingreso').forEach((p) => {
    const usd = presupuestoUsd(p, dolar);
    const categorias = categoriasDePresupuesto(p);
    const parte = categorias.length > 0 ? usd / categorias.length : usd;
    categorias.forEach((c) => {
      cats.set(c, (cats.get(c) || 0) + parte);
    });
  });

  const ventaTotal = presupuestos
    .filter((p) => p?.tipo === 'ingreso')
    .reduce((acc, p) => acc + presupuestoUsd(p, dolar), 0);

  return {
    filas: [...cats.entries()]
      .map(([categoria, monto]) => ({ categoria, montoM2: safeDiv(monto, m2) }))
      .sort((a, b) => (b.montoM2 ?? 0) - (a.montoM2 ?? 0)),
    precioM2: safeDiv(ventaTotal, m2),
  };
}
