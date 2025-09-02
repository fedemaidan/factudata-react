import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, getDoc } from 'firebase/firestore';
import { auth, db } from 'src/config/firebase';
import { serverTimestamp } from 'firebase/firestore';
import { useAuth } from 'src/hooks/use-auth';

const generateConfirmationCode = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const profileService = {
  getProfiles: async () => {
    try {
      const profilesCollection = collection(db, 'profile');
      const querySnapshot = await getDocs(profilesCollection);

      const profiles = [];
      querySnapshot.forEach((doc) => {
        const profile = {
          id: doc.id,
          ...doc.data(),
        };
        profiles.push(profile);
      });
      return profiles;
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  getProfileByPhone: async (phone) => {
    try {
      const profilesCollection = collection(db, 'profile');
      const q = query(profilesCollection, where('phone', '==', phone));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const profileDoc = querySnapshot.docs[0];
      const profileData = profileDoc.data();

      return {
        id: profileDoc.id,
        ...profileData
      }
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  getProfileByEmpresa: async (empresaId) => {
    try {
      const empresaDocRef = doc(db, 'empresas', empresaId);
      const profilesCollection = collection(db, 'profile');
      const q = query(profilesCollection, where('empresa', '==', empresaDocRef));
      const querySnapshot = await getDocs(q);

      const profiles = [];
      querySnapshot.forEach((doc) => {
        const profile = {
          id: doc.id,
          ...doc.data(),
        };
        profiles.push(profile);
      });
      return profiles;
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  getProfileByCode: async (code) => {
    try {
      const profilesCollection = collection(db, 'profile');
      const q = query(profilesCollection, where('confirmationCode', '==', code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const profileDoc = querySnapshot.docs[0];
      const profileData = profileDoc.data();

      // Fetch empresa data
      const empresaDocRef = profileData.empresa;
      const empresaDoc = await getDoc(empresaDocRef);
      const empresaData = empresaDoc.data();

      return {
        id: profileDoc.id,
        ...profileData,
        empresaData: {
          id: empresaDoc.id,
          ...empresaData,
        }
      };
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  createProfile: async (profile, empresa) => {
    try {
      const confirmationCode = generateConfirmationCode();
      const empresaDocRef = doc(db, 'empresas', empresa.id);
  
      // Convertir IDs de proyectos a referencias
      const proyectosRefs = Array.isArray(profile.proyectos)
        ? profile.proyectos.map(id => doc(db, 'proyectos', id))
        : [];
  
      const userProfile = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        empresa: empresaDocRef,
        proyectos: proyectosRefs,
        created_at: serverTimestamp(),
        admin: profile.admin || false,
        permisosOcultos: profile.permisosOcultos || [],
        acciones: profile.acciones || [],
        confirmationCode,
        confirmed: false
      };
  
      const usersCollectionRef = collection(db, 'profile');
      const userRef = await addDoc(usersCollectionRef, userProfile);
  
      const newUserProfile = {
        ...userProfile,
        id: userRef.id
      };
  
      await updateDoc(userRef, { id: userRef.id });
      return newUserProfile;
    } catch (err) {
      console.error('Error al crear el perfil:', err);
      return null;
    }
  },
  

  updateProfile: async (profileId, profileData) => {
    try {
      const docRef = doc(db, 'profile', profileId);
      let data = { ...profileData };

      if (profileData.proyectos) {
        const proyectosRefs = Array.isArray(profileData.proyectos)
          ? profileData.proyectos.map(id => doc(db, 'proyectos', id))
          : [];
          data = {
            ...profileData,
            proyectos: proyectosRefs
          };
      }
  
      await updateDoc(docRef, data);
      return true;
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      return false;
    }
  },
  

  deleteProfile: async (id) => {
    try {
      const profileDoc = doc(db, 'profile', id);
      await deleteDoc(profileDoc);
    } catch (err) {
      console.error(err);
    }
  },
  updateProfileWithEmpresa: async (profileId, empresaId, proyectosIds) => {
    try {
      
      const profileDocRef = doc(db, 'profile', profileId);
      const empresaRef = doc(db, 'empresas', empresaId);
      const profileDoc = await getDoc(profileDocRef);

      if (!profileDoc.exists()) {
        console.error('No se encontró el perfil para actualizar');
        return false;
      }

      const profileData = profileDoc.data();
      const proyectos = proyectosIds.map( (id) => {
        return doc(db, 'proyectos', id);
      })
      await updateDoc(profileDocRef, { empresa: empresaRef, proyectos: proyectos });
      const newUser = {...profileData, empresa: empresaRef, proyectos: proyectos }
      
      console.log('Perfil actualizado con la nueva empresa y proyectos');
      return {updated: true, user: newUser};
    } catch (err) {
      console.error('Error al actualizar el perfil:', err);
      return {updated: false};;
    }
  },
  getProfileById: async (profileId) => {
    try {
      const profileDocRef = doc(db, 'profile', profileId);
      const profileDoc = await getDoc(profileDocRef);
  
      if (!profileDoc.exists()) {
        return null;
      }
  
      const profileData = profileDoc.data();
  
      // Traer los datos de la empresa (si existe)
      let empresaData = null;
      if (profileData.empresa) {
        const empresaDoc = await getDoc(profileData.empresa);
        if (empresaDoc.exists()) {
          empresaData = {
            id: empresaDoc.id,
            ...empresaDoc.data(),
          };
        }
      }
  
      return {
        id: profileDoc.id,
        ...profileData,
        empresaData
      };
    } catch (err) {
      console.error('Error al obtener el perfil por ID:', err);
      return null;
    }
  }  
};

export default profileService;
