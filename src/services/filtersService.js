// src/services/filtersService.js
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from 'src/config/firebase';

// id de documento: {userId}__{empresaId}__{proyectoId}
const docId = (empresaId, proyectoId, userId) =>
  `${userId || 'anon'}__${empresaId || 'empresa'}__${proyectoId || 'all'}`;

const filtersDocRef = (empresaId, proyectoId, userId) =>
  doc(db, 'filtersForUser', docId(empresaId, proyectoId, userId));

const filtersService = {
  getOnce: async (empresaId, proyectoId, userId) => {
    const ref = filtersDocRef(empresaId, proyectoId, userId);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  subscribe: (empresaId, proyectoId, userId, onChange) => {
    const ref = filtersDocRef(empresaId, proyectoId, userId);
    return onSnapshot(ref, (snap) => onChange(snap.exists() ? snap.data() : null));
  },

  save: async (empresaId, proyectoId, userId, filters) => {
    const ref = filtersDocRef(empresaId, proyectoId, userId);
    await setDoc(ref, {
      ...filters,
      userId,        // útil para reglas
      empresaId,
      proyectoId,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  },

  update: async (empresaId, proyectoId, userId, partial) => {
    const ref = filtersDocRef(empresaId, proyectoId, userId);
    await updateDoc(ref, {
      ...partial,
      _updatedAt: serverTimestamp(),
    });
  },
};

export default filtersService;
