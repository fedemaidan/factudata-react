import { db } from 'src/config/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import mensajeProgramadoService from './mensajeProgramadoService';

const hojaDeRutaService = {
  async getHojasDeRutaByEmpresa(empresaId) {
    const q = query(collection(db, 'hojasDeRuta'), where('empresaId', '==', empresaId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), fechaSalida: doc.data().fechaSalida.toDate().toISOString() }));
  },
  
  async getHojaDeRutaById(id) {
    const hojaRef = doc(db, 'hojasDeRuta', id);
    const hojaSnap = await getDoc(hojaRef);
    if (hojaSnap.exists()) {
      return { id: hojaSnap.id, ...hojaSnap.data(), fechaSalida: hojaSnap.data().fechaSalida.toDate().toISOString() };
    } else {
      throw new Error('No such document!');
    }
  },

  async createHojaDeRuta(data) {
    data.fechaSalida = Timestamp.fromDate(new Date(data.fechaSalida)); 
    const newHojaDeRuta = await addDoc(collection(db, 'hojasDeRuta'), data);
    await mensajeProgramadoService.createMensajeHojaDeRuta({
      numero: data.whatsappChofer,
      texto: "Hola! Hoy seré tu asistente en este viaje. Solo tienes que enviarme una foto de cada remito que entregues y yo me encargo de registrarlo en el sistema. Para comenzar debes ingresar tu código asignado para que pueda verificar tu identidad.",
      fecha: data.fechaSalida.toDate().toISOString(),
      hojaRutaId: newHojaDeRuta.id,
      empresaId: data.empresaId,
    });
    return newHojaDeRuta;
  },

  async updateHojaDeRuta(id, data) {
    data.fechaSalida = Timestamp.fromDate(new Date(data.fechaSalida)); 
    const hojaRef = doc(db, 'hojasDeRuta', id);
    await updateDoc(hojaRef, data);
    await mensajeProgramadoService.updateMensajeHojaDeRuta({
      numero: data.whatsappChofer,
      texto: "Hola! Hoy seré tu asistente en este viaje. Solo tienes que enviarme una foto de cada remito que entregues y yo me encargo de registrarlo en el sistema. Para comenzar debes ingresar tu código asignado para que pueda verificar tu identidad.",
      fecha: data.fechaSalida.toDate().toISOString(),
      hojaRutaId: id,
      empresaId: data.empresaId,
    });
    return hojaRef;
  },

  async deleteHojaDeRuta(id) {
    const hojaRef = doc(db, 'hojasDeRuta', id);
    await deleteDoc(hojaRef);
    await mensajeProgramadoService.deleteMensajeHojaDeRuta(id);
  },
};

export default hojaDeRutaService;
