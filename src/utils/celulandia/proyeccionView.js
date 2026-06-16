// Helpers para alternar entre la proyección LINEAL (como funciona hoy) y la
// PONDERADA (recalculada con la tendencia de los meses anteriores). El backend
// guarda la versión ponderada en `producto.proyeccionPonderada` (o null si no
// hay historia suficiente). Cuando el toggle está activo y hay datos ponderados,
// estos campos se muestran en lugar de los lineales; si no, se cae al lineal.

export const PROJ_PONDERADO_FIELDS = [
  "ventasProyectadas",
  "stockProyectado",
  "diasHastaAgotarStock",
  "fechaAgotamientoStock",
  "cantidadCompraSugerida",
  "fechaCompraSugerida",
  "seAgota",
  "agotamientoExcede365Dias",
];

// Campos por los que la tabla ordena server-side (subconjunto sortable).
export const PROJ_PONDERADO_SORT_FIELDS = new Set([
  "ventasProyectadas",
  "stockProyectado",
  "fechaAgotamientoStock",
  "cantidadCompraSugerida",
  "fechaCompraSugerida",
]);

// Devuelve un "item de vista": superpone los valores ponderados sobre el item
// cuando corresponde, sin mutar el original. Si no hay ponderada, devuelve el item tal cual.
export function aplicarVistaPonderada(item, usarPonderado) {
  if (!usarPonderado || !item?.proyeccionPonderada) return item;
  const p = item.proyeccionPonderada;
  const out = { ...item };
  for (const f of PROJ_PONDERADO_FIELDS) {
    if (p[f] !== undefined) out[f] = p[f];
  }
  return out;
}

// Traduce el campo de orden al path de la proyección ponderada cuando el toggle
// está activo (para que el backend ordene por ese valor). El resto queda igual.
export function ponderadoSortField(sortField, usarPonderado) {
  if (usarPonderado && PROJ_PONDERADO_SORT_FIELDS.has(sortField)) {
    return `proyeccionPonderada.${sortField}`;
  }
  return sortField;
}

// ¿Este producto tiene proyección ponderada disponible?
export function tienePonderada(item) {
  return Boolean(item?.proyeccionPonderada);
}

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Punto de la serie ({ anio, mesNum }) → "Ene 25".
export function formatMesCorto(item) {
  const mesNum = Number(item?.mesNum) || 1;
  const anio = item?.anio != null ? String(item.anio).slice(-2) : "";
  return `${MESES_CORTOS[mesNum - 1] || "?"}${anio ? ` ${anio}` : ""}`;
}

// Desglose del promedio ponderado de los últimos N meses: a cada mes se le asigna
// un peso creciente (el más viejo de la ventana = 1, el más nuevo = k). Espeja
// exactamente la fórmula del backend (tendenciaHelper.promedioPonderado).
export function desglosePonderado(serie = [], ventana = 6) {
  const ultimos = (Array.isArray(serie) ? serie : []).slice(-ventana);
  let sumaPonderada = 0;
  let sumaPesos = 0;
  const filas = ultimos.map((punto, idx) => {
    const peso = idx + 1;
    const ventasDiarias = Number(punto?.ventasDiarias) || 0;
    sumaPonderada += ventasDiarias * peso;
    sumaPesos += peso;
    return { mes: punto, peso, ventasDiarias };
  });
  const resultado = sumaPesos > 0 ? sumaPonderada / sumaPesos : 0;
  return { filas, sumaPesos, resultado };
}
