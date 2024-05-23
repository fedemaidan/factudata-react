import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, getDoc } from 'firebase/firestore';
import { auth, db } from 'src/config/firebase';
import { serverTimestamp } from 'firebase/firestore';

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

      // Crear perfil en Firestore
      const userProfile = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        empresa: empresaDocRef,
        created_at: serverTimestamp(),
        admin: profile.admin || false,
        proyectos: [],
        confirmationCode,
        confirmed: false
      };

      const usersCollectionRef = collection(db, 'profile');
      const userRef = await addDoc(usersCollectionRef, userProfile);

      const newUserProfile = {
        ...userProfile,
        id: userRef.id
      };

      // Actualizar el documento con el ID
      await updateDoc(userRef, { id: userRef.id });

      return newUserProfile;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  updateProfile: async (id, profile) => {
    try {
      const profileDoc = doc(db, 'profile', id);
      await updateDoc(profileDoc, profile);
    } catch (err) {
      console.error(err);
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
};

export default profileService;
