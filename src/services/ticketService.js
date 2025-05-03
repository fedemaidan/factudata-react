import { collection, doc, addDoc, getDoc, updateDoc,limit,  query, where, getDocs, orderBy, serverTimestamp, Timestamp} from 'firebase/firestore';
import { db, storage } from 'src/config/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { uploadFile, deleteFacturaByFilename } from './facturasService'; // Importa el servicio de facturas para subir los archivos
import { removeCreditsForUser } from './creditService';

const ticketService = {
  cloneTicket: async (ticketId) => {
    const originalTicket = await ticketService.getTicketById(ticketId);
    console.log(originalTicket)

    const newTicket = {
      tipo: originalTicket.tipo,
      tags: originalTicket.tags, 
      userId: originalTicket.userId, 
      userEmail: originalTicket.userEmail, 
      excelFileModel: originalTicket.modelo_excel, 
      extractionMethod: originalTicket.metodo_extraccion, 
      compatibleType: originalTicket.compatible_con,
      reason: "",
    }

    return await ticketService.createTicket(newTicket);
  },
  calcularEta: (cantidad) => {
    const hoy = new Date();
    let diasASumar;
  
    if (cantidad < 100) diasASumar = 2;
    else if (cantidad < 500) diasASumar = 4;
    else if (cantidad < 1000) diasASumar = 6;
    else return "Calculando..";
  
    hoy.setDate(hoy.getDate() + diasASumar);

    return hoy.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
  },  
  createTicket: async (ticketData) => {
    try {
      const { tipo, tags, userId, reason, userEmail, excelFileModel, extractionMethod, compatibleType } = ticketData;
      const comentarios =  [{
        who: "user",
        created_at: "Init",
        data: reason
      }] 


      let urlFileModel = await ticketService.addFileModel(userId, extractionMethod, excelFileModel);
      // Agregar el ticket a la colección 'tickets'
      const ticketRef = await addDoc(collection(db, 'tickets'), {
        tipo: tipo,
        tags: tags,
        estado: "Borrador",
        userId: userId,
        userEmail: userEmail,
        created_at: serverTimestamp(),
        eta: "",
        archivos: [],
        resultado: [],
        comentarios: comentarios,
        modelo_excel: urlFileModel, 
        metodo_extraccion: extractionMethod,
        compatible_con: compatibleType
      });
      return ticketRef;
      
    } catch (err) {
      console.error(err);
      return false;
    }
  },
  finishTicketWithFiles: async (ticketId, ticketData) => {
    const { tipo, archivos } = ticketData;
    
    if (archivos && archivos.length > 0) {
      
      const uploadResult = await uploadFile(archivos, tipo, ticketId, ticketData.userId);
      
      if (!uploadResult) {
        console.error('Error al subir las facturas');
        return false;
      }

      // Guardar los enlaces de los archivos en el ticket
      await updateDoc(doc(db, 'tickets', ticketId), {
          archivos: uploadResult,
          eta: ticketService.calcularEta(uploadResult.length),
      });

      const envia = await ticketService.enviarSuscripcion(ticketId, uploadResult.length);
    }

    return ticketId;
  },
  addFileModel: async (userId, extractionMethod, excelFileModel) => {
    let url = null;
    if (extractionMethod == 'excel') {
      const filename = `files/${userId}/${excelFileModel.name}`;
      const filesFolderRef = ref(storage, filename);
      await uploadBytes(filesFolderRef, excelFileModel);
      url = await getDownloadURL(filesFolderRef);
    }

    return url;
  },
  removeFileToTicket: async (ticketId, file) => {
    try {
      // Obtener datos del ticket actual
      const ticket = await ticketService.getTicketById(ticketId);
      if (!ticket) throw new Error('Ticket no encontrado');
      const updatedFiles = ticket.archivos.filter(archivo => archivo.name !== file.name);
      await updateDoc(doc(db, 'tickets', ticketId), { archivos: updatedFiles });
      await deleteFacturaByFilename(file.name);

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
  removeResultFileToTicket: async (ticketId, file) => {
    try {
      // Obtener datos del ticket actual
      const ticket = await ticketService.getTicketById(ticketId);
      if (!ticket) throw new Error('Ticket no encontrado');
      console.log(file, ticket.resultado)
      
      // Filtrar los archivos, eliminando el archivo especificado
      const updatedFiles = ticket.resultado.filter(archivo => archivo.name !== file.name);

      // Actualizar el ticket con la lista de archivos filtrada
      await updateDoc(doc(db, 'tickets', ticketId), { resultado: updatedFiles });

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
  addFilesToTicket: async (ticketId, files) => {
    try {
      // Obtener datos del ticket actual
      const ticket = await ticketService.getTicketById(ticketId);
      if (!ticket) throw new Error('Ticket no encontrado');

      // Subir nuevos archivos y obtener sus detalles
      // Asegúrate de tener una función uploadFiles en facturasService
      // que maneje la carga y devuelva detalles sobre los archivos cargados
      const uploadedFiles = await uploadFile(files, 'input', ticketId, ticket.userId);
      
      // Concatenar los archivos existentes con los nuevos archivos cargados
      const allFiles = ticket.archivos.concat(uploadedFiles);

      // Actualizar el ticket con la lista de archivos completa
      await updateDoc(doc(db, 'tickets', ticketId), { archivos: allFiles, eta: ticketService.calcularEta(allFiles.length) });

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },
  addResultToTicket: async (ticketId, files) => {
    try {
      // Obtener datos del ticket actual
      const ticket = await ticketService.getTicketById(ticketId);
      if (!ticket) throw new Error('Ticket no encontrado');

      const uploadedFiles = await uploadFile(files, 'output', ticketId, ticket.userId);
      if (!ticket.resultado)
        ticket.resultado = []
      const allFiles = ticket.resultado.concat(uploadedFiles);
      const hoy = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
      
      // Actualizar el ticket con la lista de archivos completa
      await updateDoc(doc(db, 'tickets', ticketId), 
        { 
          estado: "Completado", 
          eta: hoy,
          resultado: allFiles 
      });

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
  confirmTicketById: async (ticketId, amount, userId) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), {
        estado: "Confirmado",
        eta: ticketService.calcularEta(amount)
      });
      await removeCreditsForUser(userId, amount);
      
    } catch (err) {
      console.error(err);
      return null;
    }
  },
  updateTicketResultRowsById: async (ticketId, resultRows) => {
    try {
      console.log(resultRows)
      await updateDoc(doc(db, 'tickets', ticketId), {
        resultados: resultRows,
      });
    } catch (err) {
      console.error(err);
      return null;
    }
  },
  cancelTicketById: async (ticketId) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), {
        estado: "Cancelado",
      });
      
    } catch (err) {
      console.error(err);
      return null;
    }
  },
  getTicketsForUser: async (userId) => {
    try {
      const q = query(collection(db, 'tickets'), where('userId', '==', userId), orderBy('created_at', 'desc')  );
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
  getMovimientosForProyecto: async (proyectoId, moneda) => {
    try {
      const q = query(collection(db, 'movimientos'), where('proyecto_id', '==', proyectoId), where('moneda', '==', moneda), orderBy('fecha_factura', 'desc')  );
      const querySnapshot = await getDocs(q);

      const movimientos = [];
      querySnapshot.forEach((doc) => {
        // Agregar cada ticket a la lista
        const mov = {
          id: doc.id,
          ...doc.data(),
        };
        movimientos.push(mov);
      
      });

      console.log("movimientossssssss",movimientos)
      
      return movimientos;
    } catch (err) {
      console.error(err);
      return [];
    }
  },
  getCajaChicaDelUsuario: async (user, moneda = 'ARS') => {
    try {
      let queryRef = collection(db, 'movimientos');
  
      // Armamos la query para los movimientos de caja chica
      let movsQuery = query(
        queryRef,
        where('caja_chica', '==', true),
        where('id_user', '==', user.id),
        where('moneda', '==', moneda),
        orderBy('codigo_operacion', 'desc')
      );
  
      const movsSnapshot = await getDocs(movsQuery);
      const movimientos = [];
  
      movsSnapshot.forEach((doc) => {
        movimientos.push({
          id: doc.id,
          ...doc.data()
        });
      });
  
      return movimientos;
    } catch (err) {
      console.error('Error en getCajaChicaDelUsuario:', err);
      return [];
    }
  },
  
  getLastMovimientosForProyecto: async (proyectoId, limiteDias = 7) => {
    try {
      console.log("getLastMovimientosForProyecto")
      // Calcula la fecha hace 7 días
      const sieteDiasAtras = new Date();
      sieteDiasAtras.setDate(sieteDiasAtras.getDate() - limiteDias);
  
      const q = query(
        collection(db, 'movimientos'),
        where('proyecto_id', '==', proyectoId),
        // where('fecha_factura', '>=', Timestamp.fromDate(sieteDiasAtras)),
        where('fecha_factura', '>=', Timestamp.fromDate(sieteDiasAtras)),
        orderBy('fecha_factura', 'desc'),
      );
  
      const querySnapshot = await getDocs(q);
  
      const movimientos = [];
      querySnapshot.forEach((doc) => {
        // Agregar cada movimiento a la lista
        const mov = {
          id: doc.id,
          ...doc.data(),
        };
        movimientos.push(mov);
      });
  
      return movimientos;
    } catch (err) {
      console.error('Error al obtener los movimientos:', err);
      return [];
    }
  },  
  getTickets: async () => {
    try {
      const q = query(collection(db, 'tickets'));
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
  enviarSuscripcion: async (ticketId, cantidad) => {
    const url = 'https://script.google.com/macros/s/AKfycbzaQuvQi1Xmin-am_cfVrMRHVoRTQFCaucrnZ2fVNicu4duegYfF2pvO0Q7d5qb5BcM/exec';
          

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `ticketId=${encodeURIComponent(ticketId)}&cantidad=${encodeURIComponent(cantidad)}`
      });

      if (!response.ok) {
        throw new Error('Error al enviar el contacto');
      }

      // Aquí puedes manejar la respuesta exitosa
      return "Te contactaremos pronto.";

    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      throw error; // Lanza el error para ser manejado en otra parte de tu aplicación
    }
  },
};

export default ticketService;
