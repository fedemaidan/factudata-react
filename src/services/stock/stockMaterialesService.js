// services/stock/stockMaterialesService.js
import api from '../axiosConfig';

const StockMaterialesService = {
  crearMaterial: async (data) => {
    const res = await api.post('/materiales', data);
    if (res.status === 200 || res.status === 201) return res.data;
    throw new Error('No se pudo crear el material');
  },

  /**
   * params esperados por el back (buildStockQuery):
   * - empresa_id (obligatorio)
   * - q (nombre)
   * - stockFilter: 'gt0' | 'eq0' | 'lt0' (si es 'all' no se envía)
   * - sort: string "campo:asc|desc"  (ej: 'nombre:asc', 'stock:desc')
   * - limit, skip (números)
   */
  listarMateriales: async (raw = {}) => {
    if (!raw.empresa_id) throw new Error('empresa_id es requerido');

    const params = {
      empresa_id: String(raw.empresa_id),

      // filtros (solo si vienen con valor)
      ...(raw.nombre?.trim()        ? { nombre: raw.nombre.trim() } : {}),
      ...(raw.desc_material?.trim() ? { desc_material: raw.desc_material.trim() } : {}),
      ...(raw.SKU?.trim()           ? { SKU: raw.SKU.trim() } : {}),

      // alias puede venir como array o string; mandamos tal cual
      ...(Array.isArray(raw.alias) && raw.alias.length
        ? { alias: raw.alias }
        : (typeof raw.alias === 'string' && raw.alias.trim()
            ? { alias: raw.alias.trim() } // ej. "a,b,c"
            : {})),

      ...(raw.stockFilter && raw.stockFilter !== 'all' ? { stockFilter: raw.stockFilter } : {}),

      sort: (typeof raw.sort === 'string' && raw.sort.includes(':')) ? raw.sort : 'nombre:asc',
      limit: Number.isFinite(raw.limit) ? Number(raw.limit) : 50,
      page:  Number.isFinite(raw.page)  ? Number(raw.page)  : 0,
    };

    // (opcional) log para depurar qué se envía
    // console.log('[listarMateriales] params →', params);

    const res = await api.get('/materiales/stock', { params });
    if (res.status !== 200) throw new Error('Error al obtener materiales');

    const data  = res.data || {};
    const limit = Number(data.limit ?? params.limit);
    const page  = Number(data.page  ?? params.page);
    const skip  = Number(data.skip  ?? page * limit);

    return {
      ok: !!data.ok,
      items: Array.isArray(data.items) ? data.items : [],
      total: Number(data.total ?? 0),
      limit,
      page,
      skip,
      hasMore: !!data.hasMore,
    };
  },

  obtenerMaterialPorId: async (id) => {
    const res = await api.get(`/materiales/${id}`);
    if (res.status === 200) return res.data;
    throw new Error('Error al obtener material');
  },

  actualizarMaterial: async (id, data) => {
    const res = await api.put(`/materiales/${id}`, data);
    if (res.status === 200) return res.data;
    throw new Error('Error al actualizar el material');
  },

  eliminarMaterial: async (id) => {
    const res = await api.delete(`/materiales/${id}`);
    if (res.status === 204) return;
    throw new Error('Error al eliminar material');
  },


  obtenerMaterialPorId: async (id) => {
    const res = await api.get(`/materiales/${id}`);
    if (res.status === 200) return res.data;
    throw new Error('Error al obtener material');
  },

  actualizarMaterial: async (id, data) => {
    const res = await api.put(`/materiales/${id}`, data);
    if (res.status === 200) return res.data;
    throw new Error('Error al actualizar el material');
  },

  eliminarMaterial: async (id) => {
    const res = await api.delete(`/materiales/${id}`);
    if (res.status === 204) return;
    throw new Error('Error al eliminar material');
  },
};

export default StockMaterialesService;
