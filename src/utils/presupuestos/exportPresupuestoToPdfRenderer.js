import { pdf } from '@react-pdf/renderer';
import { PresupuestoPdfDocument } from './PdfPresupuestoDocument';
import cacService from 'src/services/cacService';
import MonedasService from 'src/services/monedasService';

const sanitizeFileName = (value) =>
  (value || 'presupuesto')
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '')
    .slice(0, 40);

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

const getM2Base = (presupuesto) => {
  const analisis = presupuesto?.analisis_superficies;
  if (!analisis) return 0;
  const cubierta = Number(analisis.sup_cubierta_m2) || 0;
  const patios = Number(analisis.sup_patios_m2) || 0;
  const coef = Number(analisis.coef_patios) >= 0 ? (Number(analisis.coef_patios) || 0.5) : 0.5;
  const ponderadaOriginal = Number(analisis.sup_ponderada_m2) || 0;
  return ponderadaOriginal || cubierta + patios * coef || 0;
};

const formatFechaMes = (fechaRef) => {
  const d = fechaRef ? new Date(fechaRef) : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
};

const resolveVersionActual = (presupuesto) => {
  const numero = Number(presupuesto?.version_actual);
  if (!Array.isArray(presupuesto?.versiones) || !Number.isFinite(numero) || numero <= 0) return null;
  return presupuesto.versiones.find((v) => Number(v?.numero_version) === numero) || null;
};

const resolveAjusteMonetarioData = (presupuesto) => {
  const moneda = (presupuesto?.moneda || 'ARS').toUpperCase();
  const indexacion = moneda === 'USD'
    ? 'USD'
    : (presupuesto?.indexacion === 'CAC' || presupuesto?.indexacion === 'USD' ? presupuesto.indexacion : null);
  const modo = moneda === 'USD'
    ? 'Ajustar por dólar'
    : indexacion === 'CAC'
      ? 'Ajustar por CAC'
      : indexacion === 'USD'
        ? 'Ajustar por dólar'
        : 'Pesos fijos';

  const cotizacion = presupuesto?.cotizacion_snapshot || null;
  const cacTipo = presupuesto?.cac_tipo || null;
  const usdFuente = presupuesto?.usd_fuente || null;
  const usdValor = presupuesto?.usd_valor || null;

  return {
    modo,
    indexacion: indexacion || null,
    cac_tipo: cacTipo,
    usd_fuente: usdFuente,
    usd_valor: usdValor,
    cotizacion_valor: Number.isFinite(Number(cotizacion?.valor)) ? Number(cotizacion.valor) : null,
    cotizacion_fecha_origen: cotizacion?.fecha_origen || null,
    cotizacion_tipo: cotizacion?.tipo || null,
  };
};

const calcularCostoM2Data = async (presupuesto) => {
  const rubros = presupuesto?.rubros || [];
  const totalNeto = Number(presupuesto?.total_neto) || rubros.reduce((acc, r) => acc + (Number(r.monto) || 0), 0);
  const anexos = presupuesto?.anexos || [];
  const impactoAnexos = anexos.reduce((s, a) => s + (Number(a.monto_diferencia) || 0), 0);
  const totalActualizado = totalNeto + impactoAnexos;
  const currency = (presupuesto?.moneda || 'ARS').toUpperCase();
  const m2Base = getM2Base(presupuesto);

  const fallback = { ars: null, usd: null, cac: null, cacMesReferencia: null };
  if (m2Base <= 0 || totalActualizado <= 0) return fallback;

  let tipoCambio = null;
  let valorCac = null;

  const versionActual = resolveVersionActual(presupuesto);
  const equivalencias = versionActual?.equivalencias || null;
  const analisis = presupuesto?.analisis_superficies;
  const snapshot = presupuesto?.cotizacion_snapshot || null;
  tipoCambio = snapshot?.tipo === 'USD'
    ? (Number(snapshot?.valor) || null)
    : (equivalencias?.tipo_cambio_usd ?? analisis?.tipo_cambio_usado ?? null);

  if (!tipoCambio && currency !== 'USD') {
    try {
      const dolarData = await MonedasService.listarDolar({ limit: 1 });
      const d = Array.isArray(dolarData) ? dolarData[0] : dolarData;
      tipoCambio = d?.blue?.venta || d?.blue?.promedio || d?.oficial?.venta || null;
    } catch (err) {
      console.warn('No se pudo obtener tipo de cambio para PDF:', err);
    }
  }

  const fechaMes = formatFechaMes(presupuesto?.fecha || presupuesto?.createdAt);
  if (snapshot?.tipo === 'CAC') {
    valorCac = Number(snapshot?.valor) || null;
  } else {
    try {
      const cacData = await cacService.getCacPorFecha(fechaMes);
      valorCac = cacData?.general ?? null;
    } catch (err) {
      console.warn('No se pudo obtener CAC para PDF:', err);
    }
  }

  // Formato legible del mes CAC para el PDF (ej: "02/2025")
  const cacMesReferencia = fechaMes ? `${fechaMes.slice(5, 7)}/${fechaMes.slice(0, 4)}` : null;

  const totalFinalArs = currency === 'USD' && tipoCambio
    ? totalActualizado * tipoCambio
    : totalActualizado;
  const totalFinalUsd = currency === 'USD'
    ? totalActualizado
    : tipoCambio ? totalActualizado / tipoCambio : null;

  const costoM2Ars = totalFinalArs > 0 && m2Base > 0 ? totalFinalArs / m2Base : null;
  const costoM2Usd = totalFinalUsd != null && m2Base > 0 ? totalFinalUsd / m2Base : null;
  const costoM2Cac = valorCac && totalFinalArs > 0 && m2Base > 0
    ? (totalFinalArs / valorCac) / m2Base
    : null;

  return {
    ars: costoM2Ars != null && Number.isFinite(costoM2Ars) ? costoM2Ars : null,
    usd: costoM2Usd != null && Number.isFinite(costoM2Usd) ? costoM2Usd : null,
    cac: costoM2Cac != null && Number.isFinite(costoM2Cac) ? costoM2Cac : null,
    cacMesReferencia,
    ajusteMonetario: resolveAjusteMonetarioData(presupuesto),
  };
};

export async function exportPresupuestoToPdfRenderer(presupuesto, { empresa } = {}) {
  if (!presupuesto) {
    throw new Error('Presupuesto inválido');
  }
  const rubros = presupuesto.rubros || [];
  if (!rubros.length) {
    throw new Error('El presupuesto no tiene rubros');
  }

  const fileName = `${sanitizeFileName(presupuesto.titulo)}_${sanitizeFileName(
    empresa?.nombre || presupuesto.empresa_nombre
  )}`;

  let costoM2Data = { ars: null, usd: null, cac: null, cacMesReferencia: null, ajusteMonetario: null };
  try {
    costoM2Data = await calcularCostoM2Data(presupuesto);
  } catch (err) {
    console.warn('Error al calcular costo por m² para PDF:', err);
  }

  const doc = (
    <PresupuestoPdfDocument
      presupuesto={presupuesto}
      empresa={empresa}
      costoM2Data={costoM2Data}
      ajusteMonetarioData={costoM2Data?.ajusteMonetario || resolveAjusteMonetarioData(presupuesto)}
    />
  );
  const blob = await pdf(doc).toBlob();
  downloadBlob(blob, `${fileName || 'presupuesto'}.pdf`);
}
