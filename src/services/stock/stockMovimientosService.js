// services/stock/stockMovimientosService.js
import api from '../axiosConfig';

/**
 * Builder de params para el backend de movimientos
 * Espera:
 * - empresa_id (obligatorio)
 * - nombre_item, proyecto_nombre, usuario_mail (opcionales)
 * - conciliado: 'true' | 'false' (obligatorio en nuestra UI)
 * - sort: 'campo:asc|desc'  (ej: 'fecha_movimiento:desc')
 * - limit, page
 */
function buildParams(raw = {}) {
  if (!raw.empresa_id) throw new Error('empresa_id es requerido');

  return {
    empresa_id: String(raw.empresa_id),
    // filtros independientes
    ...(raw.nombre_item?.trim() ? { nombre_item: raw.nombre_item.trim() } : {}),
    ...(raw.proyecto_nombre?.trim() ? { proyecto_nombre: raw.proyecto_nombre.trim() } : {}),
    ...(raw.usuario_mail?.trim() ? { usuario_mail: raw.usuario_mail.trim() } : {}),
    // conciliado obligatorio (string)
    ...(raw.conciliado ? { conciliado: String(raw.conciliado) } : { conciliado: 'false' }),

    // sort + paginación
    sort:
      typeof raw.sort === 'string' && raw.sort.includes(':')
        ? raw.sort
        : 'fecha_movimiento:desc',
    limit: Number.isFinite(raw.limit) ? Number(raw.limit) : 25,
    page: Number.isFinite(raw.page) ? Number(raw.page) : 0,
  };
}

const StockMovimientosService = {
  listarMovimientos: async (raw = {}) => {
    const params = buildParams(raw);
    const res = await api.get('/movimientos', { params });
    if (res.status !== 200) throw new Error('Error al obtener movimientos');

    const data = res.data || {};
    return {
      items: Array.isArray(data.items) ? data.items : [],
      total: Number(data.total ?? 0),
      limit: Number(data.limit ?? params.limit),
      page: Number(data.page ?? params.page),
      skip: Number(data.skip ?? params.page * params.limit),
    };
  },

  obtenerMovimiento: async (id) => {
    const res = await api.get(`/movimientos/${id}`);
        console.log("1")
    if (res.status === 200) return res.data;
    throw new Error('Error al obtener movimiento');

    },

  actualizarMovimiento: async (id, patch) => {
    const res = await api.patch(`/movimientos/${id}`, patch);
    if (res.status === 200) return res.data;
    throw new Error('Error al actualizar movimiento');
  },

  eliminarMovimiento: async (id) => {
    const res = await api.delete(`/movimientos/${id}`);
    if (res.status === 204) return true;
    throw new Error('Error al eliminar movimiento');
  },
};

export default StockMovimientosService;
