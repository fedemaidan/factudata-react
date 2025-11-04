// services/stock/stockMaterialesService.js
import api from '../axiosConfig';

const StockMaterialesService = {
  crearMaterial: async (data) => {
    const res = await api.post('/materiales', data);
    if (res.status === 200 || res.status === 201) return res.data;
    throw new Error('No se pudo crear el material');
  },

  listarMateriales: async (params) => {
    console.log("12")
    const res = await api.get('/materiales/stock', {params});
    if (res.status !== 200) throw new Error('Error al obtener materiales');
    return Array.isArray(res.data?.items) ? res.data.items : [];
  },

  obtenerMaterialPorId: async (id) => { // nose usa por ahora [ LA idea es que se derive a la vista unica del material ?]
    const res = await api.get(`/materiales/${id}`);
    if (res.status === 200) return res.data;
    throw new Error('Error al obtener material');
  },

  actualizarMaterial: async (id, data) => { 
    const res = await api.put(`/materiales/${id}`, data); // opcional
    if (res.status === 200) return res.data;
    throw new Error('Error al actualizar el material');
  },

  eliminarMaterial: async (id) => {
    const res = await api.delete(`/materiales/${id}`);
    if (res.status === 204) return;
    throw new Error('Error al eliminar material');
  },
};

export default StockMaterialesService;
