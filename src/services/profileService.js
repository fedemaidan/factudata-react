import { collection, getDocs } from 'firebase/firestore';
import { db } from 'src/config/firebase';

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
};

export default profileService;
