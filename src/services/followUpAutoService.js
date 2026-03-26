import api from './axiosConfig';

const FollowUpAutoService = {
    // ── Configs CRUD ──
    listarConfigs: async () => {
        const res = await api.get('/followup-auto-config');
        return res.data;
    },
    crearConfig: async (data) => {
        const res = await api.post('/followup-auto-config', data);
        return res.data;
    },
    actualizarConfig: async (id, data) => {
        const res = await api.put(`/followup-auto-config/${id}`, data);
        return res.data;
    },
    eliminarConfig: async (id) => {
        const res = await api.delete(`/followup-auto-config/${id}`);
        return res.data;
    },

    // ── Per-contact control ──
    actualizarFollowUpAuto: async (contactoId, data) => {
        const res = await api.patch(`/sdr/contactos/${contactoId}/followup-auto`, data);
        return res.data;
    },

    // ── Bulk ──
    actualizarFollowUpAutoMasivo: async (contactoIds, activo) => {
        const res = await api.post('/sdr/contactos/bulk-followup-auto', { contactoIds, activo });
        return res.data;
    },
};

export default FollowUpAutoService;
