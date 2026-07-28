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
     * Resultados comerciales (reunión exitosa + ganados) de la cohorte del
     * landing: total, por rubro y por campaña, más `lastRunAt` (frescura del
     * dato). Se leen del mirror local de Notion (Registro de Reuniones), que se
     * refresca con `syncNotion()`. Requiere un rango exacto desde/hasta.
     */
    getLandingOutcomes: async ({ desde, hasta, segmento } = {}) => {
        const params = new URLSearchParams();
        params.set('desde', desde);
        params.set('hasta', hasta);
        if (segmento) params.set('segmento', segmento);
        const { data } = await api.get(`/funnel/landing-outcomes?${params.toString()}`);
        return data;
    },

    /**
     * Dispara la sincronización manual del embudo landing con Notion (el botón
     * "Sincronizar con Notion"). Devuelve { lastRunAt, resumen }. Con
     * `{ dryRun: true }` reporta qué pasaría sin escribir ni disparar Purchases.
     * Un 409 significa que ya hay un sync en curso.
     */
    syncNotion: async ({ dryRun = false } = {}) => {
        const { data } = await api.post('/funnel/sync-notion', { dryRun });
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
