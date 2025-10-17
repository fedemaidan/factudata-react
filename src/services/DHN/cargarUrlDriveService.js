import api from '../axiosConfig';

/** Valida URLs/IDs típicos de Google Drive */
export const validarUrlDrive = (v) => {
  if (!v || typeof v !== 'string') return false;
  const s = v.trim();
  if (!s) return false;

  // ID “crudo”
  if (!s.includes('http') && !s.includes('drive.google.com') && !/\s/.test(s) && s.length >= 10) {
    return true;
  }
  // URLs frecuentes
  const patterns = [
    /https?:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9\-_]+/i,
    /https?:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9\-_]+/i,
    /https?:\/\/drive\.google\.com\/.*[?&]id=[a-zA-Z0-9\-_]+/i,
    /https?:\/\/drive\.google\.com\/uc\?id=[a-zA-Z0-9\-_]+/i,
  ];
  return patterns.some((re) => re.test(s));
};

const ENDPOINT = '/dhn/sync'; // 👈 ruta correcta

const DhnDriveService = {
  /**
   * POST /dhn/sync
   * @param {string} urlDrive  URL o ID de Google Drive
   * @returns {Promise<Object>} { ok:true, ...data } | { ok:false, error:{ code, message } }
   */
  inspeccionarRecurso: async (urlDrive) => {
    if (!validarUrlDrive(urlDrive)) {
      return { ok: false, error: { code: 0, message: 'La URL/ID de Drive no es válida.' } };
    }

    try {
      const response = await api.post(ENDPOINT, { urlDrive }); // ✅ /dhn/sync
      if (response?.status === 200 || response?.status === 201) {
        return response.data; // { ok:true, ... }
      }
      return {
        ok: false,
        error: { code: response?.status ?? 0, message: 'Respuesta inesperada del servidor.' },
      };
    } catch (error) {
      // ⚠️ NUNCA asumas error.response
      const code = error?.response?.status ?? 0;
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Error de red';
      return { ok: false, error: { code, message } };
    }
  },
};

export default DhnDriveService;