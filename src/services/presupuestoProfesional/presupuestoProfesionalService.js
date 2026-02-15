import api from '../axiosConfig';

/* ================================================================
   PresupuestoProfesionalService
   Servicio frontend para el módulo de Presupuestos Profesionales.
   Base URL en backend: /presupuestos-profesionales
   ================================================================ */

const BASE = '/presupuestos-profesionales';

// ── Helpers ────────────────────────────────────────────────────
const unwrap = (res) => {
  const payload = res?.data ?? {};
  return payload && typeof payload === 'object' && 'data' in payload
    ? (payload.data ?? {})
    : payload;
};

// ── Presupuestos ───────────────────────────────────────────────

const PresupuestoProfesionalService = {

  /* ---------- CRUD Presupuestos ---------- */

  crear: async (data) => {
    const res = await api.post(`${BASE}`, data);
    if (res.status === 200 || res.status === 201) return unwrap(res);
    throw new Error('No se pudo crear el presupuesto profesional');
  },

  listar: async (filters = {}) => {
    const params = {};
    if (filters.empresa_id)   params.empresa_id   = filters.empresa_id;
    if (filters.proyecto_id)  params.proyecto_id  = filters.proyecto_id;
    if (filters.estado)       params.estado       = filters.estado;
    if (filters.moneda)       params.moneda       = filters.moneda;
    if (filters.titulo)       params.titulo       = filters.titulo;
    if (filters.sort)         params.sort         = filters.sort;
    if (filters.limit != null) params.limit       = filters.limit;
    if (filters.page != null)  params.page        = filters.page;

    const res = await api.get(`${BASE}`, { params });
    if (res.status !== 200) throw new Error('Error al listar presupuestos profesionales');

    // Backend responde { ok, data: { items, total, ... } }
    const inner = res.data?.data || res.data || {};
    return {
      ok:      !!res.data?.ok,
      items:   Array.isArray(inner.items) ? inner.items : [],
      total:   Number(inner.total ?? 0),
      limit:   Number(inner.limit ?? 20),
      page:    Number(inner.page ?? 0),
      hasMore: !!inner.hasMore,
    };
  },

  obtenerPorId: async (id) => {
    const res = await api.get(`${BASE}/${id}`);
    if (res.status === 200) return unwrap(res);
    throw new Error('Error al obtener presupuesto profesional');
  },

  actualizar: async (id, data) => {
    const res = await api.put(`${BASE}/${id}`, data);
    if (res.status === 200) return unwrap(res);
    throw new Error('Error al actualizar presupuesto profesional');
  },

  eliminar: async (id) => {
    const res = await api.delete(`${BASE}/${id}`);
    if (res.status === 200 || res.status === 204) return true;
    throw new Error('Error al eliminar presupuesto profesional');
  },

  /* ---------- Rubros (edición parcial) ---------- */

  actualizarRubros: async (id, rubros) => {
    const res = await api.put(`${BASE}/${id}/rubros`, { rubros });
    if (res.status === 200) return unwrap(res);
    throw new Error('Error al actualizar rubros');
  },

  /* ---------- Cambio de estado ---------- */

  cambiarEstado: async (id, nuevoEstado, metadata = {}) => {
    const res = await api.put(`${BASE}/${id}/estado`, {
      nuevo_estado: nuevoEstado,
      ...metadata,
    });
    if (res.status === 200) return unwrap(res);
    throw new Error('Error al cambiar estado');
  },

  /* ---------- Anexos ---------- */

  agregarAnexo: async (id, anexoData) => {
    const res = await api.post(`${BASE}/${id}/anexo`, anexoData);
    if (res.status === 200 || res.status === 201) return unwrap(res);
    throw new Error('Error al agregar anexo');
  },

  /* ---------- CRUD Plantillas ---------- */

  crearPlantilla: async (data) => {
    const res = await api.post(`${BASE}/plantillas`, data);
    if (res.status === 200 || res.status === 201) return unwrap(res);
    throw new Error('No se pudo crear la plantilla');
  },

  listarPlantillas: async (empresaId, soloActivas = true) => {
    const params = {};
    if (soloActivas) params.soloActivas = true;
    const res = await api.get(`${BASE}/plantillas/${empresaId}`, { params });
    if (res.status !== 200) throw new Error('Error al listar plantillas');
    // Backend responde { ok, data: { items, total, ... } }
    const inner = res.data?.data || res.data || {};
    return Array.isArray(inner.items) ? inner.items : (Array.isArray(inner) ? inner : []);
  },

  obtenerPlantilla: async (id) => {
    const res = await api.get(`${BASE}/plantillas/detalle/${id}`);
    if (res.status === 200) return unwrap(res);
    throw new Error('Error al obtener plantilla');
  },

  actualizarPlantilla: async (id, data) => {
    const res = await api.put(`${BASE}/plantillas/${id}`, data);
    if (res.status === 200) return unwrap(res);
    throw new Error('Error al actualizar plantilla');
  },

  eliminarPlantilla: async (id) => {
    const res = await api.delete(`${BASE}/plantillas/${id}`);
    if (res.status === 200 || res.status === 204) return true;
    throw new Error('Error al eliminar plantilla');
  },

  /* ---------- Importar archivo → plantilla ---------- */

  uploadPlantilla: async (file, empresaId) => {
    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('empresa_id', empresaId);
    const res = await api.post(`${BASE}/plantillas/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (res.status === 200 || res.status === 201) return unwrap(res);
    throw new Error('Error al importar archivo de plantilla');
  },
};

export default PresupuestoProfesionalService;
