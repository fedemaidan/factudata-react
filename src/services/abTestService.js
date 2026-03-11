import api from './axiosConfig';

const abTestService = {
    /**
     * Lista todos los A/B tests.
     */
    listarTests: async () => {
        const { data } = await api.get('/ab-tests');
        return data;
    },

    /**
     * Obtiene datos de un test específico con métricas.
     * @param {string} name - Nombre del test
     */
    getTest: async (name) => {
        const { data } = await api.get(`/ab-tests/${encodeURIComponent(name)}`);
        return data;
    },

    /**
     * Obtiene contactos agrupados por variante.
     * @param {string} name - Nombre del test
     */
    getContactos: async (name) => {
        const { data } = await api.get(`/ab-tests/${encodeURIComponent(name)}/contactos`);
        return data;
    },

    /**
     * Crea un nuevo A/B test (seed).
     * @param {{ nombre: string, descripcion?: string }} payload
     */
    crearTest: async (payload) => {
        const { data } = await api.post('/ab-tests', payload);
        return data;
    },

    /**
     * Cambia el estado de un test.
     * @param {string} name - Nombre del test
     * @param {'activo'|'pausado'|'finalizado'} estado
     */
    cambiarEstado: async (name, estado) => {
        const { data } = await api.patch(`/ab-tests/${encodeURIComponent(name)}/estado`, { estado });
        return data;
    },
};

export default abTestService;
