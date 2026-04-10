import api from 'src/services/axiosConfig';

const profileService = {
  getProfiles: async () => {
    try {
      const { data } = await api.get('/profile');
      return data || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  getProfileByPhone: async (phone) => {
    try {
      const { data } = await api.get(`/profile/phone/${phone}`);
      return data || null;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  getProfileByEmpresa: async (empresaId) => {
    try {
      const { data } = await api.get(`/profile/empresa/${empresaId}`);
      return data || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  getProfileByCode: async (code) => {
    try {
      const { data } = await api.get(`/profile/code/${code}`);
      return data || null;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  createProfile: async (profile, empresa) => {
    try {
      const { data } = await api.post('/profile', { profile, empresa });
      return data || null;
    } catch (err) {
      console.error('Error al crear el perfil:', err);
      return null;
    }
  },

  updateProfile: async (profileId, profileData) => {
    try {
      let data = { ...profileData };
      // Sanitizar phone: eliminar caracteres no-digitos (previene U+202C y similares)
      if (data.phone) {
        data.phone = String(data.phone).replace(/[^\d]/g, '');
      }
      await api.put(`/profile/${profileId}`, data);
      return true;
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      return false;
    }
  },

  deleteProfile: async (id) => {
    try {
      await api.delete(`/profile/${id}`);
    } catch (err) {
      console.error(err);
    }
  },

  updateProfileWithEmpresa: async (profileId, empresaId, proyectosIds) => {
    try {
      const { data } = await api.put(`/profile/${profileId}/withEmpresa`, { empresaId, proyectosIds });
      return data || { updated: false };
    } catch (err) {
      console.error('Error al actualizar el perfil:', err);
      return { updated: false };
    }
  },

  getProfileById: async (profileId) => {
    try {
      const { data } = await api.get(`/profile/${profileId}`);
      return data || null;
    } catch (err) {
      console.error('Error al obtener el perfil por ID:', err);
      return null;
    }
  },

  getProfileByUserId: async (userId) => {
    try {
      if (!userId) return null;
      const { data } = await api.get(`/profile/user/${userId}`);
      return data || null;
    } catch (err) {
      console.error('Error al obtener perfil por user_id:', err);
      return null;
    }
  },
};

export default profileService;
