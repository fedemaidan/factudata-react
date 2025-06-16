import { doc, getDoc } from 'firebase/firestore';
import { db, storage } from 'src/config/firebase';
import api from './axiosConfig';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

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
          return {error: false, data: response.data};
      } else {
          console.error('Error al editar el movimiento');
          return {error: true};
      }
    } catch (err) {
        console.error('Error al editar el movimiento:', err);
        return {error: true};
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
            return {error: false, data: response.data};
        } else {
            console.error('Error al agregar el movimiento');
            return {error: true};
        }
    } catch (err) {
        console.error('Error al agregar el movimiento:', err);
        return {error: true};
    }
  },

  // Nuevo método para reemplazar la imagen de un movimiento
  reemplazarImagen: async (movimientoId, archivo) => {
    try {
      const formData = new FormData();
      formData.append('nuevoArchivo', archivo);  // El archivo seleccionado por el usuario
      console.log(archivo)
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

  extraerDatosDesdeImagen: async (archivoUrl, archivoFile, datosContexto) => {
    try {
      const formData = new FormData();
      if (archivoFile) {
        formData.append('archivo', archivoFile);
      } else if (archivoUrl) {
        formData.append('archivo_url', archivoUrl);
      }
  
      formData.append('proveedores', JSON.stringify(datosContexto.proveedores));
      formData.append('categorias', JSON.stringify(datosContexto.categorias));
      formData.append('medios_pago', JSON.stringify(datosContexto.medios_pago));
      formData.append('medio_pago_default', datosContexto.medio_pago_default);
      formData.append('proyecto_id', datosContexto.proyecto_id);
      formData.append('proyecto_nombre', datosContexto.proyecto_nombre);
      
      const response = await api.post(`/movimiento/extraer`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error('Error al extraer datos');
      }
    } catch (err) {
      console.error('Error al extraer datos desde imagen:', err);
      throw err;
    }
  },

  subirImagenTemporal: async (archivo) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const userId = user?.id || 'generico';
  
      const filename = `movimientos_temp/${userId}/${archivo.name}`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, archivo);
      const url = await getDownloadURL(storageRef);
  
      return { url_imagen: url };
    } catch (err) {
      console.error('Error al subir imagen temporal a Firebase Storage:', err);
      throw err;
    }
  }
  
};

export default movimientosService;
