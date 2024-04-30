import { doc, getDoc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from 'src/config/firebase';

const movimientosService = {
  // Método para obtener un movimiento por su ID
  getMovimientoById: async (movimientoId) => {
    try {
      const movimientoDocRef = doc(db, 'movimientos', movimientoId);
      const movimientoDocSnap = await getDoc(movimientoDocRef);

      if (movimientoDocSnap.exists()) {
        console.log('Movimiento obtenido con éxito');
        return {
          id: movimientoDocSnap.id,
          ...movimientoDocSnap.data(),
        };
      } else {
        console.error('El movimiento no existe');
        return null;
      }
    } catch (err) {
      console.error('Error al obtener el movimiento:', err);
      return null;
    }
  },
  updateMovimiento: async (movimientoId, nuevosDatos) => {
    try {
      const movimientoDocRef = doc(db, 'movimientos', movimientoId);
      await updateDoc(movimientoDocRef, nuevosDatos);
      console.log('Movimiento actualizado con éxito');
      return true;
    } catch (err) {
      console.error('Error al actualizar el movimiento:', err);
      return false;
    }
  },
  deleteMovimientoById: async (movimientoId) => {
    try {
      const movimientoDocRef = doc(db, 'movimientos', movimientoId);
      await deleteDoc(movimientoDocRef);
      console.log('Movimiento eliminado con éxito');
      return true;
    } catch (err) {
      console.error('Error al eliminar el movimiento:', err);
      return false;
    }
  },
  addMovimiento: async (datosMovimiento) => {
    try {
      const nuevoMovimiento = {
        ...datosMovimiento,
        fecha_factura: serverTimestamp(), // Asigna la fecha y hora del servidor al momento de la creación
      };

      const movimientoDocRef = await addDoc(collection(db, 'movimientos'), nuevoMovimiento);
      console.log('Movimiento agregado con éxito con ID:', movimientoDocRef.id);
      return true;
    } catch (err) {
      console.error('Error al agregar el movimiento:', err);
      return false;
    }
  }

};

export default movimientosService;

