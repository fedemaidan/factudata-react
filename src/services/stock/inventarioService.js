import api from '../axiosConfig';

const InventarioService = {
  getProductos: async (empresa_id) => {
    if (!empresa_id) throw new Error('empresa_id es requerido');
    const res = await api.get('/inventario/productos', { params: { empresa_id } });
    return res.data;
  },

  createProducto: async (data) => {
    const res = await api.post('/inventario/productos', data);
    return res.data;
  },

  updateProducto: async (id, data) => {
    const res = await api.put(`/inventario/productos/${id}`, data);
    return res.data;
  },

  deleteProducto: async (id) => {
    const res = await api.delete(`/inventario/productos/${id}`);
    return res.data;
  },

  getMovimientos: async (params) => {
    const res = await api.get('/inventario/movimientos', { params });
    return res.data;
  },

  createMovimiento: async (data) => {
    const res = await api.post('/inventario/movimientos', data);
    return res.data;
  },
  
  getStock: async (empresa_id) => {
      const res = await api.get('/inventario/stock', { params: { empresa_id } });
      return res.data;
  }
};

export default InventarioService;
