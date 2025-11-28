import axiosCelulandia from "src/services/axiosCelulandia";

export const backupService = {
  restoreDb: async (linkGoogleSheet) => {
    const response = await axiosCelulandia.post('/backup/restore-db', { linkGoogleSheet });
    return response.data;
  },
  syncAltSheet: async () => {
    const response = await axiosCelulandia.post('/backup/sync-alt-sheet');
    return response.data;
  },
  confirmAltSheet: async ({ movimientoIds = [], cuentaPendienteIds = [] }) => {
    const response = await axiosCelulandia.post('/backup/confirm-alt-sheet', {
      movimientoIds,
      cuentaPendienteIds,
    });
    return response.data;
  },
};

export default backupService;