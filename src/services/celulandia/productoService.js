import axiosCelulandia from "src/services/axiosCelulandia";

const productoService = {
  getAll: async ({
    limit = 200,
    offset = 0,
    sortField = "createdAt",
    sortDirection = "desc",
  } = {}) => {
    const response = await axiosCelulandia.get("/productos", {
      params: {
        limit,
        offset,
        sortField,
        sortOrder: sortDirection,
      },
    });
    return response.data;
  },
};

export default productoService;
