import api from './axiosConfig';

const LeadsService = {
  // GET /api/lead
  listar: async ({ field = 'created', on, from, to } = {}) => {
    const params = { field };
    if (on)  params.on  = on;  // 'YYYY-MM-DD' o 'DD-MM-YYYY'
    if (from) params.from = from;
    if (to)   params.to   = to;

    const res = await api.get('/lead', { params });
    return res.data;
  },

  // PUT /api/lead/:id
  actualizar: async (id, data) => {
    if (!id) throw new Error('El id es obligatorio');
    const res = await api.put(`/lead/${encodeURIComponent(id)}`, data);
    return res.data;
  },

  // DELETE /api/lead/:id (cuando lo habiliten)
  eliminar: async (id) => {
    if (!id) throw new Error('El id es obligatorio');
    const res = await api.delete(`/lead/${encodeURIComponent(id)}`);
    return res.data;
  },

  // POST /api/lead/match-manual - Match manual entre dos leads
  matchManual: async (leadCampanaId, leadTelefonoId) => {
    if (!leadCampanaId || !leadTelefonoId) {
      throw new Error('Se requieren ambos IDs de leads');
    }
    const res = await api.post('/lead/match-manual', { leadCampanaId, leadTelefonoId });
    return res.data;
  },

  // GET /api/lead/primer-mensaje/:phone - Obtener primer mensaje de conversación
  getPrimerMensaje: async (phone) => {
    if (!phone) throw new Error('El teléfono es obligatorio');
    const res = await api.get(`/lead/primer-mensaje/${encodeURIComponent(phone)}`);
    return res.data;
  },
};

export default LeadsService;