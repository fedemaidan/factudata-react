// src/services/movimientoMaterialService.js
import api from './axiosConfig';

/**
 * Helper para armar query params (omite undefined/null)
 */
const buildQuery = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    // cursor y orderBy pueden venir como objeto/array -> serializamos JSON
    if (k === 'cursor' || k === 'orderBy') {
      q.append(k, typeof v === 'string' ? v : JSON.stringify(v));
    } else {
      q.append(k, v);
    }
  });
  return q.toString();
};

/**
 * Servicio de Movimientos de Material
 * Endpoints base: /movimientos-materiales
 */
const MovimientoMaterialService = {
  /**
   * Crear movimiento
   * Requeridos: empresa_id, nombre, cantidad, tipo ('entrada'|'salida')
   * @param {Object} data
   * @returns {Promise<Object>} movimiento creado
   */
  crear: async (data) => {
    const res = await api.post('/movimientos-materiales', data);
    if (res.status !== 201) throw new Error('No se pudo crear el movimiento.');
    return res.data;
  },

  /**
   * Obtener movimiento por id
   * @param {string} id
   * @returns {Promise<Object>}
   */
  obtenerPorId: async (id) => {
    const res = await api.get(`/movimientos-materiales/${id}`);
    return res.data;
  },

  /**
   * Listar movimientos con filtros y paginado
   * Filtros soportados: empresa_id, proyecto_id, tipo, nombrePrefix, desde, hasta
   * Extras: limit, cursor, orderBy
   * @param {Object} params
   * @returns {Promise<{items:Object[], nextCursor?:any}>}
   */
  listar: async (params = {}) => {
    const qs = buildQuery(params);
    const res = await api.get(`/movimientos-materiales${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  /**
   * Actualizar (PATCH) movimiento
   * @param {string} id
   * @param {Object} patch
   * @returns {Promise<Object>}
   */
  actualizar: async (id, patch) => {
    const res = await api.patch(`/movimientos-materiales/${id}`, patch);
    return res.data;
  },

  /**
   * Eliminar movimiento
   * @param {string} id
   * @returns {Promise<void>}
   */
  eliminar: async (id) => {
    const res = await api.delete(`/movimientos-materiales/${id}`);
    if (res.status !== 204) throw new Error('No se pudo eliminar el movimiento.');
  },

  /**
   * Listar por movimiento_compra_id
   * @param {string} compraId
   * @param {{limit?:number, cursor?:any}} opts
   * @returns {Promise<{items:Object[], nextCursor?:any}>}
   */
  listarPorCompra: async (compraId, opts = {}) => {
    const qs = buildQuery(opts);
    const res = await api.get(`/movimientos-materiales/compra/${compraId}${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  /**
   * Resumen simple de stock (entrada/salida/neto)
   * @param {{empresa_id?:string, proyecto_id?:string, nombre?:string, desde?:string|Date, hasta?:string|Date}} params
   * @returns {Promise<{entrada:number, salida:number, neto:number}>}
   */
  stock: async (params = {}) => {
    const qs = buildQuery(params);
    const res = await api.get(`/movimientos-materiales/stock${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  // --------- Helpers de conveniencia para UI ---------

  /**
   * Listar por empresa (atajo)
   * @param {string} empresa_id
   * @param {Object} extra - otros filtros (tipo, nombrePrefix, desde, hasta, limit, cursor, orderBy)
   */
  listarPorEmpresa: async (empresa_id, extra = {}) => {
    return MovimientoMaterialService.listar({ empresa_id, ...extra });
  },

  /**
   * Listar por proyecto (atajo)
   * @param {string} proyecto_id
   * @param {Object} extra
   */
  listarPorProyecto: async (proyecto_id, extra = {}) => {
    return MovimientoMaterialService.listar({ proyecto_id, ...extra });
  },

  /**
   * Cursor helpers (opcional): encode/decode si querés tokens opacos
   */
  encodeCursor: (cursorObj) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(cursorObj)))),
  decodeCursor: (cursorStr) => {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(cursorStr))));
    } catch {
      return undefined;
    }
  }
};

export default MovimientoMaterialService;
