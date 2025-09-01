import axiosCelulandia from "src/services/axiosCelulandia";

const clientesService = {
  getAllClientes: async () => {
    const response = await axiosCelulandia.get("/clientes");
    return response.data;
  },

  getClienteById: async (id) => {
    const response = await axiosCelulandia.get(`/clientes/${id}`);
    return response.data;
  },

  getClienteCCById: async (id, options = {}) => {
    const response = await axiosCelulandia.get(`/clientes/${id}/cuenta-corriente`, {
      params: options,
    });
    return response.data;
  },

  getClienteLogs: async (id) => {
    const response = await axiosCelulandia.get(`/clientes/${id}/logs`);
    return response.data;
  },

  createCliente: async (clienteData) => {
    const response = await axiosCelulandia.post("/clientes", clienteData);
    return response.data;
  },

  updateCliente: async (id, clienteData) => {
    const response = await axiosCelulandia.put(`/clientes/${id}`, clienteData);
    return response.data;
  },

  deleteCliente: async (id) => {
    const response = await axiosCelulandia.delete(`/clientes/${id}`);
    return response.data;
  },

  getClienteByNombre: async (nombre) => {
    const response = await axiosCelulandia.get(`/clientes/nombre/${nombre}`);
    return response.data;
  },

  getClientesByCuentaActiva: async (cuenta) => {
    const response = await axiosCelulandia.get(`/clientes/cuenta/${cuenta}`);
    return response.data;
  },

  updateCuentasActivas: async (id, cuentasActivas, usuario) => {
    const response = await axiosCelulandia.patch(`/clientes/${id}/cuentas`, {
      ccActivas: cuentasActivas,
      usuario: usuario,
    });
    return response.data;
  },
};

export default clientesService;
