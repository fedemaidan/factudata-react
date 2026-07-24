import api from './axiosConfig';

const profileService = {
  getProfiles: async () => {
    try {
      const response = await api.get('/profile');
      return response.data;
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  getProfileByPhone: async (phone) => {
    try {
      const response = await api.get(`/profile/phone/${encodeURIComponent(phone)}`);
      return response.data;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  getProfileByEmpresa: async (empresaId) => {
    try {
      const response = await api.get(`/profile/empresa/${encodeURIComponent(empresaId)}`);
      return response.data;
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  getProfileByCode: async (code) => {
    try {
      const response = await api.get(`/profile/code/${encodeURIComponent(code)}`);
      return response.data;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  createProfile: async (profile, empresa) => {
    try {
      const response = await api.post('/profile', { profile, empresa });
      return response.data;
    } catch (err) {
      console.error('Error al crear el perfil:', err);
      return null;
    }
  },
  

  updateProfile: async (profileId, profileData) => {
    try {
      const response = await api.put(`/profile/${encodeURIComponent(profileId)}`, profileData);
      return response.data;
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      return null;
    }
  },
  

  deleteProfile: async (id) => {
    try {
      await api.delete(`/profile/${encodeURIComponent(id)}`);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
  updateProfileWithEmpresa: async (profileId, empresaId, proyectosIds) => {
    try {
      const response = await api.put(`/profile/${encodeURIComponent(profileId)}/withEmpresa`, {
        empresaId,
        proyectosIds,
      });
      return response.data;
    } catch (err) {
      console.error('Error al actualizar el perfil:', err);
      return { updated: false };
    }
  },
  getProfileById: async (profileId) => {
    try {
      const response = await api.get(`/profile/${encodeURIComponent(profileId)}`);
      return response.data;
    } catch (err) {
      console.error('Error al obtener el perfil por ID:', err);
      return null;
    }
  },

  // Admin: setea directamente la contraseña de otro usuario.
  setUserPassword: async (profileId, password) => {
    const response = await api.post(`/profile/${encodeURIComponent(profileId)}/password`, { password });
    return response.data;
  },

  // Admin: genera un link para que el usuario resetee su contraseña.
  generatePasswordResetLink: async (profileId) => {
    const response = await api.post(`/profile/${encodeURIComponent(profileId)}/reset-link`);
    return response.data;
  },

  getProfileByUserId: async (userId) => {
    try {
      if (!userId) return null;
      const response = await api.get(`/profile/user/${encodeURIComponent(userId)}`);
      return response.data;
    } catch (err) {
      const status = err?.response?.status;
      // 404 = perfil genuinamente no existe; cualquier otro error es transitorio
      if (status === 404) return null;
      console.error('Error al obtener perfil por user_id:', err);
      throw err; // propaga para que el caller pueda reintentar
    }
  },

  // Acciones destructivas de gestión de sesión: re-lanzan el error para que la UI
  // muestre fallos reales (a diferencia de las lecturas que devuelven valor neutro).
  closeSessions: async (userIds) => {
    const response = await api.post('/profile/sessions/close', { userIds });
    return response.data;
  },

  updateSessionDuration: async (profileId, sessionMaxSeconds) => {
    const response = await api.put(
      `/profile/${encodeURIComponent(profileId)}/session-duration`,
      { session_max_seconds: sessionMaxSeconds }
    );
    return response.data;
  },

  updateIdleTimeout: async (profileId, sessionIdleSeconds) => {
    const response = await api.put(
      `/profile/${encodeURIComponent(profileId)}/idle-timeout`,
      { session_idle_seconds: sessionIdleSeconds }
    );
    return response.data;
  },
};

export default profileService;
