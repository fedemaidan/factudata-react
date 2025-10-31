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

const DhnDriveService = {
  /**
   * POST /dhn/sync
   * @param {string} urlDrive  URL o ID de Google Drive
   * @returns {Promise<Object>} { ok:true, ...data } | { ok:false, error:{ code, message } }
   */
  inspeccionarRecurso: async (urlDrive) => {
    console.log('Inspeccionando recurso:', urlDrive);
    if (!validarUrlDrive(urlDrive)) {
      return { ok: false, error: { code: 0, message: 'La URL/ID de Drive no es válida.' } };
    }
    console.log('URL válida:', urlDrive);
    try {
      const response = await api.post(`/dhn/sync`, { urlDrive }); // ✅ /dhn/sync
      if (response?.status === 200 || response?.status === 201) {
        return response.data; // { ok:true, ... }
      }
      return {
        ok: false,
        error: { code: response?.status ?? 0, message: 'Respuesta inesperada del servidor.' },
      };
    } catch (error) {
      const code = error?.response?.status ?? 0;
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Error de red';
      return { ok: false, error: { code, message } };
    }
  },

  getAllSyncs: async () => {
    try {
      const response = await api.get(`/dhn/sync`);
      console.log('response', response.data);
      // backend responde { ok: true, data: [...] }
      return response.data?.data || [];
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Error de red';
      console.error('Error getAllSyncs:', message);
      return [];
    }
  },

  /**
   * Obtiene los items/detalles de un sync específico.
   * Envía el sync id como query param ?syncid=... (el backend debe aceptar este param).
   * @param {string} syncId
   * @returns {Promise<Array>} lista de items (o [])
   */
  getSyncChildren: async (syncId) => {
    if (!syncId) return [];
    try {
      // El backend espera el syncId en el body, no en query params
      const response = await api.post(`/dhn/sync/urls`, { syncId: syncId });
      console.log('response getSyncChildren', response.data);

      const data = response.data;
      if (!data) return [];

      if (Array.isArray(data)) return data;
      if (Array.isArray(data.data)) return data.data;
      if (Array.isArray(data.data?.items)) return data.data.items;
      if (Array.isArray(data.items)) return data.items;

      return [];
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Error de red';
      console.error('Error getSyncChildren:', message);
      return [];
    }
  },

  updateSyncSheet: async (googleSheetLink) => {
    const response = await api.put(`/dhn/sync-sheet`, { googleSheetLink });
    return response.data;
  },
};

export default DhnDriveService;