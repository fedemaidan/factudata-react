import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from 'src/config/firebase';

export const PRESUPUESTO_ADJUNTOS_MAX = 100;
export const PRESUPUESTO_ADJUNTO_MAX_BYTES = 16 * 1024 * 1024;

const ALLOWED_EXT = /\.(jpe?g|png|gif|webp|bmp|heic|heif|pdf|docx?|xlsx?|txt|csv|zip)$/i;

/**
 * @param {File} file
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validatePresupuestoAdjuntoFile(file) {
  if (!file || !(file instanceof File)) {
    return { ok: false, message: 'Archivo inválido' };
  }
  if (file.size > PRESUPUESTO_ADJUNTO_MAX_BYTES) {
    return { ok: false, message: `Cada archivo debe tener como máximo ${PRESUPUESTO_ADJUNTO_MAX_BYTES / (1024 * 1024)} MB` };
  }
  const name = file.name || '';
  const isImage = typeof file.type === 'string' && file.type.startsWith('image/');
  if (!ALLOWED_EXT.test(name) && !isImage) {
    return { ok: false, message: 'Tipo de archivo no permitido' };
  }
  return { ok: true };
}

export function buildPresupuestoAdjuntoStoragePath(empresaId, presupuestoId, originalName) {
  const safe = (originalName || 'archivo').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const uid =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `presupuestos_adjuntos/${empresaId}/${presupuestoId}/${uid}_${safe}`;
}

/**
 * @param {File} file
 * @param {{ empresaId: string, presupuestoId: string, userId?: string }} ctx
 */
export async function uploadPresupuestoAdjunto(file, { empresaId, presupuestoId, userId }) {
  const path = buildPresupuestoAdjuntoStoragePath(empresaId, presupuestoId, file.name);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' });
  const url = await getDownloadURL(storageRef);
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    name: file.name,
    url,
    path,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy: userId || null,
  };
}

export async function deletePresupuestoAdjuntoStorage(path) {
  if (!path || typeof path !== 'string') return;
  try {
    await deleteObject(ref(storage, path));
  } catch (e) {
    console.warn('No se pudo eliminar archivo de Storage:', e?.message || e);
  }
}
