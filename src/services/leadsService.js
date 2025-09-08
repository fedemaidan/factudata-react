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
};

export default LeadsService;