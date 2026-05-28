import api from './axiosConfig';

const landingStatsService = {
    /**
     * Devuelve métricas del funnel de la landing agrupadas por día.
     * Acepta `dias` (últimos N días) o un rango exacto `desde`/`hasta` (YYYY-MM-DD).
     */
    getStats: async ({ dias, desde, hasta } = {}) => {
        const params = new URLSearchParams();
        if (desde && hasta) {
            params.set('desde', desde);
            params.set('hasta', hasta);
        } else {
            params.set('dias', String(dias ?? 30));
        }
        const { data } = await api.get(`/agendar/stats?${params.toString()}`);
        return data;
    },

    /**
     * Devuelve A vs B con tasas + lift relativo del test form-first.
     * El backend ya calcula los porcentajes — no hace falta repetirlo en cliente.
     */
    getStatsAB: async ({ dias, desde, hasta } = {}) => {
        const params = new URLSearchParams();
        if (desde && hasta) {
            params.set('desde', desde);
            params.set('hasta', hasta);
        } else {
            params.set('dias', String(dias ?? 30));
        }
        const { data } = await api.get(`/agendar/stats/ab?${params.toString()}`);
        return data;
    },
};

export default landingStatsService;
