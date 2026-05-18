import api from './axiosConfig';

export async function getSheetConfigsByEmpresa(empresa_id) {
  try {
    const response = await api.get('/sheet-config', { params: { empresa_id } });
    return response.data || [];
  } catch (error) {
    console.error('[sheetConfigService] getSheetConfigsByEmpresa:', error);
    return [];
  }
}

export async function createSheetConfig(data) {
  try {
    const response = await api.post('/sheet-config', data);
    return { data: response.data, error: null, code: null };
  } catch (error) {
    console.error('[sheetConfigService] createSheetConfig:', error);
    const serverMsg = error?.response?.data?.error;
    const code = error?.response?.data?.code || null;
    return { data: null, error: serverMsg || error.message, code };
  }
}

export async function updateSheetConfig(id, data) {
  try {
    const response = await api.put(`/sheet-config/${id}`, data);
    return { data: response.data, error: null, code: null };
  } catch (error) {
    console.error('[sheetConfigService] updateSheetConfig:', error);
    const serverMsg = error?.response?.data?.error;
    const code = error?.response?.data?.code || null;
    return { data: null, error: serverMsg || error.message, code };
  }
}

export async function deleteSheetConfig(id) {
  try {
    await api.delete(`/sheet-config/${id}`);
    return { error: null };
  } catch (error) {
    console.error('[sheetConfigService] deleteSheetConfig:', error);
    return { error: error.message };
  }
}

export async function syncSheetConfig(id) {
  try {
    const response = await api.post(`/sheet-config/${id}/sync`);
    return { data: response.data, error: null, code: null };
  } catch (error) {
    console.error('[sheetConfigService] syncSheetConfig:', error);
    const serverMsg = error?.response?.data?.error;
    const code = error?.response?.data?.code || null;
    return { data: null, error: serverMsg || error.message, code };
  }
}
