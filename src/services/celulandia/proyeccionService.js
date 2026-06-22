import axiosCelulandia from "src/services/axiosCelulandia";

const proyeccionService = {
  createProyeccion: async ({
    fechaInicio,
    fechaFin,
    archivoVentas,
    archivoStockQuiebre,
  }) => {
    const formData = new FormData();
    if (fechaInicio) formData.append("fechaInicio", fechaInicio);
    if (fechaFin) formData.append("fechaFin", fechaFin);
    if (archivoVentas) formData.append("ventas", archivoVentas);
    if (archivoStockQuiebre) formData.append("quiebre", archivoStockQuiebre);

    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]); // Mostrará cada campo y su valor
    }

    console.log(formData);

    const response = await axiosCelulandia.post("/proyeccion", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  getProyeccionStatus: async ({ id }) => {
    if (!id) {
      throw new Error("Se requiere un id de proyección");
    }
    const response = await axiosCelulandia.get(`/proyeccion/${id}/status`);
    return response.data;
  },

  getProyeccionesMetadata: async ({ ids } = {}) => {
    const safeIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
    const response = await axiosCelulandia.post("/proyeccion/metadata", { ids: safeIds });
    return response.data;
  },

  // Serie mensual + tendencia de un producto (para el gráfico de evolución).
  getHistoricoProducto: async (codigo) => {
    const response = await axiosCelulandia.get(
      `/proyeccion/producto/${encodeURIComponent(codigo)}/historico`
    );
    return response.data; // { success, data: { codigo, serie, tendencia } }
  },

  getTags: async () => {
    const response = await axiosCelulandia.get("/tags");
    return response?.data?.data || [];
  },

  actualizarTag: async ({ id, nombre }) => {
    const response = await axiosCelulandia.put("/tags", {
      id,
      nombre,
    });
    return response?.data;
  },

  eliminarTag: async ({ id }) => {
    const response = await axiosCelulandia.delete("/tags", {
      data: { id },
    });
    return response?.data;
  },
};
export default proyeccionService;
