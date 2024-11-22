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
      console.log(nuevosDatos)
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
        const response = await api.post(`movimiento/`, nuevoMovimiento);
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
  },

  // Nuevo método para reemplazar la imagen de un movimiento
  reemplazarImagen: async (movimientoId, archivo) => {
    try {
      const formData = new FormData();
      formData.append('nuevoArchivo', archivo);  // El archivo seleccionado por el usuario

      const response = await api.put(`/reemplazar-imagen/${movimientoId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        console.log('Imagen reemplazada con éxito');
        return response.data;
      } else {
        console.error('Error al reemplazar la imagen');
        return null;
      }
    } catch (err) {
      console.error('Error al reemplazar la imagen:', err);
      throw new Error('Error al reemplazar la imagen');
    }
  },
};

export default movimientosService;
