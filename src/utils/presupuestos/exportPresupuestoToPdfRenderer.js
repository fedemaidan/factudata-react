import { pdf } from '@react-pdf/renderer';
import { PresupuestoPdfDocument } from './PdfPresupuestoDocument';
import cacService from 'src/services/cacService';
import MonedasService from 'src/services/monedasService';

const sanitizeFileName = (value) =>
  (value || 'presupuesto')
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '')
    .slice(0, 40);

import { loadImageAsDataUrl } from './loadLogoForPdf';
import { getM2BaseFromPresupuesto } from './presupuestoM2Base';

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

const getM2Base = getM2BaseFromPresupuesto;

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

/** Misma lógica que al exportar el PDF (costos por m² en tabla). Reutilizable para vista previa. */
export async function calcularCostoM2DataForPdf(presupuesto) {
  const rubros = presupuesto?.rubros || [];
  const totalNeto = Number(presupuesto?.total_neto) || rubros.reduce((acc, r) => acc + (Number(r.monto) || 0), 0);
  const anexos = presupuesto?.anexos || [];
  const impactoAnexos = anexos.reduce((s, a) => s + (Number(a.monto_diferencia) || 0), 0);
  const totalActualizado = totalNeto + impactoAnexos;
  const currency = (presupuesto?.moneda || 'ARS').toUpperCase();
  const m2Base = getM2Base(presupuesto);

  if (m2Base <= 0 || totalActualizado <= 0) return null;

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

  const fechaRef = presupuesto?.fecha || presupuesto?.createdAt;
  const fechaMes = formatFechaMes(fechaRef);
  const mesCacRef = (() => {
    const m = fechaMes;
    if (!m || m.length < 7) return '';
    const [y, mo] = m.split('-').map(Number);
    const d = new Date(y, mo - 3, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  if (snapshot?.tipo === 'CAC') {
    valorCac = Number(snapshot?.valor) || null;
  } else {
    try {
      const cacData = mesCacRef ? await cacService.getCacPorFecha(mesCacRef) : null;
      valorCac = cacData?.general ?? null;
    } catch (err) {
      console.warn('No se pudo obtener CAC para PDF:', err);
    }
  }

  // Formato legible del mes CAC para el PDF (ej: "02/2025") — 2 meses atrás
  const mesRefCac = snapshot?.tipo === 'CAC' ? (snapshot.fecha_origen || mesCacRef) : mesCacRef;
  const cacMesReferencia = mesRefCac && mesRefCac.length >= 7 ? `${mesRefCac.slice(5, 7)}/${mesRefCac.slice(0, 4)}` : null;

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

  const out = {
    ars: costoM2Ars != null && Number.isFinite(costoM2Ars) ? costoM2Ars : null,
    usd: costoM2Usd != null && Number.isFinite(costoM2Usd) ? costoM2Usd : null,
    cac: costoM2Cac != null && Number.isFinite(costoM2Cac) ? costoM2Cac : null,
    cacMesReferencia,
  };
  const tieneAlguno =
    (out.ars != null && out.ars > 0) ||
    (out.usd != null && out.usd > 0) ||
    (out.cac != null && out.cac > 0);
  return tieneAlguno ? out : null;
};

export async function exportPresupuestoToPdfRenderer(
  presupuesto,
  { empresa, incluirTotalesM2 = true } = {}
) {
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

  let costoM2Data = null;
  if (incluirTotalesM2) {
    try {
      costoM2Data = await calcularCostoM2DataForPdf(presupuesto);
    } catch (err) {
      console.warn('Error al calcular costo por m² para PDF:', err);
    }
  }

  let logoDataUrl = null;
  const logoUrl = presupuesto.empresa_logo_url;
  if (logoUrl) {
    logoDataUrl = await loadImageAsDataUrl(logoUrl);
  }

  const doc = (
    <PresupuestoPdfDocument
      presupuesto={presupuesto}
      empresa={empresa}
      costoM2Data={costoM2Data}
      incluirTotalesM2={incluirTotalesM2}
      logoDataUrl={logoDataUrl}
    />
  );
  const blob = await pdf(doc).toBlob();
  downloadBlob(blob, `${fileName || 'presupuesto'}.pdf`);
}
