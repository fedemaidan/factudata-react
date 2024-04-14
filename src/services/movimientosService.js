import { doc, getDoc } from 'firebase/firestore';
import { db } from 'src/config/firebase';

const movimientoService = {
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
};

export default movimientoService;
