// services/cajaChica/cajaChicaService.js
import api from '../axiosConfig';

const CajaChicaService = {
  crearTransferencia: async (data) => {
    const res = await api.post('/caja-chica/transfers', data);
    if (res.status === 200 || res.status === 201) {
      return res.data; 
    }
    throw new Error('No se pudo crear la transferencia');
  },

  getSaldosPorEmpresa: async (empresa_id) => {
    const res = await api.get('/movimientos/caja-chica/saldos', { params: { empresa_id } });
    return res.data?.saldos || [];
  },
};

export default CajaChicaService;