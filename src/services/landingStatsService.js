import api from './axiosConfig';

const landingStatsService = {
    /**
     * Devuelve métricas del funnel de la landing agrupadas por día.
     * @param {number} dias - Cantidad de días hacia atrás (default 30, max 365)
     * @returns {{ ok: boolean, rows: Array, totales: object, dias: number }}
     */
    getStats: async (dias = 30) => {
        const { data } = await api.get(`/agendar/stats?dias=${dias}`);
        return data;
    },
};

export default landingStatsService;
