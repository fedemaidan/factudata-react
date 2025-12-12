import axiosCelulandia from "src/services/axiosCelulandia";

const contenedorService = {
  getAll: async ({
    limit = 200,
    offset = 0,
    sortField = "createdAt",
    sortDirection = "desc",
  } = {}) => {
    const response = await axiosCelulandia.get("/contenedores", {
      params: {
        limit,
        offset,
        sortField,
        sortOrder: sortDirection,
      },
    });
    return response.data;
  },

  updateEstado: async (contenedorId, estado) => {
    const response = await axiosCelulandia.patch(`/contenedores/${contenedorId}/estado`, { estado });
    return response.data;
  },
};

export default contenedorService;
