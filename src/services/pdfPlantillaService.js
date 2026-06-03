import api from './axiosConfig';

/**
 * Plantillas PDF genéricas por document_type (control_presupuesto, …).
 * El agente generador (ai-chat) y el corrector con visión (ai-correct) viven en
 * el agente principal del backend.
 */
const pdfPlantillaService = {
  listar: async (empresaId, documentType) => {
    try {
      const res = await api.get('pdf-plantillas', {
        params: { empresa_id: empresaId, document_type: documentType },
      });
      return res.status === 200 ? res.data : [];
    } catch (e) {
      console.error('pdfPlantillaService.listar', e);
      return [];
    }
  },

  crear: async (body) => {
    try {
      const res = await api.post('pdf-plantillas', body);
      return res.status === 201 ? res.data : null;
    } catch (e) {
      console.error('pdfPlantillaService.crear', e);
      return null;
    }
  },

  actualizar: async (id, body) => {
    try {
      const res = await api.put(`pdf-plantillas/${id}`, body);
      return res.status === 200 ? res.data : null;
    } catch (e) {
      console.error('pdfPlantillaService.actualizar', e);
      return null;
    }
  },

  eliminar: async (id) => {
    try {
      const res = await api.delete(`pdf-plantillas/${id}`);
      return res.status === 200;
    } catch (e) {
      console.error('pdfPlantillaService.eliminar', e);
      return false;
    }
  },

  getComponentCode: async (id) => {
    try {
      const res = await api.get(`pdf-plantillas/${id}/component-code`);
      return res.status === 200 ? res.data?.code : null;
    } catch (e) {
      console.error('pdfPlantillaService.getComponentCode', e);
      return null;
    }
  },

  // Generador (pasada 1): { message, code }
  aiChat: async ({ messages, empresaId, documentType, currentCode, referenceImageDataUrl }) => {
    try {
      const res = await api.post('pdf-plantillas/ai-chat', {
        messages,
        empresaId,
        documentType,
        currentCode: currentCode || null,
        referenceImageDataUrl: referenceImageDataUrl || null,
      });
      return res.status === 200 ? res.data : null;
    } catch (e) {
      console.error('pdfPlantillaService.aiChat', e);
      return null;
    }
  },

  // Corrector con visión (pasada 2): { code }
  aiCorrect: async ({ code, empresaId, documentType, previewImageDataUrl }) => {
    try {
      const res = await api.post('pdf-plantillas/ai-correct', {
        code,
        empresaId,
        documentType,
        previewImageDataUrl,
      });
      return res.status === 200 ? res.data?.code || null : null;
    } catch (e) {
      console.error('pdfPlantillaService.aiCorrect', e);
      return null;
    }
  },

  saveComponent: async ({ code, empresaId, documentType }) => {
    try {
      const res = await api.post('pdf-plantillas/save-component', { code, empresaId, documentType });
      return res.status === 200 ? res.data?.url : null;
    } catch (e) {
      console.error('pdfPlantillaService.saveComponent', e);
      return null;
    }
  },

  savePreview: async ({ dataUrl, empresaId, documentType }) => {
    try {
      const res = await api.post('pdf-plantillas/save-preview', { dataUrl, empresaId, documentType });
      return res.status === 200 ? res.data?.url : null;
    } catch (e) {
      console.error('pdfPlantillaService.savePreview', e);
      return null;
    }
  },
};

export default pdfPlantillaService;
