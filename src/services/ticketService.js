import { collection, doc, addDoc, getDoc } from 'firebase/firestore';
import { db } from 'src/config/firebase';
import { uploadFile } from './facturasService'; // Importa el servicio de facturas para subir los archivos

const ticketService = {
  createTicket: async (ticketData) => {
    try {
      const { tipo, tags, precioEstimado, archivos } = ticketData;

      // Agregar el ticket a la colección 'tickets'
      const ticketRef = await addDoc(collection(db, 'tickets'), {
        tipo,
        tags,
        precioEstimado,
      });

      // Subir las facturas y asociarlas al ticket
      if (archivos && archivos.length > 0) {
        const ticketId = ticketRef.id; // Obtener el ID del ticket recién creado
        const uploadResult = await uploadFile(archivos, tipo, ticketId);
        
        if (!uploadResult) {
          console.error('Error al subir las facturas');
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
  getTicketById: async (ticketId) => {
    try {
      const ticketDocRef = doc(db, 'tickets', ticketId);
      const ticketDocSnapshot = await getDoc(ticketDocRef);

      if (ticketDocSnapshot.exists()) {
        return {
          id: ticketDocSnapshot.id,
          ...ticketDocSnapshot.data(),
        };
      } else {
        console.error('El ticket no existe');
        return null;
      }
    } catch (err) {
      console.error(err);
      return null;
    }
  },
};

export default ticketService;
