/** Alineado con multer del backend (8 MB). */
export const LOGO_MAX_BYTES = 8 * 1024 * 1024;

/** Extensiones habituales cuando el navegador no informa type (p. ej. Windows, algunos Android). */
const LIKELY_IMAGE_EXT =
  /\.(jpe?g|jfif|png|gif|webp|avif|bmp|tif|tiff|heic|heif|svg|ico)$/i;

/**
 * @param {File | null | undefined} file
 * @returns {boolean}
 */
export function isLikelyImageFile(file) {
  if (!file || typeof file !== 'object') return false;
  const t = (file.type || '').toLowerCase();
  if (t.startsWith('image/')) return true;
  const name = file.name || '';
  return LIKELY_IMAGE_EXT.test(name);
}

/**
 * @param {File | null | undefined} file
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateLogoFileForUpload(file) {
  if (!file) {
    return { ok: false, message: 'No se seleccionó ningún archivo.' };
  }
  if (!isLikelyImageFile(file)) {
    return {
      ok: false,
      message:
        'No se reconoce como imagen. Usá JPG, PNG, WEBP, GIF, AVIF, BMP, TIFF, ICO, HEIC/HEIF o SVG (también archivos sin tipo MIME si la extensión es correcta).',
    };
  }
  if (file.size > LOGO_MAX_BYTES) {
    return {
      ok: false,
      message: 'El archivo supera 8 MB. Reducí el tamaño o la resolución e intentá de nuevo.',
    };
  }
  if (file.size <= 0) {
    return { ok: false, message: 'El archivo está vacío.' };
  }
  return { ok: true };
}
