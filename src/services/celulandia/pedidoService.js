import axiosCelulandia from "src/services/axiosCelulandia";

const pedidoService = {
  getAll: async ({
    limit = 200,
    offset = 0,
    sortField = "createdAt",
    sortDirection = "desc",
  } = {}) => {
    const response = await axiosCelulandia.get("/pedidos", {
      params: {
        limit,
        offset,
        sortField,
        sortOrder: sortDirection,
      },
    });
    return response.data;
  },

  create: async (payload) => {
    const response = await axiosCelulandia.post("/pedidos", payload);
    return response.data;
  },

  getResumen: async ({
    limit = 200,
    offset = 0,
    sortField = "createdAt",
    sortDirection = "desc",
  } = {}) => {
    const response = await axiosCelulandia.get("/pedidos/resumen", {
      params: {
        limit,
        offset,
        sortField,
        sortOrder: sortDirection,
      },
    });
    return response.data;
  },

  getLotesPendientes: async () => {
    const response = await axiosCelulandia.get("/lotes/pendientes");
    return response.data;
  },

  asociarContenedor: async (pedidoId, contenedorId) => {
    const response = await axiosCelulandia.post(
      `/pedidos/${pedidoId}/asociar-contenedor`,
      { contenedorId }
    );
    return response.data;
  },

  updateEstado: async (pedidoId, estado) => {
    const response = await axiosCelulandia.patch(`/pedidos/${pedidoId}/estado`, { estado });
    return response.data;
  },

  updateLotes: async (pedidoId, payload) => {
    const response = await axiosCelulandia.patch(`/pedidos/${pedidoId}/lotes`, payload);
    return response.data;
  },
};

export default pedidoService;
