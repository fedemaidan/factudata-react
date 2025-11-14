// data/loteParaTodos/mockLotes.js
export const mockLotes = [
  // Emprendimiento 1: Barrio Los Ceibos
  {
    id: 1,
    emprendimiento_id: 1,
    manzana: 'A',
    numero: 1,
    superficie: 450,
    frente: 15,
    fondo: 30,
    precio_base: 420000,
    lista_precios: 'BASE',
    estado: 'DISPONIBLE',
    observaciones: 'Lote esquina con vista panorámica'
  },
  {
    id: 2,
    emprendimiento_id: 1,
    manzana: 'A',
    numero: 2,
    superficie: 400,
    frente: 12,
    fondo: 33.33,
    precio_base: 380000,
    lista_precios: 'BASE',
    estado: 'RESERVADO',
    observaciones: ''
  },
  {
    id: 3,
    emprendimiento_id: 1,
    manzana: 'A',
    numero: 3,
    superficie: 420,
    frente: 14,
    fondo: 30,
    precio_base: 399000,
    lista_precios: 'PROMOCION_2024',
    estado: 'DISPONIBLE',
    observaciones: ''
  },
  {
    id: 4,
    emprendimiento_id: 1,
    manzana: 'A',
    numero: 4,
    superficie: 380,
    frente: 12,
    fondo: 31.67,
    precio_base: 361000,
    lista_precios: 'BASE',
    estado: 'VENDIDO',
    observaciones: 'Vendido a contado con descuento'
  },
  {
    id: 5,
    emprendimiento_id: 1,
    manzana: 'A',
    numero: 5,
    superficie: 500,
    frente: 20,
    fondo: 25,
    precio_base: 475000,
    lista_precios: 'PREMIUM',
    estado: 'DISPONIBLE',
    observaciones: 'Lote con frente amplio'
  },
  {
    id: 6,
    emprendimiento_id: 1,
    manzana: 'B',
    numero: 1,
    superficie: 350,
    frente: 10,
    fondo: 35,
    precio_base: 332500,
    lista_precios: 'BASE',
    estado: 'DISPONIBLE',
    observaciones: ''
  },
  {
    id: 7,
    emprendimiento_id: 1,
    manzana: 'B',
    numero: 2,
    superficie: 375,
    frente: 12.5,
    fondo: 30,
    precio_base: 356250,
    lista_precios: 'BASE',
    estado: 'BLOQUEADO',
    observaciones: 'Problemas documentales temporales'
  },
  {
    id: 8,
    emprendimiento_id: 1,
    manzana: 'B',
    numero: 3,
    superficie: 425,
    frente: 15,
    fondo: 28.33,
    precio_base: 403750,
    lista_precios: 'PROMOCION_2024',
    estado: 'RESERVADO',
    observaciones: ''
  },
  {
    id: 9,
    emprendimiento_id: 1,
    manzana: 'C',
    numero: 1,
    superficie: 600,
    frente: 24,
    fondo: 25,
    precio_base: 570000,
    lista_precios: 'PREMIUM',
    estado: 'DISPONIBLE',
    observaciones: 'Lote premium con ubicación privilegiada'
  },
  {
    id: 10,
    emprendimiento_id: 1,
    manzana: 'C',
    numero: 2,
    superficie: 450,
    frente: 18,
    fondo: 25,
    precio_base: 427500,
    lista_precios: 'BASE',
    estado: 'VENDIDO',
    observaciones: ''
  },

  // Emprendimiento 2: Costa Verde Residencial
  {
    id: 11,
    emprendimiento_id: 2,
    manzana: '1',
    numero: 1,
    superficie: 800,
    frente: 25,
    fondo: 32,
    precio_base: 96000,
    lista_precios: 'BASE',
    estado: 'DISPONIBLE',
    observaciones: 'Lote con vista al lago'
  },
  {
    id: 12,
    emprendimiento_id: 2,
    manzana: '1',
    numero: 2,
    superficie: 750,
    frente: 22,
    fondo: 34.09,
    precio_base: 90000,
    lista_precios: 'BASE',
    estado: 'RESERVADO',
    observaciones: ''
  },
  {
    id: 13,
    emprendimiento_id: 2,
    manzana: '1',
    numero: 3,
    superficie: 650,
    frente: 20,
    fondo: 32.5,
    precio_base: 78000,
    lista_precios: 'PROMOCION_VERANO',
    estado: 'DISPONIBLE',
    observaciones: ''
  },
  {
    id: 14,
    emprendimiento_id: 2,
    manzana: '2',
    numero: 1,
    superficie: 900,
    frente: 30,
    fondo: 30,
    precio_base: 108000,
    lista_precios: 'PREMIUM',
    estado: 'VENDIDO',
    observaciones: 'Lote esquina premium'
  },
  {
    id: 15,
    emprendimiento_id: 2,
    manzana: '2',
    numero: 2,
    superficie: 700,
    frente: 25,
    fondo: 28,
    precio_base: 84000,
    lista_precios: 'BASE',
    estado: 'DISPONIBLE',
    observaciones: ''
  },

  // Emprendimiento 3: Miradores del Río
  {
    id: 16,
    emprendimiento_id: 3,
    manzana: 'Norte',
    numero: 1,
    superficie: 1200,
    frente: 40,
    fondo: 30,
    precio_base: 360000,
    lista_precios: 'PREMIUM',
    estado: 'DISPONIBLE',
    observaciones: 'Vista panorámica al río'
  },
  {
    id: 17,
    emprendimiento_id: 3,
    manzana: 'Norte',
    numero: 2,
    superficie: 1000,
    frente: 25,
    fondo: 40,
    precio_base: 300000,
    lista_precios: 'BASE',
    estado: 'RESERVADO',
    observaciones: ''
  },
  {
    id: 18,
    emprendimiento_id: 3,
    manzana: 'Sur',
    numero: 1,
    superficie: 800,
    frente: 20,
    fondo: 40,
    precio_base: 240000,
    lista_precios: 'BASE',
    estado: 'DISPONIBLE',
    observaciones: 'Acceso directo desde ruta principal'
  },
  {
    id: 19,
    emprendimiento_id: 3,
    manzana: 'Sur',
    numero: 2,
    superficie: 900,
    frente: 22.5,
    fondo: 40,
    precio_base: 270000,
    lista_precios: 'PROMOCION_2024',
    estado: 'BLOQUEADO',
    observaciones: 'Pendiente aprobación municipal'
  },

  // Emprendimiento 4: Portal de la Montaña
  {
    id: 20,
    emprendimiento_id: 4,
    manzana: 'Alpha',
    numero: 1,
    superficie: 2000,
    frente: 50,
    fondo: 40,
    precio_base: 180000,
    lista_precios: 'PREMIUM',
    estado: 'DISPONIBLE',
    observaciones: 'Lote de gran extensión con vista a la montaña'
  },
  {
    id: 21,
    emprendimiento_id: 4,
    manzana: 'Alpha',
    numero: 2,
    superficie: 1800,
    frente: 45,
    fondo: 40,
    precio_base: 162000,
    lista_precios: 'BASE',
    estado: 'VENDIDO',
    observaciones: ''
  },
  {
    id: 22,
    emprendimiento_id: 4,
    manzana: 'Beta',
    numero: 1,
    superficie: 1500,
    frente: 37.5,
    fondo: 40,
    precio_base: 135000,
    lista_precios: 'BASE',
    estado: 'RESERVADO',
    observaciones: ''
  },

  // Emprendimiento 5: Quintas del Valle (USD)
  {
    id: 23,
    emprendimiento_id: 5,
    manzana: 'Q1',
    numero: 1,
    superficie: 5000,
    frente: 100,
    fondo: 50,
    precio_base: 25000,
    lista_precios: 'PREMIUM',
    estado: 'DISPONIBLE',
    observaciones: 'Quinta con arroyo propio'
  },
  {
    id: 24,
    emprendimiento_id: 5,
    manzana: 'Q1',
    numero: 2,
    superficie: 4500,
    frente: 90,
    fondo: 50,
    precio_base: 22500,
    lista_precios: 'BASE',
    estado: 'RESERVADO',
    observaciones: ''
  },
  {
    id: 25,
    emprendimiento_id: 5,
    manzana: 'Q2',
    numero: 1,
    superficie: 6000,
    frente: 120,
    fondo: 50,
    precio_base: 30000,
    lista_precios: 'PREMIUM',
    estado: 'VENDIDO',
    observaciones: 'Quinta con bosque nativo'
  }
];

// Estados posibles para los lotes
export const ESTADO_LOTE = {
  DISPONIBLE: 'DISPONIBLE',
  RESERVADO: 'RESERVADO', 
  VENDIDO: 'VENDIDO',
  BLOQUEADO: 'BLOQUEADO'
};

// Listas de precios disponibles
export const LISTAS_PRECIOS = {
  BASE: 'BASE',
  PROMOCION_2024: 'PROMOCION_2024',
  PROMOCION_VERANO: 'PROMOCION_VERANO',
  PREMIUM: 'PREMIUM'
};

// Funciones de utilidad
export const getLotesByEmprendimiento = (emprendimientoId) => {
  return mockLotes.filter(lote => lote.emprendimiento_id === emprendimientoId);
};

export const getLoteById = (id) => {
  return mockLotes.find(lote => lote.id === id);
};

export const getLotesByEstado = (emprendimientoId, estado) => {
  return mockLotes.filter(lote => 
    lote.emprendimiento_id === emprendimientoId && lote.estado === estado
  );
};

export const getEstadisticasLotes = (emprendimientoId) => {
  const lotes = getLotesByEmprendimiento(emprendimientoId);
  
  return {
    total: lotes.length,
    disponibles: lotes.filter(l => l.estado === 'DISPONIBLE').length,
    reservados: lotes.filter(l => l.estado === 'RESERVADO').length,
    vendidos: lotes.filter(l => l.estado === 'VENDIDO').length,
    bloqueados: lotes.filter(l => l.estado === 'BLOQUEADO').length,
    superficie_total: lotes.reduce((sum, l) => sum + l.superficie, 0),
    precio_promedio: lotes.reduce((sum, l) => sum + l.precio_base, 0) / lotes.length
  };
};