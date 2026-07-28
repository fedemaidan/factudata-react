import api from './axiosConfig';

/**
 * Administración interna de Sorby: clientes (suscripción), cobranzas y Caja Sorby.
 * Dominio distinto del producto. Ver
 * docs/CENTRALIZACION_CLIENTES_COBRANZAS_CAJA_SORBY_TECNICO.md.
 */
const adminSuscripcionService = {
  /** Maestro de clientes (empresas esCliente) con derivados. */
  async maestro() {
    const { data } = await api.get('/admin/clientes');
    return data;
  },

  /** Set suscripción + campos comerciales de una empresa cliente. */
  async setSuscripcion(empresaId, payload) {
    const { data } = await api.put(`/admin/clientes/${empresaId}/suscripcion`, payload);
    return data;
  },

  /** Listado de cobranzas calculado para un período 'YYYY-MM'. */
  async cobranzas(periodo) {
    const params = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
    const { data } = await api.get(`/admin/cobranzas${params}`);
    return data;
  },

  /**
   * Registrar un cobro.
   * @param {object} payload - {
   *   empresa_cliente_id, periodo, numero_cuota?, concepto?, importe_cobrado,
   *   importe_esperado?, moneda?, fecha_cobro?, medio_pago?,
   *   caja: 'facu'|'fede'|'puente', facturado?, factura_a_nombre_de?, motivo_diferencia?
   * }
   */
  async registrarCobro(payload) {
    const { data } = await api.post('/admin/cobranzas/cobrar', payload);
    return data;
  },

  async anularCobro(cobroId, payload = {}) {
    const { data } = await api.post(`/admin/cobranzas/${cobroId}/anular`, payload);
    return data;
  },

  /** Editar un cobro (anula el original y registra uno nuevo con los datos editados). */
  async editarCobro(cobroId, payload) {
    const { data } = await api.put(`/admin/cobranzas/${cobroId}`, payload);
    return data;
  },

  /** Omitir (saltear) o reactivar el cobro de un período de una empresa. */
  async omitirPeriodo(empresaClienteId, periodo, omitir = true) {
    const { data } = await api.post('/admin/cobranzas/omitir', {
      empresa_cliente_id: empresaClienteId, periodo, omitir,
    });
    return data;
  },

  /** Deuda acumulada por cliente hasta una fecha de corte (default hoy). T6a. */
  async deudaGeneral(hasta) {
    const params = hasta ? `?hasta=${encodeURIComponent(hasta)}` : '';
    const { data } = await api.get(`/admin/cobranzas/deuda${params}`);
    return data;
  },

  /** Vista de Mora: deuda vencida hasta fin del mes anterior (default). T6a. */
  async mora(hasta) {
    const params = hasta ? `?hasta=${encodeURIComponent(hasta)}` : '';
    const { data } = await api.get(`/admin/mora${params}`);
    return data;
  },

  /** Guarda/actualiza la nota de seguimiento de un período (texto vacío la borra). T8. */
  async setNotaCobranza(empresaClienteId, periodo, texto) {
    const { data } = await api.post('/admin/cobranzas/nota', {
      empresa_cliente_id: empresaClienteId, periodo, texto,
    });
    return data;
  },

  /** Cierra (o reabre) el saldo de un período parcial → queda pagado. T11b. */
  async cerrarParcial(empresaClienteId, periodo, justificacion, cerrar = true) {
    const { data } = await api.post('/admin/cobranzas/cerrar-parcial', {
      empresa_cliente_id: empresaClienteId, periodo, justificacion, cerrar,
    });
    return data;
  },

  /**
   * Posponer un vencimiento N meses. `periodo` = período ORIGINAL del vencimiento.
   * `cascada=true` mueve esa cuota y todas las siguientes; false solo esa. `meses=0` deshace.
   */
  async posponerCobro(empresaClienteId, periodo, meses, cascada = false) {
    const { data } = await api.post('/admin/cobranzas/posponer', {
      empresa_cliente_id: empresaClienteId, periodo, meses, cascada,
    });
    return data;
  },

  // ─── Configuración global (T7) ───────────────────────────────────────
  async getConfig() {
    const { data } = await api.get('/admin/config');
    return data;
  },

  async setConfig(payload) {
    const { data } = await api.put('/admin/config', payload);
    return data;
  },

  // ─── Reportes (Fase 3) ───────────────────────────────────────────────
  async reporteClientes(periodo) {
    const params = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
    const { data } = await api.get(`/admin/reportes/clientes${params}`);
    return data;
  },

  async reporteSocios() {
    const { data } = await api.get('/admin/reportes/socios');
    return data;
  },

  async reporteFacturacionMp() {
    const { data } = await api.get('/admin/reportes/facturacion-mp');
    return data;
  },

  // ─── Ficha comercial ─────────────────────────────────────────────────
  async fichaCliente(empresaId) {
    const { data } = await api.get(`/admin/clientes/${empresaId}/ficha`);
    return data;
  },

  async refreshAnalytics(empresaId) {
    const { data } = await api.post(`/admin/clientes/${empresaId}/ficha/refresh-analytics`);
    return data;
  },

  // ─── Ingresos atribuidos (no-suscripción) ────────────────────────────
  async registrarIngreso(empresaId, payload) {
    const { data } = await api.post(`/admin/clientes/${empresaId}/ingresos`, payload);
    return data;
  },

  async ingresosSinAtribuir() {
    const { data } = await api.get('/admin/movimientos/sin-atribuir');
    return data;
  },

  async atribuirMovimiento(movId, empresaClienteId) {
    const { data } = await api.post(`/admin/movimientos/${movId}/atribuir`, { empresa_cliente_id: empresaClienteId || null });
    return data;
  },
};

export default adminSuscripcionService;
