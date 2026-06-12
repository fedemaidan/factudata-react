import api from './axiosConfig';

/**
 * Service HTTP para el header unificado de ventas (vertical corralón).
 * Espejo de ventaContraEntregaService, apuntando a /empresa/:id/ventas.
 *
 * Ver docs/corralones/04-endpoints.md §Ventas.
 */
const ventaService = {
  async listar(empresaId, filtros = {}) {
    const qs = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    });
    const params = qs.toString() ? `?${qs.toString()}` : '';
    const { data } = await api.get(`/empresa/${empresaId}/ventas${params}`);
    return data;
  },

  // Variante paginada: devuelve { items, total } (con_total=1 en el backend).
  async listarPaginado(empresaId, filtros = {}) {
    const data = await this.listar(empresaId, { ...filtros, con_total: 1 });
    return data && Array.isArray(data.items) ? data : { items: [], total: 0 };
  },

  async obtener(empresaId, id) {
    const { data } = await api.get(`/empresa/${empresaId}/ventas/${id}`);
    return data;
  },

  // Venta de productos (flujo único). payload.modalidad = contado | cc | contra_entrega.
  async crear(empresaId, payload) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas`, payload);
    return data;
  },

  // Acopio (lógica propia). payload acepta: tipo ('materiales'|'lista_precios'),
  // materiales[] (lista de precios congelada) y cobrado (pagado al momento).
  async crearAcopio(empresaId, payload) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/acopio`, payload);
    return data;
  },

  // OCR de cotización (PDF/foto) para precargar venta o acopio. Devuelve
  // { tipo, cliente_detectado, total, neto, impuestos, fecha_entrega, items[] }
  // con items ya conciliados contra el catálogo (material_id cuando matchea).
  async extraerCotizacion(empresaId, files) {
    const form = new FormData();
    (Array.isArray(files) ? files : [files]).forEach((f) => form.append('archivos', f));
    const { data } = await api.post(`/empresa/${empresaId}/ventas/extraer-cotizacion`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // Lista de precios congelada + saldo de un acopio de cliente.
  async listaPreciosAcopio(empresaId, acopioId) {
    const { data } = await api.get(`/empresa/${empresaId}/ventas/acopio/${acopioId}/lista-precios`);
    return data;
  },

  // Retiro de material de un acopio de cliente (corralón). Sin impacto en stock.
  async desacopioCliente(empresaId, acopioId, payload) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/acopio/${acopioId}/desacopio`, payload);
    return data;
  },

  // Recarga de saldo del acopio (precios congelados sin cambios).
  async recargarAcopio(empresaId, acopioId, payload) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/acopio/${acopioId}/recargar`, payload);
    return data;
  },

  // Devolución de material a un acopio de cliente (inverso del retiro: re-acredita saldo).
  async devolucionAcopio(empresaId, acopioId, payload) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/acopio/${acopioId}/devolucion`, payload);
    return data;
  },

  // Cierra un acopio de cliente resolviendo el saldo final.
  // payload: { modo: 'cuenta_corriente'|'trasladar'|'resignar', acopio_destino_id? }
  async cerrarAcopio(empresaId, acopioId, payload) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/acopio/${acopioId}/cerrar`, payload);
    return data;
  },

  async registrarEntrega(empresaId, id, payload = {}) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/${id}/entregar`, payload);
    return data;
  },

  async cancelar(empresaId, id, payload = {}) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/${id}/cancelar`, payload);
    return data;
  },

  async cobrar(empresaId, id, payload = {}) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/${id}/cobrar`, payload);
    return data;
  },

  async editar(empresaId, id, payload = {}) {
    const { data } = await api.put(`/empresa/${empresaId}/ventas/${id}`, payload);
    return data;
  },

  async eliminar(empresaId, id) {
    const { data } = await api.delete(`/empresa/${empresaId}/ventas/${id}`);
    return data;
  },

  // ── Borradores (venta inerte: se completa/confirma después) ──
  async crearBorrador(empresaId, payload) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/borrador`, payload);
    return data;
  },

  async editarBorrador(empresaId, id, payload = {}) {
    const { data } = await api.put(`/empresa/${empresaId}/ventas/${id}/borrador`, payload);
    return data;
  },

  async confirmarBorrador(empresaId, id) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/${id}/confirmar-borrador`);
    return data;
  },
};

export default ventaService;
