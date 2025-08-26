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
    estado,
    fecha,
    fechaInicio,
    fechaFin,
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
        estado,
        fecha,
        fechaInicio,
        fechaFin,
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

  getClientesTotales: async () => {
    const response = await axiosCelulandia.get("/movimientos/clientes-totales");
    return response.data;
  },

  createMovimiento: async (movimientoData) => {
    const response = await axiosCelulandia.post("/movimientos", movimientoData);
    return response.data;
  },

  updateMovimiento: async (id, movimientoData, nombreUsuario) => {
    const response = await axiosCelulandia.put(`/movimientos/${id}`, {
      ...movimientoData,
      nombreUsuario,
    });
    return response.data;
  },

  deleteMovimiento: async (id) => {
    const response = await axiosCelulandia.delete(`/movimientos/${id}`);
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
};

export default movimientosService;
