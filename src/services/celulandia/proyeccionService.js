import axiosCelulandia from 'src/services/axiosCelulandia';

const proyeccionService = {
  getAllProyecciones: async ({
    limit = 20,
    offset = 0,
    sortField = 'fechaCreacion',
    sortDirection = 'desc',
  } = {}) => {
    const response = await axiosCelulandia.get('/proyeccion', {
      params: { limit, offset, sortField, sortDirection },
    });
    return response.data;
  },

  getProyeccionById: async (
    id,
    { limit = 20, offset = 0, sortField = 'codigo', sortDirection = 'asc', tag = '' } = {}
  ) => {
    const response = await axiosCelulandia.get(`/proyeccion/${id}`, {
      params: { limit, offset, sortField, sortDirection, tag },
    });
    return response.data;
  },

  createProyeccion: async ({ fechaInicio, fechaFin, archivoVentas, archivoStock }) => {
    const formData = new FormData();
    if (fechaInicio) formData.append('fechaInicio', fechaInicio);
    if (fechaFin) formData.append('fechaFin', fechaFin);
    if (archivoVentas) formData.append('ventas', archivoVentas);
    if (archivoStock) formData.append('stock', archivoStock);

    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]); // Mostrará cada campo y su valor
    }

    console.log(formData);

    const response = await axiosCelulandia.post('/proyeccion', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  ignorarArticulos: async ({ codigos }) => {
    const response = await axiosCelulandia.post('/proyeccion/ignorar', { codigos });
    return response?.data;
  },

  eliminarArticuloIgnorado: async ({ id }) => {
    console.log('id', id);
    const response = await axiosCelulandia.delete('/proyeccion/ignorar', { data: { id } });
    return response.data;
  },

  eliminarProductosYAgregarIgnorar: async ({ ids, codigos }) => {
    // 1) Agregar a ignorados (por códigos)
    if (Array.isArray(codigos) && codigos.length > 0) {
      await axiosCelulandia.post('/proyeccion/ignorar', { codigos });
    }

    // 2) Eliminar productos de proyección (por ids) — se llama por cada id
    if (Array.isArray(ids) && ids.length > 0) {
      await Promise.all(
        ids.map((id) => axiosCelulandia.delete('/proyeccion/producto', { data: { id } }))
      );
    }

    return { success: true };
  },

  getProductosIgnorados: async () => {
    const response = await axiosCelulandia.get('/proyeccion/ignorar');
    const payload = response?.data;
    return Array.isArray(payload?.data) ? payload.data : [];
  },

  getTags: async () => {
    const response = await axiosCelulandia.get('/tags');
    return response?.data?.data || [];
  },

  agregarTagsAProductos: async ({ productosProyeccionId, tag, persist = false }) => {
    const response = await axiosCelulandia.post('proyeccion/tags', {
      productosProyeccionId,
      tag,
      persist,
    });
    return response?.data;
  },

  eliminarTagsAProductos: async ({ productosProyeccionId }) => {
    const response = await axiosCelulandia.delete('proyeccion/tags', {
      data: { productosProyeccionId },
    });
    return response?.data;
  },

  actualizarTag: async ({ id, nombre }) => {
    const response = await axiosCelulandia.put('/tags', {
      id,
      nombre,
    });
    return response?.data;
  },

  eliminarTag: async ({ id }) => {
    const response = await axiosCelulandia.delete('/tags', {
      data: { id },
    });
    return response?.data;
  },
};
export default proyeccionService;
