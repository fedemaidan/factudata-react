import api from './axiosConfig';

const notaPedidoService = {
  createNota: async (notaData) => {
    try {
      const response = await api.post('nota-pedido', notaData);
      if (response.status === 201) {
        console.log('Nota creada con éxito');
        return response.data.nota; // Devuelve la nota creada
      } else {
        console.error('Error al crear la nota');
        return null;
      }
    } catch (err) {
      console.error('Error al crear la nota:', err);
      return null;
    }
  },

  getNotasByEmpresa: async (empresaId) => {
    try {
      const response = await api.get(`nota-pedido/empresa/${empresaId}`);
      if (response.status === 200) {
        console.log('Notas obtenidas con éxito');
        console.log("responseeeeee", response.data)
        return response.data; // Devuelve las notas
      } else {
        console.error('Error al obtener las notas');
        return [];
      }
    } catch (err) {
      console.error('Error al obtener las notas:', err);
      return [];
    }
  },

  updateNota: async (notaId, nuevosDatos) => {
    try {
      const response = await api.put(`nota-pedido/${notaId}`, nuevosDatos);
      if (response.status === 200) {
        console.log('Nota actualizada con éxito');
        return true;
      } else {
        console.error('Error al actualizar la nota');
        return false;
      }
    } catch (err) {
      console.error('Error al actualizar la nota:', err);
      return false;
    }
  },

  deleteNota: async (notaId) => {
    try {
      const response = await api.delete(`nota-pedido/${notaId}`);
      if (response.status === 200) {
        console.log('Nota eliminada con éxito');
        return true;
      } else {
        console.error('Error al eliminar la nota');
        return false;
      }
    } catch (err) {
      console.error('Error al eliminar la nota:', err);
      return false;
    }
  },

  subirArchivo: async (notaId, archivo) => {
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
  
      const response = await api.post(`nota-pedido/${notaId}/archivo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    
      if (response.status === 200) {
        console.log('Archivo subido con éxito');
        return response.data.nota; // Devuelve el objeto { url, nombre, fecha }
      } else {
        console.error('Error al subir el archivo');
        return null;
      }
    } catch (err) {
      console.error('Error al subir el archivo:', err);
      return null;
    }
  },
  
};

export default notaPedidoService;
