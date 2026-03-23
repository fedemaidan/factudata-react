import api from './axiosConfig';

const EventService = {
  /**
   * Lista eventos de Firestore por teléfono
   * GET /api/events?phone=XXXX&limit=N
   */
  listar: async (phone, limit = 100) => {
    const response = await api.get('/events', { params: { phone, limit } });
    return response.data;
  },
};

export default EventService;
