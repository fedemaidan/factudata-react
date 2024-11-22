import api from './axiosConfig';

const productService = {
  // Obtener un producto por su ID
  getProductById: async (productId) => {
    try {
      const response = await api.get(`/producto/${productId}`);
      return response.data;
    } catch (err) {
      console.error('Error al obtener el producto:', err);
      return null;
    }
  },

  // Obtener todos los productos
  getAllProducts: async () => {
    try {
      const response = await api.get('/producto');
      return response.data;
    } catch (err) {
      console.error('Error al obtener los productos:', err);
      return [];
    }
  },

  // Crear un nuevo producto
  createProduct: async (productData) => {
    try {
      const response = await api.post('/producto', productData);
      return response.data;
    } catch (err) {
      console.error('Error al crear el producto:', err);
      return null;
    }
  },

  // Actualizar un producto
  updateProduct: async (productId, productData) => {
    try {
      const response = await api.put(`/producto/${productId}`, productData);
      return response.data;
    } catch (err) {
      console.error('Error al actualizar el producto:', err);
      return null;
    }
  },

  // Eliminar un producto
  deleteProductById: async (productId) => {
    try {
      const response = await api.delete(`/producto/${productId}`);
      return response.data;
    } catch (err) {
      console.error('Error al eliminar el producto:', err);
      return null;
    }
  },
};

export default productService;
