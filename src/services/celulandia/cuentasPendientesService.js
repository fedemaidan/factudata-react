import axiosCelulandia from "src/services/axiosCelulandia";

const cuentasPendientesService = {
  getAll: async ({
    populate,
    limit = 20,
    offset = 0,
    sortField,
    sortDirection,
    fechaInicio,
    fechaFin,
    includeInactive = false,
    moneda,
    cc,
    usuario,
    cliente,
    text,
    montoDesde,
    montoHasta,
    montoTipo,
  } = {}) => {
    const response = await axiosCelulandia.get("/cuentas-pendientes", {
      params: {
        populate,
        limit,
        offset,
        sortField,
        sortDirection,
        fechaInicio,
        fechaFin,
        includeInactive,
        moneda,
        cc,
        usuario,
        nombreCliente: cliente,
        text,
        montoDesde,
        montoHasta,
        montoTipo,
      },
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await axiosCelulandia.get(`/cuentas-pendientes/${id}`);
    return response.data;
  },

  create: async (cuenta) => {
    const response = await axiosCelulandia.post("/cuentas-pendientes", cuenta);
    return response.data;
  },

  update: async (id, cuenta, usuario) => {
    const response = await axiosCelulandia.put(`/cuentas-pendientes/${id}`, {
      ...cuenta,
      usuario,
    });
    return response.data;
  },

  getLogs: async (id) => {
    const response = await axiosCelulandia.get(`/cuentas-pendientes/${id}/logs`);
    return response.data;
  },

  remove: async (id) => {
    const response = await axiosCelulandia.delete(`/cuentas-pendientes/${id}`);
    return response.data;
  },

  deleteCuentaPendiente: async (id, usuario) => {
    const response = await axiosCelulandia.put(`/cuentas-pendientes/${id}/delete`, {
      usuario,
    });
    return response.data;
  },

  getByClienteId: async (clienteId, populate) => {
    const response = await axiosCelulandia.get(`/cuentas-pendientes/cliente/${clienteId}`, {
      params: {
        populate,
      },
    });
    return response.data;
  },

  getByClienteIdWithPagination: async ({
    clienteId,
    limit = 20,
    offset = 0,
    sortField,
    sortDirection,
    fechaInicio,
    fechaFin,
    includeInactive = false,
  }) => {
    const response = await axiosCelulandia.get(`/cuentas-pendientes/cliente/${clienteId}`, {
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
};

export default cuentasPendientesService;
