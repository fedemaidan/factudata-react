import { doc, getDoc } from 'firebase/firestore';
import { db } from 'src/config/firebase';
import api from './axiosConfig';


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
      const response = await api.put(`movimiento/${movimientoId}`, nuevosDatos);
      if (response.status === 201) {
          console.log('Movimiento editado con éxito');
          return true;
      } else {
          console.error('Error al editar el movimiento');
          return false;
      }
    } catch (err) {
        console.error('Error al editar el movimiento:', err);
        return false;
    }
  },
  deleteMovimientoById: async (movimientoId) => {
    try {
      const response = await api.delete(`movimiento/${movimientoId}`);
      if (response.status === 201) {
          console.log('Movimiento borrado con éxito');
          return true;
      } else {
          console.error('Error al borrar el movimiento');
          return false;
      }
    } catch (err) {
        console.error('Error al borrar el movimiento:', err);
        return false;
    }
  },
  addMovimiento: async (datosMovimiento) => {
    try {
        const nuevoMovimiento = {
              ...datosMovimiento
            };
        const response = await api.post(`movimiento/create`, nuevoMovimiento);
        if (response.status === 201) {
            console.log('Movimiento agregado con éxito');
            return true;
        } else {
            console.error('Error al agregar el movimiento');
            return false;
        }
    } catch (err) {
        console.error('Error al agregar el movimiento:', err);
        return false;
    }
  }
};

export default movimientosService;

