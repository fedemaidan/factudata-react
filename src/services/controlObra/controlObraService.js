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

  actualizarObra: async (id, empresa_id, cambios) => unwrap(await api.patch(`${BASE}/${id}`, { empresa_id, cambios })),
  registrarAvance: async (id, subrubroUid, empresa_id, avance_pct) => unwrap(await api.patch(`${BASE}/${id}/subrubros/${subrubroUid}/avance`, { empresa_id, avance_pct })),
  editarSubrubro: async (id, subrubroUid, empresa_id, cambios) => unwrap(await api.patch(`${BASE}/${id}/subrubros/${subrubroUid}`, { empresa_id, cambios })),
  eliminarSubrubro: async (id, subrubroUid, empresa_id) => unwrap(await api.delete(`${BASE}/${id}/subrubros/${subrubroUid}`, { params: { empresa_id } })),
  // contrato = { proveedor_id, proveedor_nombre, monto, modalidad } | null (para borrar)
  asignarContrato: async (id, subrubroUid, empresa_id, contrato) => unwrap(await api.patch(`${BASE}/${id}/subrubros/${subrubroUid}/contrato`, { empresa_id, contrato })),
  // responsable = { user_id, nombre } | null (para borrar)
  asignarResponsable: async (id, subrubroUid, empresa_id, responsable) => unwrap(await api.patch(`${BASE}/${id}/subrubros/${subrubroUid}/responsable`, { empresa_id, responsable })),

  /* ---------- CRUD de estructura + auditoría ---------- */
  agregarRubro: async (id, empresa_id, nombre) => unwrap(await api.post(`${BASE}/${id}/rubros`, { empresa_id, nombre })),
  editarRubro: async (id, rubroUid, empresa_id, nombre) => unwrap(await api.patch(`${BASE}/${id}/rubros/${rubroUid}`, { empresa_id, nombre })),
  eliminarRubro: async (id, rubroUid, empresa_id) => unwrap(await api.delete(`${BASE}/${id}/rubros/${rubroUid}`, { params: { empresa_id } })),
  agregarSubrubro: async (id, rubroUid, empresa_id, data) => unwrap(await api.post(`${BASE}/${id}/rubros/${rubroUid}/subrubros`, { empresa_id, ...data })),
  auditoria: async (id, empresa_id) => {
    const res = await api.get(`${BASE}/${id}/auditoria`, { params: { empresa_id } });
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },

  curvaS: async (id, empresa_id) => {
    const res = await api.get(`${BASE}/${id}/curva-s`, { params: { empresa_id } });
    if (res.status === 200) return unwrap(res);
    return { meses: [], certificado: [], cobrado: [], plan: [] };
  },

  cronograma: async (id, empresa_id) => {
    const res = await api.get(`${BASE}/${id}/cronograma`, { params: { empresa_id } });
    if (res.status === 200) return unwrap(res);
    return { rango: { min: null, max: null }, rubros: [] };
  },

  /* ---------- Cartera (cross-obra) ---------- */
  resumenCartera: async (empresa_id, { incluir_archivadas = false } = {}) => {
    const res = await api.get(`${BASE}/cartera/resumen`, { params: { empresa_id, incluir_archivadas: incluir_archivadas ? 'true' : undefined } });
    if (res.status !== 200) throw new Error('Error al obtener la cartera');
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },

  /* ---------- Archivar / eliminar obra ---------- */
  archivarObra: async (id, empresa_id) => unwrap(await api.patch(`${BASE}/${id}/archivar`, { empresa_id })),
  desarchivarObra: async (id, empresa_id) => unwrap(await api.patch(`${BASE}/${id}/desarchivar`, { empresa_id })),
  eliminarObra: async (id, empresa_id) => unwrap(await api.delete(`${BASE}/${id}`, { params: { empresa_id } })),

  cobranzas: async (empresa_id) => {
    const res = await api.get(`${BASE}/cartera/cobranzas`, { params: { empresa_id } });
    if (res.status !== 200) throw new Error('Error al obtener cobranzas');
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },

  pagosCartera: async (empresa_id) => {
    const res = await api.get(`${BASE}/cartera/pagos`, { params: { empresa_id } });
    if (res.status !== 200) throw new Error('Error al obtener pagos');
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },

  cobrarCuota: async (obraId, cuotaId, empresa_id) => unwrap(await api.post(`${BASE}/${obraId}/cuotas/${cuotaId}/cobrar`, { empresa_id })),

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

  // Re-imputación masiva (T1b): preview con sugerencias del matcher + aplicar en lote.
  reimputarLote: async (obraId, empresa_id, limit) => {
    const res = await api.get(`${BASE}/${obraId}/reimputar-lote`, { params: { empresa_id, ...(limit ? { limit } : {}) } });
    if (res.status !== 200) throw new Error('Error al obtener el lote a re-imputar');
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },
  reimputarAplicar: async (obraId, data) => unwrap(await api.post(`${BASE}/${obraId}/reimputar-aplicar`, data)),

  /* ---------- Mano de obra (Fase 3) ---------- */
  listarOrdenes: async (obraId, empresa_id) => {
    const res = await api.get(`${BASE}/${obraId}/ordenes-pago`, { params: { empresa_id } });
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },
  crearOrden: async (obraId, data) => unwrap(await api.post(`${BASE}/${obraId}/ordenes-pago`, data)),
  ordenesSugeridas: async (obraId, empresa_id) => {
    const res = await api.get(`${BASE}/${obraId}/ordenes-sugeridas`, { params: { empresa_id } });
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },
  generarOrdenSugerida: async (obraId, empresa_id, proveedor_key) => unwrap(await api.post(`${BASE}/${obraId}/ordenes-sugeridas/generar`, { empresa_id, proveedor_key })),
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

  editarCertificado: async (certId, empresa_id, lineas) => unwrap(await api.patch(`${BASE}/certificados/${certId}`, { empresa_id, lineas })),
  descargarActa: async (certId, empresa_id, numero) => {
    const res = await api.get(`${BASE}/certificados/${certId}/acta`, { params: { empresa_id }, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = `certificado-${numero || certId}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
  },
  enviarCertificado: async (certId, empresa_id) => unwrap(await api.post(`${BASE}/certificados/${certId}/enviar`, { empresa_id })),
  aprobarCertificado: async (certId, empresa_id) => unwrap(await api.post(`${BASE}/certificados/${certId}/aprobar`, { empresa_id })),
  rechazarCertificado: async (certId, empresa_id, motivo) => unwrap(await api.post(`${BASE}/certificados/${certId}/rechazar`, { empresa_id, motivo })),
  anularCertificado: async (certId, empresa_id, motivo) => unwrap(await api.post(`${BASE}/certificados/${certId}/anular`, { empresa_id, motivo })),
  cobrarCertificado: async (certId, empresa_id, montoParcial = null, fechaCobrado = null) =>
    unwrap(await api.post(`${BASE}/certificados/${certId}/cobrar`, { empresa_id, monto_parcial: montoParcial, fecha_cobrado: fechaCobrado })),

  // Multi-plan: crear/asociar/desasociar planes de cobro de la obra (0..N).
  // `plan_cobro_id` presente → asocia uno existente; ausente → crea uno nuevo.
  agregarPlan: async (obraId, empresa_id, { plan_cobro_id = null, nombre = null, monto_total = 0 } = {}) =>
    unwrap(await api.post(`${BASE}/${obraId}/planes`, { empresa_id, plan_cobro_id, nombre, monto_total })),
  desasociarPlan: async (obraId, empresa_id, planId) =>
    unwrap(await api.delete(`${BASE}/${obraId}/planes/${planId}`, { params: { empresa_id } })),

  /* ---------- Planes de pago a proveedores (T3, lado costo) ----------
     Espejo outbound de los planes de cobro: 0..N por obra, cada uno con sus
     cuotas + resumen embebidos por el backend (getPlanes ya devuelve ambos). */
  listarPlanesPago: async (obraId, empresa_id) => {
    const res = await api.get(`${BASE}/${obraId}/planes-pago`, { params: { empresa_id } });
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },
  crearPlanPago: async (obraId, data) => unwrap(await api.post(`${BASE}/${obraId}/planes-pago`, data)),
  generarCuotasPorAvance: async (planId, empresa_id, fecha_vencimiento = null) =>
    unwrap(await api.post(`${BASE}/planes-pago/${planId}/cuotas/por-avance`, { empresa_id, fecha_vencimiento })),
};

export default ControlObraService;
