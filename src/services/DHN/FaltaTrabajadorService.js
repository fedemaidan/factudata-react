import api from '../axiosConfig';

const FaltaTrabajadorService = {
  list: async ({
    fechaDetectadaFrom,
    fechaDetectadaTo,
    search,
    limit,
    offset,
    sortField,
    sortDirection,
  } = {}) => {
    const params = new URLSearchParams();
    if (fechaDetectadaFrom) params.append('fechaDetectadaFrom', fechaDetectadaFrom);
    if (fechaDetectadaTo) params.append('fechaDetectadaTo', fechaDetectadaTo);
    if (search) params.append('search', search);
    if (limit !== undefined) params.append('limit', String(limit));
    if (offset !== undefined) params.append('offset', String(offset));
    if (sortField) params.append('sortField', sortField);
    if (sortDirection) params.append('sortDirection', sortDirection);
    const qs = params.toString();
    const url = qs ? `/dhn/url-storage/falta-trabajador?${qs}` : `/dhn/url-storage/falta-trabajador`;
    try {
      const response = await api.get(url);
      const data = response?.data?.data || {};
      return {
        items: Array.isArray(data.items) ? data.items : [],
        total: Number.isFinite(data.total) ? data.total : 0,
        limit: Number.isFinite(data.limit) ? data.limit : (limit ?? 50),
        offset: Number.isFinite(data.offset) ? data.offset : (offset ?? 0),
      };
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Error de red';
      throw new Error(message);
    }
  },
};

export default FaltaTrabajadorService;
