// services/stock/stockMovimientosService.js
import api from '../axiosConfig';
import profileService from '../profileService';

function buildParams(raw = {}) {
  console.log('[SVC][buildParams] raw IN =>', JSON.parse(JSON.stringify(raw)));
  if (!raw.empresa_id) throw new Error('empresa_id es requerido');

  const toNumber = (v, def) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };

  const p = {
    empresa_id: String(raw.empresa_id),
  };

  // Filtros (solo si vienen con valor útil)
  if (raw.nombre_item?.trim())     p.nombre_item     = raw.nombre_item.trim();
  if (raw.proyecto_id?.trim?.())   p.proyecto_id     = raw.proyecto_id;
  if (raw.proyecto_nombre?.trim()) p.proyecto_nombre = raw.proyecto_nombre.trim();
  if (raw.usuario_id?.trim?.())    p.usuario_id      = raw.usuario_id;
  if (raw.usuario_mail?.trim())    p.usuario_mail    = raw.usuario_mail.trim();
  if (raw.fecha_desde)             p.fecha_desde     = raw.fecha_desde;
  if (raw.fecha_hasta)             p.fecha_hasta     = raw.fecha_hasta;

  // Buscar por nombre de material (cuando está conciliado).
  // Enviamos AMBOS parámetros por compatibilidad con el back:
  // - material_nombre (existente en helpers)
  // - nombre_material  (nuevo nombre de campo “congelado post conciliación”)
  if (raw.nombre_material?.trim()) {
    p.material_nombre = raw.nombre_material.trim();
    p.nombre_material = raw.nombre_material.trim();
  } else if (raw.material_nombre?.trim()) {
    p.material_nombre = raw.material_nombre.trim();
    p.nombre_material = raw.material_nombre.trim();
  }

  // Solo incluir si la UI eligió explícitamente una opción
  if (raw.conciliado === 'true' || raw.conciliado === 'false') {
    p.conciliado = raw.conciliado;
  }

  // Sort + paginación
  p.sort  = (typeof raw.sort === 'string' && raw.sort.includes(':'))
    ? raw.sort
    : 'fecha_movimiento:desc';

  p.limit = toNumber(raw.limit, 25);
  p.page  = toNumber(raw.page, 0);

  console.log('[SVC][buildParams] params OUT =>', JSON.parse(JSON.stringify(p)));
  return p;
}

const StockMovimientosService = {
  listarMovimientos: async (raw = {}) => {
    const params = buildParams(raw);
    const endpoint = '/movimiento-material';
    console.log(`[SVC][GET] ${endpoint}`, { params });

    const t0 = performance.now();
    try {
      const res = await api.get(endpoint, { params });
      const t1 = performance.now();
      console.log(`[SVC][GET OK] ${endpoint} status=${res.status} time=${(t1 - t0).toFixed(1)}ms`);

      const data = res.data || {};
      const items = Array.isArray(data.items) ? data.items : [];
      console.log(`[SVC][RESP] total=${data.total} items.length=${items.length} page=${data.page} limit=${data.limit}`);

      return {
        items,
        total: Number(data.total ?? 0),
        limit: Number(data.limit ?? params.limit),
        page: Number(data.page ?? params.page),
        skip: Number(data.skip ?? params.page * params.limit),
      };
    } catch (err) {
      const status = err?.response?.status;
      const payload = err?.response?.data;
      console.error(`[SVC][GET ERR] ${endpoint} status=${status}`, payload || err);
      throw new Error('Error al obtener movimiento-material');
    }
  },

  obtenerMovimiento: async (id) => {
    const endpoint = `/movimiento-material/${id}`;
    console.log(`[SVC][GET-ONE] ${endpoint}`);
    try {
      const res = await api.get(endpoint);
      console.log(`[SVC][GET-ONE OK] status=${res.status}`, res.data?._id || '(sin _id)');
      if (res.status === 200) return res.data;
      throw new Error('Error al obtener movimiento');
    } catch (err) {
      const status = err?.response?.status;
      console.error(`[SVC][GET-ONE ERR] ${endpoint} status=${status}`, err?.response?.data || err);
      throw new Error('Error al obtener movimiento');
    }
  },

  actualizarMovimiento: async (id, patch) => {
    const endpoint = `/movimiento-material/${id}`;
    console.log(`[SVC][PATCH] ${endpoint}`, patch);
    try {
      const res = await api.patch(endpoint, patch);
      console.log(`[SVC][PATCH OK] status=${res.status}`);
      if (res.status === 200) return res.data;
      throw new Error('Error al actualizar movimiento');
    } catch (err) {
      const status = err?.response?.status;
      console.error(`[SVC][PATCH ERR] ${endpoint} status=${status}`, err?.response?.data || err);
      throw new Error('Error al actualizar movimiento');
    }
  },

  eliminarMovimiento: async (id) => {
    const endpoint = `/movimiento-material/${id}`;
    console.log(`[SVC][DEL] ${endpoint}`);
    try {
      const res = await api.delete(endpoint);
      console.log(`[SVC][DEL OK] status=${res.status}`);
      if (res.status === 204) return true;
      throw new Error('Error al eliminar movimiento');
    } catch (err) {
      const status = err?.response?.status;
      console.error(`[SVC][DEL ERR] ${endpoint} status=${status}`, err?.response?.data || err);
      throw new Error('Error al eliminar movimiento');
    }
  },

  // Combos
  listarProyectos: async ({ empresa_id }) => {
    const endpoint = '/movimiento-material/proyectos';
    console.log(`[SVC][GET] ${endpoint}`, { empresa_id });
    try {
      const res = await api.get(endpoint, { params: { empresa_id } });
      console.log(`[SVC][GET OK] ${endpoint} status=${res.status} count=${Array.isArray(res.data) ? res.data.length : 'n/a'}`);
      if (res.status !== 200) throw new Error('Error al obtener proyectos');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      const status = err?.response?.status;
      console.error(`[SVC][GET ERR] ${endpoint} status=${status}`, err?.response?.data || err);
      throw new Error('Error al obtener proyectos');
    }
  },

  listarUsuarios: async ({ empresa_id }) => {
    console.log('[SVC][listarUsuarios] empresa_id =', empresa_id);
    try {
      const { getProfiles } = profileService;
      if (typeof getProfiles !== 'function') {
        throw new Error('profileService.getProfiles no es una función');
      }
      const allProfiles = await getProfiles();
      const usuariosFiltrados = (allProfiles || []).filter((p) => {
        if (!p?.empresa) return false;
        if (typeof p.empresa === 'string') return p.empresa.includes(empresa_id);
        if (p.empresa?.path) return p.empresa.path.includes(empresa_id);
        if (p.empresa?.id) return p.empresa.id === empresa_id;
        return false;
      });
      const usuariosNormalizados = usuariosFiltrados.map((u) => ({
        id: u.id || u.uid || u._id,
        nombre: u.nombre || u.displayName || u.name || '(sin nombre)',
        email: u.email || '',
        admin: !!u.admin,
        empresaRef: u.empresa,
      }));
      return usuariosNormalizados;
    } catch (err) {
      console.error('[SVC][listarUsuarios][ERR]', err);
      return [];
    }
  },
};

export default StockMovimientosService;
