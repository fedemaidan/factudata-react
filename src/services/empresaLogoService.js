import api from './axiosConfig';

/** Biblioteca de logos a nivel empresa (reutilizables entre plantillas PDF). */
const empresaLogoService = {
  listar: async (empresaId) => {
    try {
      const res = await api.get('empresa-logos', { params: { empresa_id: empresaId } });
      return res.status === 200 ? res.data : [];
    } catch (e) {
      console.error('empresaLogoService.listar', e);
      return [];
    }
  },

  subir: async ({ empresaId, file, nombre }) => {
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('empresa_id', empresaId);
      if (nombre) formData.append('nombre', nombre);
      const res = await api.post('empresa-logos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.status === 201 ? res.data : null;
    } catch (e) {
      console.error('empresaLogoService.subir', e);
      return null;
    }
  },

  renombrar: async (id, nombre) => {
    try {
      const res = await api.put(`empresa-logos/${id}`, { nombre });
      return res.status === 200 ? res.data : null;
    } catch (e) {
      console.error('empresaLogoService.renombrar', e);
      return null;
    }
  },

  eliminar: async (id) => {
    try {
      const res = await api.delete(`empresa-logos/${id}`);
      return res.status === 200;
    } catch (e) {
      console.error('empresaLogoService.eliminar', e);
      return false;
    }
  },
};

export default empresaLogoService;
