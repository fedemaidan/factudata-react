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

    // 🔎 SOLO por nombre (si viene vacío no se envía)
    ...(raw.nombre?.trim()
      ? { nombre: raw.nombre.trim() }
      : (raw.q?.trim() ? { nombre: raw.q.trim() } : {})),

    // si el filtro es 'all' no lo mandamos
    ...(raw.stockFilter && raw.stockFilter !== 'all' ? { stockFilter: raw.stockFilter } : {}),

    // sort "campo:asc|desc" (fallback seguro)
    sort:
      typeof raw.sort === 'string' && raw.sort.includes(':')
        ? raw.sort
        : 'nombre:asc',

    // paginación (tu back calcula skip = page * limit)
    limit: Number.isFinite(raw.limit) ? Number(raw.limit) : 50,
    page:  Number.isFinite(raw.page)  ? Number(raw.page)  : 0,
  };

  // Log explícito de lo que se envía al backend
  const qs = new URLSearchParams(params).toString();
  console.log(`[StockMateriales] GET /materiales/stock?${qs}`);

  // Llamada
  const res = await api.get('/materiales/stock', { params });
  if (res.status !== 200) throw new Error('Error al obtener materiales');

  // Mapeo/fallbacks
  const data = res.data || {};
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
};

export default StockMaterialesService;
