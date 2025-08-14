import axiosCelulandia from "src/services/axiosCelulandia";

const cuentasPendientesService = {
  getAll: async () => {
    const response = await axiosCelulandia.get("/cuentas-pendientes");
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
};

export default cuentasPendientesService;
