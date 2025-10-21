// src/services/versionService.js
import { doc, getDoc } from 'firebase/firestore';
import { db } from 'src/lib/firebase'; // tu inicialización de Firebase

export async function getRemoteVersionFromFirestore() {
  const snap = await getDoc(doc(db, 'meta', 'app'));
  const data = snap.data() || {};
  return data.version || null;
}
