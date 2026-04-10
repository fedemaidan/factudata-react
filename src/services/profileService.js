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

  getProfileByUserId: async (userId) => {
    try {
      if (!userId) return null;
      const response = await api.get(`/profile/user/${encodeURIComponent(userId)}`);
      return response.data;
    } catch (err) {
      console.error('Error al obtener perfil por user_id:', err);
      return null;
    }
  },
};

export default profileService;
