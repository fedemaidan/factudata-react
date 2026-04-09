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

    /**
     * Actualiza los pesos (%) de distribución de variantes.
     * @param {string} name - Nombre del test
     * @param {{ A: number, B: number }} pesos - Pesos que suman 100
     */
    actualizarPesos: async (name, pesos) => {
        const { data } = await api.patch(`/ab-tests/${encodeURIComponent(name)}/pesos`, { pesos });
        return data;
    },
    /**
     * Obtiene comparación pre-test vs Variante A vs Variante B.
     * @param {string} name - Nombre del test
     */
    getPretest: async (name) => {
        const { data } = await api.get(`/ab-tests/${encodeURIComponent(name)}/pretest`);
        return data;
    },

    /**
     * Marca o desmarca un contacto como ignorado en el test.
     * @param {string} name - Nombre del test
     * @param {string} contactoId - ID del ContactoSDR
     * @param {boolean} ignorar
     */
    toggleIgnorar: async (name, contactoId, ignorar) => {
        const { data } = await api.patch(
            `/ab-tests/${encodeURIComponent(name)}/contactos/${encodeURIComponent(contactoId)}/ignorar`,
            { ignorar }
        );
        return data;
    },

    /**
     * Crea un punto de inflexión (snapshot de métricas actuales).
     * @param {string} name - Nombre del test
     * @param {string} descripcion
     */
    addInflexion: async (name, descripcion) => {
        const { data } = await api.post(`/ab-tests/${encodeURIComponent(name)}/inflexion`, { descripcion });
        return data;
    },

    /**
     * Elimina un punto de inflexión.
     * @param {string} name - Nombre del test
     * @param {string} inflexionId
     */
    removeInflexion: async (name, inflexionId) => {
        const { data } = await api.delete(`/ab-tests/${encodeURIComponent(name)}/inflexion/${encodeURIComponent(inflexionId)}`);
        return data;
    },
};

export default abTestService;
