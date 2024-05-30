import { db } from 'src/config/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc, query, where, Timestamp } from 'firebase/firestore';

const mensajeProgramadoService = {
  async getMensajesProgramadosByEmpresa(empresaId) {
    const mensajesCollection = collection(db, 'mensajesProgramados');
    const q = query(mensajesCollection, where('empresaId', '==', empresaId));
    const mensajesSnapshot = await getDocs(q);
    const mensajesList = mensajesSnapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, ...data, fecha: data.fecha.toDate().toISOString() }; // Convertir timestamp a cadena de fecha
    });
    return mensajesList;
  },

  async createMensajeProgramado(mensaje, isTimestamp = false) {
    if (!isTimestamp) {
      mensaje.fecha = Timestamp.fromDate(new Date(mensaje.fecha)); 
    }
    const mensajesCollection = collection(db, 'mensajesProgramados');
    const newMensajeRef = doc(mensajesCollection);
    await setDoc(newMensajeRef, { ...mensaje, estado: 'Pendiente' });
    return { id: newMensajeRef.id, ...mensaje, estado: 'Pendiente' };
  },
  
  async updateMensajeProgramado(id, mensaje) {
    mensaje.fecha = Timestamp.fromDate(new Date(mensaje.fecha)); 
    const mensajeRef = doc(db, 'mensajesProgramados', id);
    await updateDoc(mensajeRef, mensaje);
  },
  
  async deleteMensajeProgramado(id) {
    const mensajeRef = doc(db, 'mensajesProgramados', id);
    await deleteDoc(mensajeRef);
  },

  async cancelarMensajeProgramado(id) {
    const mensajeRef = doc(db, 'mensajesProgramados', id);
    await updateDoc(mensajeRef, { estado: 'Cancelado' });
  },

  // New functions for hoja de ruta
  async createMensajeHojaDeRuta(mensaje) {
    const mensajesCollection = collection(db, 'mensajesProgramados');
    const newMensajeRef = doc(mensajesCollection);
    mensaje.fecha = Timestamp.fromDate(new Date(mensaje.fecha));
    mensaje.tipo = "Hoja de ruta";
    await setDoc(newMensajeRef, { ...mensaje, estado: 'Pendiente' });
    return { id: newMensajeRef.id, ...mensaje, estado: 'Pendiente' };
  },
  
  async updateMensajeHojaDeRuta(mensaje) {
    const q = query(collection(db, 'mensajesProgramados'), where('hojaRutaId', '==', mensaje.hojaRutaId));
    const mensajesSnapshot = await getDocs(q);
    if (!mensajesSnapshot.empty) {
      const mensajeRef = mensajesSnapshot.docs[0].ref;
      mensaje.fecha = Timestamp.fromDate(new Date(mensaje.fecha));
      await updateDoc(mensajeRef, mensaje);
      return { id: mensajeRef.id, ...mensaje };
    }
    return null;
  },
  
  async deleteMensajeHojaDeRuta(hojaRutaId) {
    const q = query(collection(db, 'mensajesProgramados'), where('hojaRutaId', '==', hojaRutaId));
    const mensajesSnapshot = await getDocs(q);
    if (!mensajesSnapshot.empty) {
      const mensajeRef = mensajesSnapshot.docs[0].ref;
      await deleteDoc(mensajeRef);
      return true;
    }
    return false;
  },
};

export default mensajeProgramadoService;
