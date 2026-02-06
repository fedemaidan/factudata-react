import api from '../axiosConfig';

/** Valida URLs/IDs típicos de Google Drive y Google Sheets */
export const validarUrlDrive = (v) => {
  if (!v || typeof v !== 'string') return false;
  const s = v.trim();
  if (!s) return false;

  // ID "crudo"
  if (!s.includes('http') && !s.includes('drive.google.com') && !s.includes('docs.google.com') && !/\s/.test(s) && s.length >= 10) {
    return true;
  }
  // URLs frecuentes de Drive y Sheets
  const patterns = [
    /https?:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9\-_]+/i,
    /https?:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9\-_]+/i,
    /https?:\/\/drive\.google\.com\/.*[?&]id=[a-zA-Z0-9\-_]+/i,
    /https?:\/\/drive\.google\.com\/uc\?id=[a-zA-Z0-9\-_]+/i,
    /https?:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9\-_]+/i,
  ];
  return patterns.some((re) => re.test(s));
};

const DEFAULT_PAGE_LIMIT = 50;

const normalizePageResponse = (page, defaults = {}) => ({
  items: Array.isArray(page?.items) ? page.items : [],
  total: Number.isFinite(page?.total) ? page.total : 0,
  limit: Number.isFinite(page?.limit) ? page.limit : (defaults.limit ?? DEFAULT_PAGE_LIMIT),
  offset: Number.isFinite(page?.offset) ? page.offset : (defaults.offset ?? 0),
});

const fetchUrlStoragePage = async (payload = {}, defaults = {}) => {
  try {
    const response = await api.post(`/dhn/sync/urls`, payload);
    const pageData = response?.data?.data;
    return normalizePageResponse(pageData, defaults);
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || 'Error de red';
    console.error('Error fetchUrlStoragePage:', message);
    return {
      items: [],
      total: 0,
      limit: defaults.limit ?? DEFAULT_PAGE_LIMIT,
      offset: defaults.offset ?? 0,
    };
  }
};

const DhnDriveService = {
  /**
   * POST /dhn/sync
   * @param {string} urlDrive  URL o ID de Google Drive
   * @returns {Promise<Object>} { ok:true, ...data } | { ok:false, error:{ code, message } }
   */
  inspeccionarRecurso: async (urlDrive, extra = {}) => {
    console.log('Inspeccionando recurso:', urlDrive);
    if (!validarUrlDrive(urlDrive)) {
      return { ok: false, error: { code: 0, message: 'La URL/ID de Drive no es válida.' } };
    }
    console.log('URL válida:', urlDrive);
    try {
      const payload = { urlDrive, ...extra };
      const response = await api.post(`/dhn/sync`, payload); // ✅ /dhn/sync
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
  getSyncChildren: async (syncId, { limit = DEFAULT_PAGE_LIMIT, offset = 0, search } = {}) => {
    if (!syncId) {
      return {
        items: [],
        total: 0,
        limit,
        offset,
      };
    }
    return fetchUrlStoragePage(
      { syncId, limit, offset, search },
      { limit, offset }
    );
  },

  resyncSyncChildren: async (syncId) => {
    if (!syncId) {
      return { ok: false, error: { code: 400, message: 'syncId es requerido' } };
    }
    try {
      const response = await api.post(`/dhn/sync/${syncId}/resync`);
      return response?.data;
    } catch (error) {
      const code = error?.response?.status ?? 0;
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Error de red';
      console.error('Error resyncSyncChildren:', message);
      return { ok: false, error: { code, message } };
    }
  },

  getErroredSyncChildren: async ({
    limit = DEFAULT_PAGE_LIMIT,
    offset = 0,
    createdAtFrom,
    createdAtTo,
    tipo,
    status,
    search,
    sortField,
    sortDirection,
  } = {}) => {
    const payload = {
      status: status || ['error', 'duplicado', 'incompleto'],
      limit,
      offset,
    };
    if (createdAtFrom) payload.createdAtFrom = createdAtFrom;
    if (createdAtTo) payload.createdAtTo = createdAtTo;
    if (tipo) payload.tipo = tipo;
    if (search) payload.search = search;
    if (sortField) payload.sortField = sortField;
    if (sortDirection) payload.sortDirection = sortDirection;
    return fetchUrlStoragePage(payload, { limit, offset });
  },

  resyncUrlStorageById: async (urlStorageId, extra = {}) => {
    if (!urlStorageId) {
      return { ok: false, error: { code: 0, message: "urlStorageId es requerido" } };
    }
    try {
      const payload = extra && typeof extra === "object" ? extra : {};
      const response = await api.post(`/dhn/sync/url/${encodeURIComponent(urlStorageId)}/resync`, payload);
      return response?.data;
    } catch (error) {
      const code = error?.response?.status ?? 0;
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Error de red";
      return { ok: false, error: { code, message } };
    }
  },

  updateSyncSheet: async (googleSheetLink) => {
    const response = await api.put(`/dhn/sync-sheet`, { googleSheetLink });
    return response.data;
  },

  resolveDuplicate: async (urlStorageId, action) => {
    if (!urlStorageId || !action) {
      return { ok: false, error: { code: 0, message: "urlStorageId y action son requeridos" } };
    }
    try {
      const response = await api.post(`/dhn/trabajo-diario-registrado/resolver-duplicado`, {
        urlStorageId,
        action,
      });
      return response?.data ?? { ok: false, error: { code: 0, message: "Respuesta inválida" } };
    } catch (error) {
      const code = error?.response?.status ?? 0;
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Error de red";
      console.error("Error resolveDuplicate:", message);
      return { ok: false, error: { code, message } };
    }
  },
};

export default DhnDriveService;