import api from './axiosConfig';

export const venderUnidad = async (ventaData, empresaId, userId) => {
  try {
    const payload = {
      empresa_id: empresaId,
      user_id: userId,
      proyecto_id: ventaData.proyecto_id,
      proyecto_nombre: ventaData.proyecto_nombre,
      subproyecto: ventaData.subproyecto,
      subproyecto_id: ventaData.subproyecto_id,
      nombre_cliente: ventaData.nombre_cliente,
      precio_venta_acordado: ventaData.precio_venta_acordado,
      moneda: ventaData.moneda,
      edificio: ventaData.edificio,
      lote: ventaData.lote,
      tipificacion: ventaData.tipificacion,
      cocheras: ventaData.cocheras,
      contado: ventaData.contado || 0,
      moneda_contado: ventaData.moneda_contado || ventaData.moneda,
      cuenta_pendiente: ventaData.cuenta_pendiente || null
    };

    const response = await api.post('venta-unidad', payload);

    if (response.status === 201 || response.status === 200) {
      console.log('Venta de unidad registrada con éxito');
      return {
        error: false,
        ...response.data,
        unidadActualizada: true,
        cuentaPendienteCreada: !!response.data.cuentaPendienteId,
        ingresoCreado: !!response.data.ingresoId,
        codigoOperacion: response.data.codigoOperacion
      };
    } else {
      console.error('Error al registrar la venta');
      return { error: true };
    }
  } catch (error) {
    console.error('Error al vender unidad:', error);
    throw error;
  }
};

export const alquilarUnidad = async (alquilerData, empresaId, userId) => {
  try {
    const payload = {
      empresa_id: empresaId,
      user_id: userId,
      proyecto_id: alquilerData.proyecto_id,
      proyecto_nombre: alquilerData.proyecto_nombre,
      subproyecto: alquilerData.subproyecto,
      subproyecto_id: alquilerData.subproyecto_id,
      subproyecto_nombre: alquilerData.subproyecto_nombre,
      nombre_cliente: alquilerData.nombre_cliente,
      precio_alquiler_acordado: alquilerData.precio_alquiler_acordado,
      moneda: alquilerData.moneda,
      meses: alquilerData.meses,
      dia_vencimiento: alquilerData.dia_vencimiento || 1,
      edificio: alquilerData.edificio,
      lote: alquilerData.lote,
      tipificacion: alquilerData.tipificacion,
      cocheras: alquilerData.cocheras
    };

    const response = await api.post('alquiler-unidad', payload);

    if (response.status === 201 || response.status === 200) {
      console.log('Alquiler de unidad registrado con éxito');
      return {
        error: false,
        ...response.data,
        unidadActualizada: true,
        cuentaPendienteCreada: !!response.data.cuentaPendienteId
      };
    } else {
      console.error('Error al registrar el alquiler');
      return { error: true };
    }
  } catch (error) {
    console.error('Error al alquilar unidad:', error);
    throw error;
  }
};

