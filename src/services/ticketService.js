import { collection, doc, addDoc, getDoc, updateDoc, query, where, getDocs, serverTimestamp} from 'firebase/firestore';
import { use } from 'react';
import { db } from 'src/config/firebase';
import { uploadFile } from './facturasService'; // Importa el servicio de facturas para subir los archivos


const ticketService = {
  createTicket: async (ticketData) => {
    try {
      const { tipo, tags, precioEstimado, archivos, userId } = ticketData;
  
      // Agregar el ticket a la colección 'tickets'
      const ticketRef = await addDoc(collection(db, 'tickets'), {
        tipo: tipo,
        tags: tags,
        precioEstimado: precioEstimado,
        estado: "Pago pendiente",
        userId: userId,
        created_at: serverTimestamp(),
      });
  
      // Subir las facturas y asociarlas al ticket
      if (archivos && archivos.length > 0) {
        const ticketId = ticketRef.id; // Obtener el ID del ticket recién creado
        const uploadResult = await uploadFile(archivos, tipo, ticketId);
        
        if (!uploadResult) {
          console.error('Error al subir las facturas');
          return false;
        }

        // Guardar los enlaces de los archivos en el ticket
        await updateDoc(doc(db, 'tickets', ticketId), {
            archivos: uploadResult,
        });
      }
  
      return ticketRef;
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
  getTicketsForUser: async (userId) => {
    try {
      console.log(userId)
      const q = query(collection(db, 'tickets'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const tickets = [];
      querySnapshot.forEach((doc) => {
        // Agregar cada ticket a la lista
        const ticket = {
          id: doc.id,
          ...doc.data(),
        };
        tickets.push(ticket);
      });
      console.log(tickets)
      return tickets;
    } catch (err) {
      console.error(err);
      return [];
    }
  },
};

export default ticketService;
