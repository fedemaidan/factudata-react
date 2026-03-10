import { pdf } from '@react-pdf/renderer';
import api from 'src/services/axiosConfig';
import { getImageProxyUrl } from 'src/services/proxyService';
import { PdfTrabajoDiarioDocument } from './PdfTrabajoDiarioDocument';

const USE_PROXY_ORIGINS = ['storage.googleapis.com', 'firebasestorage.googleapis.com'];
const COMPROBANTE_TIPOS_IMAGEN = ['licencia', 'parte'];

const shouldUseProxy = (url, comprobanteType) =>
  url &&
  typeof url === 'string' &&
  COMPROBANTE_TIPOS_IMAGEN.includes(comprobanteType) &&
  USE_PROXY_ORIGINS.some((o) => url.includes(o));

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

const sanitizeFileName = (value = 'trabajador') =>
  value
    .toString()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '')
    .slice(0, 60) || 'trabajador';

const formatFechaArchivo = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
  const pad = (val) => String(val).padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = pad(date.getFullYear() % 100);
  return `${day}-${month}-${year}`;
};

const BASE64_REGEX = /^[A-Za-z0-9+/=\s]+$/;
const IMAGE_EXTENSIONS_REGEX = /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i;

const toGoogleDriveDirectUrl = (url) => {
  if (!url || !url.includes('drive.google.com')) return url;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match?.[1]) return url;
  return `https://drive.google.com/uc?export=view&id=${match[1]}`;
};

const normalizeImageSource = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  if (!trimmed.startsWith('http') && BASE64_REGEX.test(trimmed)) {
    // Fix principal del caso reportado: base64 sin prefijo data URL.
    return `data:image/jpeg;base64,${trimmed.replace(/\s+/g, '')}`;
  }

  return toGoogleDriveDirectUrl(trimmed);
};

const isImageLikeSource = (value) => {
  if (!value || typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith('data:image/')) return true;
  if (normalized.startsWith('http')) return IMAGE_EXTENSIONS_REGEX.test(normalized);
  // Base64 sin prefijo (caso soportado): lo consideramos imagen potencial.
  return BASE64_REGEX.test(normalized);
};

const convertImageUrlToPngDataUrl = async (url, comprobanteType) => {
  let blob;
  if (shouldUseProxy(url, comprobanteType)) {
    const proxyUrl = getImageProxyUrl(url);
    const res = await api.get(proxyUrl, { responseType: 'blob' });
    blob = res.data;
  } else {
    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    blob = await response.blob();
  }
  if (!blob || blob.size === 0) {
    throw new Error('Blob de imagen vacío');
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
      img.src = objectUrl;
    });
    const w = image.naturalWidth || image.width || 1;
    const h = image.naturalHeight || image.height || 1;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo obtener contexto 2D');
    }
    ctx.drawImage(image, 0, 0);
    return { dataUrl: canvas.toDataURL('image/png'), width: w, height: h };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const resolveImageSourceForPdf = async (rawUrl, comprobanteType) => {
  const normalized = normalizeImageSource(rawUrl);
  if (!normalized) return null;
  if (!isImageLikeSource(normalized)) return null;
  if (normalized.startsWith('data:image/')) {
    return { dataUrl: normalized, width: null, height: null };
  }
  try {
    return await convertImageUrlToPngDataUrl(normalized, comprobanteType);
  } catch (error) {
    console.warn('[PDF] No se pudo convertir a PNG, se usa URL original:', normalized, error);
    return { dataUrl: normalized, width: null, height: null };
  }
};

const buildTrabajoPdfPayload = async (trabajo) => {
  const todosComprobantes = Array.isArray(trabajo?.comprobantes) ? trabajo.comprobantes : [];
  const comprobantes = todosComprobantes.filter(
    (c) => COMPROBANTE_TIPOS_IMAGEN.includes(c?.type || '')
  );
  if (comprobantes.length === 0) {
    // Sin licencia/parte: preservar comprobantes originales (incl. 'horas') para que hasHoras funcione
    const result = { ...trabajo };
    console.log('[PDF] buildTrabajoPdfPayload SALIDA (sin licencia/parte)', {
      comprobantesLength: result.comprobantes?.length ?? 0,
      dataRawExcelEnResult: Array.isArray(result.dataRawExcel) ? result.dataRawExcel.length : 0,
    });
    return result;
  }

  const comprobantesConImagen = await Promise.all(
    comprobantes.map(async (comprobante, index) => {
      const comprobanteType = comprobante?.type || '';
      const normalizedUrl = normalizeImageSource(comprobante?.url);
      const isImageComprobante = isImageLikeSource(normalizedUrl || '');
      let imageSrc = null;
      let imageWidth = null;
      let imageHeight = null;
      try {
        if (isImageComprobante) {
          const result = await resolveImageSourceForPdf(comprobante?.url, comprobanteType);
          if (result) {
            imageSrc = result.dataUrl;
            imageWidth = result.width;
            imageHeight = result.height;
          }
        }
      } catch (error) {
        console.warn('[PDF] Error resolviendo imagen de comprobante', error);
      }
      console.log('[PDF] comprobante', {
        index,
        type: comprobanteType || null,
        hasUrl: Boolean(comprobante?.url),
        useProxy: shouldUseProxy(comprobante?.url, comprobanteType),
        imageWidth,
        imageHeight,
      });
      return {
        ...comprobante,
        imageSrc,
        imageWidth,
        imageHeight,
      };
    })
  );

  const comprobantesHoras = todosComprobantes.filter(
    (c) => (c?.type || '').toString().toLowerCase() === 'horas'
  );
  const result = {
    ...trabajo,
    comprobantes: [...comprobantesConImagen, ...comprobantesHoras],
  };
  return result;
};

export async function exportTrabajoDiarioToPdfRenderer(trabajo) {
  if (!trabajo) {
    throw new Error('Trabajo diario inválido');
  }

  const trabajador = trabajo.trabajadorId || trabajo.trabajador || {};
  const nombreCompleto = `${trabajador.apellido || ''} ${trabajador.nombre || ''}`.trim() || 'trabajador';
  const dni = (trabajador.dni || trabajo.dni || 'sin-dni').toString().replace(/\D/g, '') || 'sin-dni';
  const fechaArchivo = formatFechaArchivo(trabajo.fecha);
  const fileName = `${sanitizeFileName(nombreCompleto)}_${dni}_${fechaArchivo}.pdf`;
  const trabajoPdf = await buildTrabajoPdfPayload(trabajo);
  console.log('[PDF] exportTrabajoDiarioToPdfRenderer - trabajoPdf para documento', {
    comprobantesTotal: trabajoPdf?.comprobantes?.length || 0,
    comprobantesConImagen: (trabajoPdf?.comprobantes || []).filter((item) => Boolean(item?.imageSrc)).length,
    dataRawExcelLength: Array.isArray(trabajoPdf?.dataRawExcel) ? trabajoPdf.dataRawExcel.length : 0,
    hasHorasParaTabla: (trabajoPdf?.comprobantes ?? []).some((c) => (c?.type || '').toLowerCase() === 'horas'),
    mostraraTablaFichadas: (trabajoPdf?.comprobantes ?? []).some((c) => (c?.type || '').toLowerCase() === 'horas') &&
      Array.isArray(trabajoPdf?.dataRawExcel) &&
      trabajoPdf.dataRawExcel.length > 0,
  });

  const document = (
    <PdfTrabajoDiarioDocument trabajo={trabajoPdf} />
  );

  const blob = await pdf(document).toBlob();
  downloadBlob(blob, fileName);
}

export default exportTrabajoDiarioToPdfRenderer;
