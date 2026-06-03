// services/stock/stockMaterialesService.js
import api from '../axiosConfig';

const StockMaterialesService = {
  crearMaterial: async (data) => {
    console.log('📤 [Service] Enviando material:', data);
    const res = await api.post('/materiales', data);
    console.log('📥 [Service] Respuesta completa:', res);
    console.log('📋 [Service] Respuesta data:', res.data);
    
    if (res.status === 200 || res.status === 201) {
      // El backend envuelve la respuesta en { ok: true, data: materialCreado }
      return res.data; 
    }
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
      ...(raw.categoria?.trim()     ? { categoria: raw.categoria.trim() } : {}),
      ...(raw.subcategoria?.trim()  ? { subcategoria: raw.subcategoria.trim() } : {}),
      ...(raw.text?.trim()          ? { text: raw.text.trim() } : {}),
      ...(raw.sin_categoria ? { sin_categoria: raw.sin_categoria } : {}),

      // alias puede venir como array o string; mandamos tal cual
      ...(Array.isArray(raw.alias) && raw.alias.length
        ? { alias: raw.alias }
        : (typeof raw.alias === 'string' && raw.alias.trim()
            ? { alias: raw.alias.trim() } // ej. "a,b,c"
            : {})),

      ...(raw.stockFilter && raw.stockFilter !== 'all' ? { stockFilter: raw.stockFilter } : {}),
      ...(raw.estadoEntrega && raw.estadoEntrega !== 'all' ? { estadoEntrega: raw.estadoEntrega } : {}),

      // Fase 3C corralones: filtro por sucursal + columnas stock_comprometido/stock_disponible
      ...(raw.sucursal_id ? { sucursal_id: String(raw.sucursal_id) } : {}),
      ...(raw.con_disponible ? { con_disponible: 'true' } : {}),

      sort: (typeof raw.sort === 'string' && raw.sort.includes(':')) ? raw.sort : 'nombre:asc',
      limit: Number.isFinite(raw.limit) ? Number(raw.limit) : 50,
      page: Number.isFinite(raw.page) ? Number(raw.page) : 0,
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

  obtenerMaterial: async ({ empresa_id, material_id }) => {
    try {
      const res = await api.get(`/materiales/${material_id}`, {
        params: { empresa_id }
      });
      if (res.status === 200) {
        return unwrap(res);
      }
      return null;
    } catch (err) {
      console.error('[SVC][obtenerMaterial][ERR]', err);
      return null;
    }
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

  // Agregar o modificar alias de un material
  agregarAlias: async (materialId, alias) => {
    const res = await api.patch(`/materiales/alias/${materialId}`, { alias });
    if (res.status === 200) return res.data;
    throw new Error('Error al agregar alias');
  },

  /**
   * Obtiene totales de stock valorizado agrupados por proyecto.
   * Devuelve: { general, sinAsignar, porProyecto[] }
   */
  obtenerTotalesStock: async (raw = {}) => {
    if (!raw.empresa_id) throw new Error('empresa_id es requerido');
    const params = {
      empresa_id: String(raw.empresa_id),
      ...(raw.stockFilter && raw.stockFilter !== 'all' ? { stockFilter: raw.stockFilter } : {}),
      ...(raw.estadoEntrega && raw.estadoEntrega !== 'all' ? { estadoEntrega: raw.estadoEntrega } : {}),
      ...(raw.categoria?.trim() ? { categoria: raw.categoria.trim() } : {}),
      ...(raw.subcategoria?.trim() ? { subcategoria: raw.subcategoria.trim() } : {}),
      ...(raw.sin_categoria ? { sin_categoria: raw.sin_categoria } : {}),
      ...(raw.text?.trim() ? { text: raw.text.trim() } : {}),
    };
    const res = await api.get('/materiales/stock/totales', { params });
    if (res.status !== 200) throw new Error('Error al obtener totales de stock');
    return res.data; // { ok, general, sinAsignar, porProyecto }
  },

  // Actualizar categoría/subcategoría en bloque
  actualizarCategoriaMasiva: async ({ empresa_id, material_ids, categoria, subcategoria }) => {
    if (!empresa_id) throw new Error('empresa_id es requerido');
    if (!Array.isArray(material_ids) || material_ids.length === 0) {
      throw new Error('material_ids es requerido');
    }
    if (!categoria) throw new Error('categoria es requerida');

    const res = await api.patch('/materiales/categorias/bulk', {
      empresa_id,
      material_ids,
      categoria,
      subcategoria,
    });
    if (res.status === 200) return res.data;
    throw new Error('Error al actualizar categorías');
  },

  // Fase 3C corralones: import masivo de catálogo (JSON pre-parseado del Excel/CSV)
  importarCatalogo: async ({ empresa_id, empresa_nombre, materiales }) => {
    if (!empresa_id) throw new Error('empresa_id es requerido');
    if (!Array.isArray(materiales) || materiales.length === 0) {
      throw new Error('materiales[] es requerido');
    }
    const res = await api.post('/materiales/import', { empresa_id, empresa_nombre, materiales });
    if (res.status === 200) return res.data;
    throw new Error('Error al importar catálogo');
  },

  // Fase 3C corralones: acopios activos que comprometen este material
  acopiosComprometidos: async ({ empresa_id, material_id, sucursal_id }) => {
    if (!empresa_id) throw new Error('empresa_id es requerido');
    if (!material_id) throw new Error('material_id es requerido');
    const params = { empresa_id };
    if (sucursal_id) params.sucursal_id = sucursal_id;
    const res = await api.get(`/materiales/${material_id}/acopios-comprometidos`, { params });
    if (res.status === 200) return res.data;
    throw new Error('Error al obtener acopios comprometidos');
  },

  // Fusionar materiales duplicados (mueve movimientos de origen_ids al destino_id y elimina los origenes)
  fusionarMateriales: async ({ empresa_id, destino_id, origen_ids }) => {
    if (!empresa_id) throw new Error('empresa_id es requerido');
    if (!destino_id) throw new Error('destino_id es requerido');
    if (!Array.isArray(origen_ids) || origen_ids.length === 0) {
      throw new Error('origen_ids es requerido');
    }
    const res = await api.post('/materiales/fusionar', { empresa_id, destino_id, origen_ids });
    if (res.status === 200) return res.data;
    throw new Error('Error al fusionar materiales');
  },
};

const unwrap = (res) => {
  const payload = res?.data ?? {};
  return (payload && typeof payload === 'object' && 'data' in payload)
    ? (payload.data ?? {})
    : payload;
};

export default StockMaterialesService;
