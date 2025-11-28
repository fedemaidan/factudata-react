// services/cajaChica/cajaChicaService.js
import api from '../axiosConfig';

const CajaChicaService = {
  crearTransferencia: async (data) => {
    console.log('📤 [Service] Enviando transferencia:', data);
    const res = await api.post('/caja-chica/transfers', data);
    console.log('📥 [Service] Respuesta completa:', res);
    console.log('📋 [Service] Respuesta data:', res.data);
    
    if (res.status === 200 || res.status === 201) {
      // El backend envuelve la respuesta en { ok: true, data: transferenciaCreada }
      return res.data; 
    }
    throw new Error('No se pudo crear la transferencia');
  },
};

export default CajaChicaService;