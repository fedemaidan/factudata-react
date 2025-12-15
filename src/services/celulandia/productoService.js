import axiosCelulandia from "src/services/axiosCelulandia";

const productoService = {
  getAll: async ({
    all,
    page,
    pageSize,
    limit = 200,
    offset = 0,
    sortField = "createdAt",
    sortDirection = "desc",
    text,
  } = {}) => {
    const isAll = Boolean(all);
    const shouldUsePage = page !== undefined || pageSize !== undefined;
    const normalizedPage = typeof page === "number" ? page : parseInt(page, 10);
    const safePage = Number.isFinite(normalizedPage) && normalizedPage >= 1 ? normalizedPage : 1;
    const normalizedPageSize =
      typeof pageSize === "number" ? pageSize : parseInt(pageSize, 10);
    const safePageSize =
      Number.isFinite(normalizedPageSize) && normalizedPageSize >= 1
        ? normalizedPageSize
        : limit;
    const safeText = typeof text === "string" ? text.trim() : "";

    const response = await axiosCelulandia.get("/productos", {
      params: {
        ...(isAll
          ? { all: true }
          : shouldUsePage
          ? { page: safePage, pageSize: safePageSize }
          : { limit, offset }),
        sortField,
        sortOrder: sortDirection,
        ...(safeText ? { text: safeText } : {}),
      },
    });
    return response.data;
  },

  getTags: async () => {
    const response = await axiosCelulandia.get("/productos/tags");
    return response.data;
  },

  actualizarTag: async ({ id, nombre }) => {
    const response = await axiosCelulandia.put(`/productos/tags/${id}`, { nombre });
    return response.data;
  },

  eliminarTag: async ({ id }) => {
    const response = await axiosCelulandia.delete(`/productos/tags/${id}`);
    return response.data;
  },

  eliminarTagsDeProductos: async ({ productoIds }) => {
    const response = await axiosCelulandia.post("/productos/eliminar-tags", { productoIds });
    return response.data;
  },

  getProductosIgnorados: async () => {
    const response = await axiosCelulandia.get("/productos-ignorar");
    return response.data;
  },

  ignorarProductos: async ({ codigos }) => {
    const response = await axiosCelulandia.post("/productos-ignorar", { codigos });
    return response.data;
  },

  eliminarProductoIgnorado: async ({ id }) => {
    const response = await axiosCelulandia.delete(`/productos-ignorar/${id}`);
    return response.data;
  },

  agregarTagAProductos: async ({ productoIds, tagNombre }) => {
    const response = await axiosCelulandia.post("/productos/tags/asignar", { productoIds, tagNombre });
    return response.data;
  },
};

export default productoService;
