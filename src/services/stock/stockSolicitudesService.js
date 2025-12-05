// src/services/stock/stockSolicitudesService.js
import api from '../axiosConfig';
import profileService from '../profileService';
import { getEmpresaDetailsFromUser } from '../empresaService';

const BASE = '/solicitud-material';

const unwrap = (res) => {
  const payload = res?.data ?? {};
  return (payload && typeof payload === 'object' && 'data' in payload)
    ? (payload.data ?? {})
    : payload;
};

function buildParams(raw = {}) {
  const out = {};
  if (raw.empresa_id) out.empresa_id = String(raw.empresa_id);
  if (raw.tipo) out.tipo = raw.tipo;
  if (raw.subtipo?.trim()) out.subtipo = raw.subtipo.trim();
  if (raw.responsable?.trim()) out.responsable = raw.responsable.trim(); // email
  if (raw.proveedor?.trim()) out.proveedor = raw.proveedor.trim();
  if (raw.fecha_desde) out.fecha_desde = raw.fecha_desde;
  if (raw.fecha_hasta) out.fecha_hasta = raw.fecha_hasta;
  if (typeof raw.sort === 'string' && raw.sort.includes(':')) out.sort = raw.sort;
  out.limit = Number.isFinite(Number(raw.limit)) ? Number(raw.limit) : 25;
  out.page  = Number.isFinite(Number(raw.page))  ? Number(raw.page)  : 0;
  return out;
}

const StockSolicitudesService = {
  
  crearSolicitud: async (payload) => {
    console.log('[SVC][crearSolicitud] payload -----------------------------------=', payload);
    try {
      const res = await api.post(BASE, payload);
      if (res.status !== 201) throw new Error('Error al crear solicitud');
      return unwrap(res);
    } catch (err) {
      console.error('[SVC][crearSolicitud] ERROR:', {
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        data: err?.response?.data,
        message: err?.message,
        url: err?.config?.url,
        method: err?.config?.method,
        payload: payload
      });
      throw err; // re-throw para que el UI lo capture
    }
  },
  
  actualizarSolicitud: async (solicitudId, patch) => {
    const endpoint = `${BASE}/${solicitudId}`;
    console.log(`[SVC][PATCH] ${endpoint}`, patch);
    try {
      const res = await api.patch(endpoint, patch);
      console.log(`[SVC][PATCH OK] status=${res.status}`);
      if (res.status === 200) return unwrap(res);
      throw new Error('Error al actualizar solicitud');
    } catch (err) {
      const status = err?.response?.status;
      console.error(`[SVC][PATCH ERR] ${endpoint} status=${status}`, err?.response?.data || err);
      throw new Error('Error al actualizar solicitud');
    }
  },
  
  obtenerSolicitud: async ({ solicitudId }) => {
    const res = await api.get(`${BASE}/${solicitudId}`);
    if (res.status !== 200) return null;
    return unwrap(res); // { solicitud, movimientos }
  },
  
  listarSolicitudes: async (raw = {}) => {
    const params = buildParams(raw);
    console.log('[SVC][listarSolicitudes] params =', params);
    try {
      const res = await api.get(BASE, { params });
      const d = unwrap(res);
      const items = Array.isArray(d.items) ? d.items : [];

      const normalized = items.map((it) => {
        if (it && it.solicitud && Array.isArray(it.movimientos)) return it;
        const movs = Array.isArray(it?._movs) ? it._movs
                  : (Array.isArray(it?.movimientos) ? it.movimientos : []);
        return { solicitud: it, movimientos: movs };
      });
      return {
        items: normalized,
        total: Number(d.total ?? normalized.length),
        limit: Number(d.limit ?? params.limit),
        page: Number(d.page ?? params.page),
        skip: Number(d.skip ?? params.page * params.limit),
      };
    } catch (err) {
      console.error('[SVC][listarSolicitudes][ERR] params=', params, ' status=', err?.response?.status, ' data=', err?.response?.data || err);
      throw err;
    }
  },
  
  listarUsuarios: async ({ empresa_id }) => {
    console.log('[SVC][listarUsuarios][solicitudes] empresa_id =', empresa_id);
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

  guardarSolicitud: async ({ user, form, movs = [], editMode = false, editId = null }) => {
    if (!user) throw new Error('Usuario no autenticado');
    // Validaciones mínimas por movimiento
    for (let i = 0; i < movs.length; i++) {
      const m = movs[i];
      if (!Number.isFinite(Number(m?.cantidad)) || Number(m?.cantidad) === 0) {
        throw new Error(`Movimiento #${i + 1}: la cantidad debe ser distinta de 0`);
      }
    }

    const empresa = await getEmpresaDetailsFromUser(user);

    const movimientos = (movs || [])
      .filter(m => Number(m?.cantidad)) // Solo requerir cantidad > 0
      .map(m => ({
        // incluir el _id del movimiento si existe para que el backend lo identifique al actualizar
        _id: m._id ?? null,

        empresa_id: empresa.id,
        usuario_id: user?.uid || user?.id || null,
        usuario_mail: user?.email || null,

        nombre_item: m.nombre_item?.trim() || `Material sin nombre ${Date.now()}`, // Asegurar que siempre tenga nombre_item
        cantidad: Number(m.cantidad),
        tipo: String(m.tipo || 'EGRESO').toUpperCase(),
        subtipo: m.subtipo ? String(m.subtipo).toUpperCase() : null,
        fecha_movimiento: m.fecha_movimiento || form?.fecha || new Date().toISOString(),
        proyecto_id: m.proyecto_id || null,
        proyecto_nombre: m.proyecto_nombre || null,
        observacion: m.observacion || null,

        id_material: m.id_material ?? null,
      }));

    // Preparar fecha para la solicitud (11:00 del mediodía)
    let fechaSolicitud = form?.fecha || new Date().toISOString();
    if (form?.fecha && typeof form.fecha === 'string') {
      // Si viene una fecha en formato YYYY-MM-DD, convertirla a las 11:00
      const date = new Date(form.fecha + 'T11:00:00.000Z');
      fechaSolicitud = date.toISOString();
    }

    const payload = {
      solicitud: {
        empresa_id: empresa.id,
        tipo: form?.tipo || 'INGRESO',
        subtipo: form?.subtipo?.trim() || '-',
        responsable: form?.responsable?.trim() || null,
        proveedor: (form?.proveedor_nombre || form?.proveedor_id || form?.proveedor_cuit)
          ? { id: form.proveedor_id || null, nombre: form.proveedor_nombre || null, cuit: form.proveedor_cuit || null }
          : null,
        id_compra: form?.id_compra?.trim() || null,
        url_doc: form?.url_doc?.trim() || null,
        documentos: Array.isArray(form?.documentos) ? form.documentos.filter(Boolean) : [], // Array de URLs de documentos
        proyecto_id: form?.proyecto_id || null,
        proyecto_nombre: form?.proyecto_nombre || null,
        fecha: fechaSolicitud,
      },
      movimientos,
    };

    // si es edición, incluir el _id de la solicitud dentro del payload para que el backend lo reciba
    if (editMode && editId) {
      payload.solicitud._id = editId;
      return await StockSolicitudesService.actualizarSolicitud(editId, payload);
    }
    return await StockSolicitudesService.crearSolicitud(payload);
  },

  // Eliminar solicitud completa (con todos sus movimientos)
  eliminarSolicitud: async (solicitudId) => {
    if (!solicitudId) throw new Error('ID de solicitud requerido');
    const endpoint = `${BASE}/${solicitudId}`;
    console.log('[SVC][DELETE] solicitudId=', solicitudId, 'endpoint=', endpoint);
    try {
      const res = await api.delete(endpoint);
      console.log(`[SVC][DELETE OK] status=${res.status}`);
      if (res.status === 200 || res.status === 204) return unwrap(res);
      throw new Error('Error al eliminar solicitud');
    } catch (err) {
      const status = err?.response?.status;
      console.error('[SVC][DELETE] URL intentada:', err?.config?.url);
      console.error(`[SVC][DELETE ERR] ${endpoint} status=${status}`, err?.response?.data || err);
      throw new Error('Error al eliminar solicitud');
    }
  },

  /**
   * Extraer datos de una factura de compra usando IA (ChatGPT Vision)
   * @param {string|string[]} urlFactura - URL(s) de la imagen de factura
   * @returns {Promise<Object>} - Datos extraídos de la factura
   */
  extraerDatosFactura: async (urlFactura) => {
    if (!urlFactura) throw new Error('URL de factura requerida');
    const endpoint = `${BASE}/extraer-factura`;
    console.log('[SVC][extraerDatosFactura] URL:', urlFactura);
    try {
      const res = await api.post(endpoint, { url_factura: urlFactura });
      console.log(`[SVC][extraerDatosFactura OK] status=${res.status}`);
      const data = unwrap(res);
      return data?.datos || data;
    } catch (err) {
      const status = err?.response?.status;
      console.error(`[SVC][extraerDatosFactura ERR] ${endpoint} status=${status}`, err?.response?.data || err);
      throw new Error(err?.response?.data?.message || 'Error al extraer datos de la factura');
    }
  },

  /**
   * Conciliar materiales extraídos con materiales existentes en el inventario
   * @param {Array} materiales - Array de materiales a conciliar
   * @param {string} empresa_id - ID de la empresa
   * @returns {Promise<Object>} - Resultado de conciliación con materiales actualizados
   */
  conciliarMateriales: async (materiales, empresa_id) => {
    if (!materiales || !Array.isArray(materiales)) throw new Error('Materiales debe ser un array');
    if (!empresa_id) throw new Error('empresa_id es requerido');
    const endpoint = `${BASE}/conciliar-materiales`;
    console.log('[SVC][conciliarMateriales] materiales:', materiales.length, 'empresa:', empresa_id);
    try {
      const res = await api.post(endpoint, { materiales, empresa_id });
      console.log(`[SVC][conciliarMateriales OK] status=${res.status}`);
      return unwrap(res);
    } catch (err) {
      const status = err?.response?.status;
      console.error(`[SVC][conciliarMateriales ERR] ${endpoint} status=${status}`, err?.response?.data || err);
      throw new Error(err?.response?.data?.message || 'Error al conciliar materiales');
    }
  },

  /**
   * Extraer datos de un remito de entrega usando IA (ChatGPT Vision)
   * @param {string|string[]} urlRemito - URL(s) de la imagen del remito
   * @returns {Promise<Object>} - Datos extraídos del remito
   */
  extraerDatosRemito: async (urlRemito) => {
    if (!urlRemito) throw new Error('URL de remito requerida');
    const endpoint = `${BASE}/extraer-remito`;
    console.log('[SVC][extraerDatosRemito] URL:', urlRemito);
    try {
      const res = await api.post(endpoint, { url_remito: urlRemito });
      console.log(`[SVC][extraerDatosRemito OK] status=${res.status}`);
      const data = unwrap(res);
      return data?.datos || data;
    } catch (err) {
      const status = err?.response?.status;
      console.error(`[SVC][extraerDatosRemito ERR] ${endpoint} status=${status}`, err?.response?.data || err);
      throw new Error(err?.response?.data?.message || 'Error al extraer datos del remito');
    }
  },

  /**
   * Conciliar materiales extraídos de un remito con materiales existentes en el inventario (para egreso)
   * @param {Array} materiales - Array de materiales a conciliar
   * @param {string} empresa_id - ID de la empresa
   * @returns {Promise<Object>} - Resultado de conciliación con materiales actualizados
   */
  conciliarMaterialesEgreso: async (materiales, empresa_id) => {
    if (!materiales || !Array.isArray(materiales)) throw new Error('Materiales debe ser un array');
    if (!empresa_id) throw new Error('empresa_id es requerido');
    const endpoint = `${BASE}/conciliar-materiales-egreso`;
    console.log('[SVC][conciliarMaterialesEgreso] materiales:', materiales.length, 'empresa:', empresa_id);
    try {
      const res = await api.post(endpoint, { materiales, empresa_id });
      console.log(`[SVC][conciliarMaterialesEgreso OK] status=${res.status}`);
      return unwrap(res);
    } catch (err) {
      const status = err?.response?.status;
      console.error(`[SVC][conciliarMaterialesEgreso ERR] ${endpoint} status=${status}`, err?.response?.data || err);
      throw new Error(err?.response?.data?.message || 'Error al conciliar materiales para egreso');
    }
  },
};

export default StockSolicitudesService;
export { buildParams };
