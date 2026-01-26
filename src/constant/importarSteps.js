// Steps para el flujo de creación de acopios
export const steps = [
  'Tipo de acopio',
  'Proveedor', 
  'Proyecto',
  'Identificación',
  'Método de carga',
  'Subir archivo',
  'Ajustar columnas',
  'Revisión final'
];

// Mapeo de qué steps se muestran según el método de carga elegido
export const METODO_CARGA = {
  ARCHIVO: 'archivo',
  MANUAL: 'manual',
  COPIAR_ACOPIO: 'copiar_acopio',
  DESDE_FACTURA: 'desde_factura'
};

// Steps que se saltan según el método
export const getStepsToSkip = (metodoCarga) => {
  switch (metodoCarga) {
    case METODO_CARGA.MANUAL:
      return [5, 6]; // Saltar "Subir archivo" y "Ajustar columnas"
    case METODO_CARGA.COPIAR_ACOPIO:
      return [5, 6]; // Saltar "Subir archivo" y "Ajustar columnas"
    case METODO_CARGA.DESDE_FACTURA:
      return [5, 6]; // Saltar "Subir archivo" y "Ajustar columnas"
    case METODO_CARGA.ARCHIVO:
    default:
      return []; // No saltar ninguno
  }
};
