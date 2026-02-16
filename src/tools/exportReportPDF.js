import ReportService from 'src/services/reportService';
import { executeReport } from 'src/tools/reportEngine';

/**
 * Genera y descarga un PDF del reporte con los filtros aplicados.
 *
 * @param {Object} params
 * @param {Object} params.reportConfig     - Configuración del reporte
 * @param {Array}  params.movimientos      - Movimientos ya filtrados
 * @param {Array}  params.presupuestos     - Presupuestos
 * @param {Array}  params.displayCurrencies - ['ARS', 'USD', ...]
 * @param {Object} params.cotizaciones     - { dolar_blue, cac }
 * @param {Object} [params.filters]        - Filtros aplicados (para mostrar en el PDF)
 */
export async function exportReportToPDF({
  reportConfig,
  movimientos,
  presupuestos,
  displayCurrencies,
  cotizaciones,
  filters = {},
}) {
  // 1. Ejecutar el engine para obtener los resultados
  const results = executeReport(reportConfig, movimientos, presupuestos, displayCurrencies, cotizaciones);
  const displayCurrency = displayCurrencies?.[0] || reportConfig.display_currency || 'ARS';

  // 2. Construir texto descriptivo de filtros
  const filtrosTexto = buildFiltrosTexto(filters);

  // 3. Enviar al backend para generar el PDF
  const blob = await ReportService.exportPDF({
    reportConfig,
    results,
    displayCurrency,
    movimientosCount: movimientos.length,
    filtrosTexto,
  });

  // 4. Descargar el archivo
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(reportConfig.nombre || 'Reporte').replace(/[^\w\s-]/g, '')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function buildFiltrosTexto(filters) {
  const parts = [];

  if (filters.fecha_from || filters.fecha_to) {
    const from = filters.fecha_from ? fmtDate(filters.fecha_from) : '...';
    const to = filters.fecha_to ? fmtDate(filters.fecha_to) : '...';
    parts.push(`Fecha: ${from} → ${to}`);
  }

  if (filters.tipo) {
    parts.push(`Tipo: ${filters.tipo}`);
  }

  if (filters.categorias?.length > 0) {
    parts.push(`Cat: ${filters.categorias.join(', ')}`);
  }

  if (filters.proveedores?.length > 0) {
    parts.push(`Prov: ${filters.proveedores.join(', ')}`);
  }

  if (filters.moneda_equivalente?.length > 0) {
    parts.push(`Moneda: ${filters.moneda_equivalente.join(', ')}`);
  }

  return parts.join(' · ');
}

function fmtDate(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-AR');
}
