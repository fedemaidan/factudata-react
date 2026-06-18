import api from '../axiosConfig';

/* ================================================================
   ControlObraService (Fase 1)
   Base URL backend: /control-obra  (desacoplado de presupuestos)
   ================================================================ */

const BASE = '/control-obra';

const unwrap = (res) => {
  const payload = res?.data ?? {};
  return payload && typeof payload === 'object' && 'data' in payload
    ? (payload.data ?? {})
    : payload;
};

const ControlObraService = {
  /* ---------- Obras ---------- */
  crearObra: async (data) => {
    const res = await api.post(`${BASE}`, data);
    if (res.status === 200 || res.status === 201) return unwrap(res);
    throw new Error('No se pudo crear la obra');
  },

  listarObras: async (filters = {}) => {
    const params = {};
    if (filters.empresa_id) params.empresa_id = filters.empresa_id;
    if (filters.estado) params.estado = filters.estado;
    if (filters.proyecto_id) params.proyecto_id = filters.proyecto_id;
    const res = await api.get(`${BASE}`, { params });
    if (res.status !== 200) throw new Error('Error al listar obras');
    return {
      ok: !!res.data?.ok,
      items: Array.isArray(res.data?.items) ? res.data.items : [],
      total: Number(res.data?.total ?? 0),
    };
  },

  obtenerObra: async (id, empresa_id) => {
    const res = await api.get(`${BASE}/${id}`, { params: { empresa_id } });
    if (res.status === 200) return unwrap(res);
    throw new Error('Error al obtener la obra');
  },

  /* ---------- Cartera (cross-obra) ---------- */
  resumenCartera: async (empresa_id) => {
    const res = await api.get(`${BASE}/cartera/resumen`, { params: { empresa_id } });
    if (res.status !== 200) throw new Error('Error al obtener la cartera');
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },

  cobranzas: async (empresa_id) => {
    const res = await api.get(`${BASE}/cartera/cobranzas`, { params: { empresa_id } });
    if (res.status !== 200) throw new Error('Error al obtener cobranzas');
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },

  /* ---------- Costo y margen (Fase 2) ---------- */
  ejecucion: async (obraId, empresa_id) => {
    const res = await api.get(`${BASE}/${obraId}/ejecucion`, { params: { empresa_id } });
    if (res.status === 200) return unwrap(res);
    throw new Error('Error al obtener la ejecución');
  },

  egresosCandidatos: async (obraId, empresa_id) => {
    const res = await api.get(`${BASE}/${obraId}/egresos-candidatos`, { params: { empresa_id } });
    if (res.status !== 200) throw new Error('Error al obtener egresos');
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },

  imputarGasto: async (obraId, data) => unwrap(await api.post(`${BASE}/${obraId}/imputar`, data)),

  /* ---------- Mano de obra (Fase 3) ---------- */
  listarOrdenes: async (obraId, empresa_id) => {
    const res = await api.get(`${BASE}/${obraId}/ordenes-pago`, { params: { empresa_id } });
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },
  crearOrden: async (obraId, data) => unwrap(await api.post(`${BASE}/${obraId}/ordenes-pago`, data)),
  aprobarOrden: async (ordenId, empresa_id) => unwrap(await api.post(`${BASE}/ordenes-pago/${ordenId}/aprobar`, { empresa_id })),
  pagarOrden: async (ordenId, empresa_id) => unwrap(await api.post(`${BASE}/ordenes-pago/${ordenId}/pagar`, { empresa_id })),
  anularOrden: async (ordenId, empresa_id) => unwrap(await api.post(`${BASE}/ordenes-pago/${ordenId}/anular`, { empresa_id })),

  /* ---------- Reportes / conforme (Fase 4) ---------- */
  listarInconvenientes: async (obraId, empresa_id) => {
    const res = await api.get(`${BASE}/${obraId}/inconvenientes`, { params: { empresa_id } });
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },
  crearInconveniente: async (obraId, data) => unwrap(await api.post(`${BASE}/${obraId}/inconvenientes`, data)),
  resolverInconveniente: async (incId, empresa_id, resolucion) => unwrap(await api.post(`${BASE}/inconvenientes/${incId}/resolver`, { empresa_id, resolucion })),
  emitirConforme: async (obraId, empresa_id, checklist) => unwrap(await api.post(`${BASE}/${obraId}/conforme`, { empresa_id, checklist })),

  /* ---------- Certificados ---------- */
  listarCertificados: async (obraId, empresa_id) => {
    const res = await api.get(`${BASE}/${obraId}/certificados`, { params: { empresa_id } });
    if (res.status !== 200) throw new Error('Error al listar certificados');
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },

  crearCertificado: async (obraId, data) => {
    const res = await api.post(`${BASE}/${obraId}/certificados`, data);
    if (res.status === 200 || res.status === 201) return unwrap(res);
    throw new Error('No se pudo crear el certificado');
  },

  enviarCertificado: async (certId, empresa_id) => unwrap(await api.post(`${BASE}/certificados/${certId}/enviar`, { empresa_id })),
  aprobarCertificado: async (certId, empresa_id) => unwrap(await api.post(`${BASE}/certificados/${certId}/aprobar`, { empresa_id })),
  rechazarCertificado: async (certId, empresa_id, motivo) => unwrap(await api.post(`${BASE}/certificados/${certId}/rechazar`, { empresa_id, motivo })),
  anularCertificado: async (certId, empresa_id, motivo) => unwrap(await api.post(`${BASE}/certificados/${certId}/anular`, { empresa_id, motivo })),
  cobrarCertificado: async (certId, empresa_id, montoParcial = null) =>
    unwrap(await api.post(`${BASE}/certificados/${certId}/cobrar`, { empresa_id, monto_parcial: montoParcial })),
};

export default ControlObraService;
