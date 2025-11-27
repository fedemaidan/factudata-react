import axios from "axios";

export const backupService = {
  restoreDb: async (linkGoogleSheet) => {
    const response = await axios.post('/backup/restore-db', { linkGoogleSheet });
    return response.data;
  },
};

export default backupService;