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

  getNotasByEmpresa: async (empresaId, userId = null) => {
    try {
      const params = userId ? `?userId=${userId}` : '';
      const response = await api.get(`nota-pedido/empresa/${empresaId}${params}`);
      if (response.status === 200) {
        console.log('Notas obtenidas con éxito');
        return response.data;
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
        return response.data?.nota || null;
      } else {
        console.error('Error al actualizar la nota');
        return null;
      }
    } catch (err) {
      console.error('Error al actualizar la nota:', err);
      return null;
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

  /** Plantillas PDF (Mongo + IA en backend) */
  getPdfTemplates: async (empresaId) => {
    try {
      const res = await api.get(`nota-pedido/pdf-templates/empresa/${empresaId}`);
      return res.status === 200 ? res.data : [];
    } catch (e) {
      console.error('getPdfTemplates', e);
      return [];
    }
  },

  createPdfTemplate: async (body) => {
    try {
      const res = await api.post('nota-pedido/pdf-templates', body);
      return res.status === 201 ? res.data : null;
    } catch (e) {
      console.error('createPdfTemplate', e);
      return null;
    }
  },

  updatePdfTemplate: async (id, body) => {
    try {
      const res = await api.put(`nota-pedido/pdf-templates/${id}`, body);
      return res.status === 200 ? res.data : null;
    } catch (e) {
      console.error('updatePdfTemplate', e);
      return null;
    }
  },

  deletePdfTemplate: async (id) => {
    try {
      const res = await api.delete(`nota-pedido/pdf-templates/${id}`);
      return res.status === 200;
    } catch (e) {
      console.error('deletePdfTemplate', e);
      return false;
    }
  },

  uploadPdfTemplateLogo: async (empresaId, file) => {
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('empresa_id', empresaId);
      const res = await api.post('nota-pedido/pdf-templates/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.status === 200 ? res.data?.url : null;
    } catch (e) {
      console.error('uploadPdfTemplateLogo', e);
      return null;
    }
  },

  getPdfBaseTemplate: async (empresaId) => {
    try {
      const res = await api.get(`nota-pedido/pdf-base/empresa/${empresaId}`);
      return res.status === 200 ? res.data : null;
    } catch (e) {
      console.error('getPdfBaseTemplate', e);
      return null;
    }
  },

  putPdfBaseLogo: async (empresaId, payload) => {
    try {
      const res = await api.put(`nota-pedido/pdf-base/empresa/${empresaId}/logo`, payload);
      return res.status === 200 ? res.data : null;
    } catch (e) {
      console.error('putPdfBaseLogo', e);
      return null;
    }
  },

  postPdfRenderConfig: async ({ notaId, empresaId, plantillaId }) => {
    try {
      const res = await api.post('nota-pedido/pdf-render-config', {
        notaId,
        empresaId,
        plantillaId: plantillaId || undefined,
      });
      if (res.status !== 200 || !res.data) {
        return { success: false, needsLogo: false, errorMessage: 'Respuesta inválida' };
      }
      return { success: true, config: res.data };
    } catch (e) {
      const data = e.response?.data;
      const msg = data?.error || e.message || 'Error al obtener configuración del PDF';
      const apiCode = data?.code;
      const needsLogo = apiCode === 'logo-base-required';
      return { success: false, needsLogo, errorMessage: msg, code: apiCode };
    }
  },

  getComponentCode: async (templateId) => {
    try {
      const res = await api.get(`nota-pedido/pdf-templates/${templateId}/component-code`);
      return res.status === 200 ? res.data?.code : null;
    } catch (e) {
      console.error('getComponentCode', e);
      return null;
    }
  },

  uploadReferenceImage: async ({ file, empresaId }) => {
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('empresa_id', empresaId);
      const res = await api.post('nota-pedido/pdf-templates/upload-reference', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.status === 200 ? res.data?.url : null;
    } catch (e) {
      console.error('uploadReferenceImage', e);
      return null;
    }
  },

  aiChatPlantilla: async ({ messages, empresaId, currentCode, referenceImageDataUrl }) => {
    try {
      const res = await api.post('nota-pedido/pdf-templates/ai-chat', {
        messages,
        empresaId,
        currentCode: currentCode || null,
        referenceImageDataUrl: referenceImageDataUrl || null,
      });
      return res.status === 200 ? res.data : null;
    } catch (e) {
      console.error('aiChatPlantilla', e);
      return null;
    }
  },

  saveComponentPlantilla: async ({ code, empresaId }) => {
    try {
      const res = await api.post('nota-pedido/pdf-templates/save-component', { code, empresaId });
      return res.status === 200 ? res.data?.url : null;
    } catch (e) {
      console.error('saveComponentPlantilla', e);
      return null;
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
