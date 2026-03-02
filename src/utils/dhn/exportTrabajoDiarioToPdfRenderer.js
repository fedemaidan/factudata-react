import { pdf } from '@react-pdf/renderer';
import { PdfTrabajoDiarioDocument } from './PdfTrabajoDiarioDocument';

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

const convertImageUrlToPngDataUrl = async (url) => {
  const response = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const blob = await response.blob();
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
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width || 1;
    canvas.height = image.naturalHeight || image.height || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo obtener contexto 2D');
    }
    ctx.drawImage(image, 0, 0);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const resolveImageSourceForPdf = async (rawUrl) => {
  const normalized = normalizeImageSource(rawUrl);
  if (!normalized) return null;
  if (!isImageLikeSource(normalized)) return null;
  if (normalized.startsWith('data:image/')) return normalized;
  try {
    // Workaround recomendado para casos donde react-pdf no renderiza ciertos JPEG.
    return await convertImageUrlToPngDataUrl(normalized);
  } catch (error) {
    console.warn('[PDF] No se pudo convertir a PNG, se usa URL original:', normalized, error);
    return normalized;
  }
};

const getSrcKind = (value) => {
  if (!value) return 'none';
  if (value.startsWith('data:image/')) return 'data-url';
  if (value.startsWith('http')) return 'http-url';
  return 'other';
};

const buildTrabajoPdfPayload = async (trabajo) => {
  const comprobantes = Array.isArray(trabajo?.comprobantes) ? trabajo.comprobantes : [];
  if (comprobantes.length === 0) {
    return { ...trabajo, comprobantes: [] };
  }

  const comprobantesConImagen = await Promise.all(
    comprobantes.map(async (comprobante, index) => {
      const normalizedUrl = normalizeImageSource(comprobante?.url);
      const isImageComprobante = isImageLikeSource(normalizedUrl || '');
      let imageSrc = null;
      try {
        if (isImageComprobante) {
          imageSrc = await resolveImageSourceForPdf(comprobante?.url);
        }
      } catch (error) {
        console.warn('[PDF] Error resolviendo imagen de comprobante', error);
      }
      console.log('[PDF] comprobante', {
        index,
        type: comprobante?.type || null,
        hasUrl: Boolean(comprobante?.url),
        ignoredNonImage: !isImageComprobante,
        normalizedUrl,
        normalizedKind: getSrcKind(normalizedUrl || ''),
        imageSrcKind: getSrcKind(imageSrc || ''),
        imageSrcLength: imageSrc?.length || 0,
      });
      return {
        ...comprobante,
        imageSrc,
      };
    })
  );

  return {
    ...trabajo,
    comprobantes: comprobantesConImagen,
  };
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
  console.log('[PDF] resumen comprobantes', {
    total: trabajoPdf?.comprobantes?.length || 0,
    conImagen: (trabajoPdf?.comprobantes || []).filter((item) => Boolean(item?.imageSrc)).length,
  });

  const document = (
    <PdfTrabajoDiarioDocument trabajo={trabajoPdf} />
  );

  const blob = await pdf(document).toBlob();
  downloadBlob(blob, fileName);
}

export default exportTrabajoDiarioToPdfRenderer;
