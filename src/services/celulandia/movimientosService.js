import axiosCelulandia from "src/services/axiosCelulandia";

const movimientosService = {
  getAllMovimientos: async ({
    type,
    populate,
    limit = 20,
    offset = 0,
    sortField,
    sortDirection,
    tipoFactura,
    clienteNombre,
    cajaNombre,
    categorias,
    categoriasToExclude,
    cajasIds,
    moneda,
    cuentaCorriente,
    montoDesde,
    montoHasta,
    montoTipo,
    nombreUsuario,
    estado,
    fecha,
    fechaInicio,
    fechaFin,
    includeInactive = false,
    totalMoneda = false,
    text,
  }) => {
    const response = await axiosCelulandia.get("/movimientos", {
      params: {
        type,
        populate,
        limit,
        offset,
        sortField,
        sortDirection,
        tipoFactura,
        clienteNombre,
        cajaNombre,
        categorias,
        cajasIds,
        moneda,
        cuentaCorriente,
        montoDesde,
        montoHasta,
        montoTipo,
        nombreUsuario,
        categoriasToExclude,
        estado,
        fecha,
        fechaInicio,
        fechaFin,
        includeInactive,
        totalMoneda,
        text,
      },
    });
    return response.data;
  },

  searchMovimientos: async (q) => {
    const response = await axiosCelulandia.get(`/movimientos/search`, {
      params: {
        q,
      },
    });
    return response.data;
  },

  getMovimientoById: async (id) => {
    const response = await axiosCelulandia.get(`/movimientos/${id}`);
    return response.data;
  },

  getMovimientoLogs: async (id) => {
    const response = await axiosCelulandia.get(`/movimientos/${id}/logs`);
    return response.data;
  },

  getMovimientosByCliente: async (clienteId) => {
    const response = await axiosCelulandia.get(`/movimientos/cliente/${clienteId}`);
    return response.data;
  },

  getMovimientosByClienteWithPagination: async ({
    clienteId,
    limit = 20,
    offset = 0,
    sortField,
    sortDirection,
    fechaInicio,
    fechaFin,
    includeInactive = false,
  }) => {
    const response = await axiosCelulandia.get(`/movimientos/cliente/${clienteId}`, {
      params: {
        limit,
        offset,
        sortField,
        sortDirection,
        fechaInicio,
        fechaFin,
        includeInactive,
      },
    });
    return response.data;
  },

  getClienteCuentaCorriente: async ({
    clienteId,
    limit = 20,
    offset = 0,
    sortField,
    sortDirection,
    fechaInicio,
    fechaFin,
    includeInactive = false,
  }) => {
    const response = await axiosCelulandia.get(
      `/movimientos/cliente/${clienteId}/cuenta-corriente`,
      {
        params: {
          limit,
          offset,
          sortField,
          sortDirection,
          fechaInicio,
          fechaFin,
          includeInactive,
        },
      }
    );
    return response.data;
  },

  getClientesTotales: async () => {
    const response = await axiosCelulandia.get("/movimientos/clientes-totales-v2");
    return response.data;
  },

  createMovimiento: async (movimientoData) => {
    const response = await axiosCelulandia.post("/movimientos", movimientoData);
    return response.data;
  },

  createMovimientoCompuesto: async ({ movimiento1, movimiento2, saveToSheet = true, calcular = true }) => {
    const response = await axiosCelulandia.post("/movimientos/compuesto", {
      movimiento1,
      movimiento2,
      saveToSheet,
      calcular,
    });
    return response.data;
  },

  updateMovimientoCompuesto: async ({ id1, data1, id2, data2, nombreUsuario }) => {
    const response = await axiosCelulandia.put("/movimientos/compuesto", {
      id1,
      data1,
      id2,
      data2,
      nombreUsuario,
    });
    return response.data;
  },

  updateMovimiento: async (id, movimientoData, nombreUsuario) => {
    const response = await axiosCelulandia.put(`/movimientos/${id}`, {
      ...movimientoData,
      nombreUsuario,
    });
    return response.data;
  },

  deleteMovimiento: async (id, nombreUsuario) => {
    const response = await axiosCelulandia.delete(`/movimientos/${id}`, {
      data: { nombreUsuario },
    });
    return response.data;
  },

  getMovimientosByType: async (type) => {
    const response = await axiosCelulandia.get(`/movimientos/tipo/${type}`);
    return response.data;
  },

  getMovimientosByFechaRange: async (fechaInicio, fechaFin) => {
    const response = await axiosCelulandia.get(`/movimientos/fecha/${fechaInicio}/${fechaFin}`);
    return response.data;
  },

  getEstadisticas: async () => {
    const response = await axiosCelulandia.get("/movimientos/estadisticas");
    return response.data;
  },

  getArqueoDiario: async ({ type, cajaNombre, moneda } = {}) => {
    const response = await axiosCelulandia.get("/movimientos/arqueo/diario", {
      params: { type, cajaNombre, moneda },
    });
    return response.data;
  },

  getArqueoTotalGeneral: async () => {
    const response = await axiosCelulandia.get("/movimientos/arqueo/total-general");
    return response.data;
  },
  getArqueoTotalGeneralFiltrado: async ({ fechaInicio, fechaFin, cajaNombre } = {}) => {
    const response = await axiosCelulandia.get("/movimientos/arqueo/total-general", {
      params: { fechaInicio, fechaFin, cajaNombre },
    });
    return response.data;
  },

  getTotalesAgrupados: async ({
    fechaInicio,
    fechaFin,
    categorias,
    cajasIds,
    type,
    moneda,
  } = {}) => {
    const params = {
      fechaInicio,
      fechaFin,
      categorias: Array.isArray(categorias) ? categorias.join(",") : categorias,
      cajasIds: Array.isArray(cajasIds) ? cajasIds.join(",") : cajasIds,
      type,
      moneda,
    };
    const response = await axiosCelulandia.get("/movimientos/totales-agrupados", { params });
    return response.data;
  },
};

export default movimientosService;
