// src/data/loteParaTodos/mockServicios.js

export const CATEGORIA_SERVICIO = {
  AGUA: 'agua',
  ALAMBRADO: 'alambrado', 
  CORTE_CESPED: 'corte_cesped',
  GAS: 'gas',
  INSTALACION: 'instalacion',
  MEJORAS: 'mejoras',
  MANTENIMIENTO: 'mantenimiento'
};

export const CATEGORIA_SERVICIO_LABELS = {
  [CATEGORIA_SERVICIO.AGUA]: 'Agua',
  [CATEGORIA_SERVICIO.ALAMBRADO]: 'Alambrado',
  [CATEGORIA_SERVICIO.CORTE_CESPED]: 'Corte de Césped',
  [CATEGORIA_SERVICIO.GAS]: 'Gas',
  [CATEGORIA_SERVICIO.INSTALACION]: 'Instalación',
  [CATEGORIA_SERVICIO.MEJORAS]: 'Mejoras',
  [CATEGORIA_SERVICIO.MANTENIMIENTO]: 'Mantenimiento'
};

export const mockServicios = [
  // Servicios de Alambrado
  {
    id: 1,
    nombre: 'Alambrado Perimetral Básico',
    descripcion: 'Alambrado con postes de quebracho y alambre de púas - 4 hilos',
    categoria: CATEGORIA_SERVICIO.ALAMBRADO,
    precio_base: 25000,
    precio_por_metro: 150,
    unidad_medida: 'metro lineal',
    cuenta_liquidacion: 'ALAMBRADOS_001',
    estado: 'activo',
    requiere_medicion: true,
    tiempo_estimado_dias: 7,
    observaciones: 'Incluye postes cada 2.5 metros'
  },
  {
    id: 2,
    nombre: 'Alambrado Perimetral Premium',
    descripcion: 'Alambrado con postes de hormigón y alambre romboidal',
    categoria: CATEGORIA_SERVICIO.ALAMBRADO,
    precio_base: 45000,
    precio_por_metro: 280,
    unidad_medida: 'metro lineal',
    cuenta_liquidacion: 'ALAMBRADOS_002',
    estado: 'activo',
    requiere_medicion: true,
    tiempo_estimado_dias: 10,
    observaciones: 'Mayor durabilidad y estética'
  },
  
  // Servicios de Agua
  {
    id: 3,
    nombre: 'Conexión de Agua Potable',
    descripcion: 'Conexión a red de agua potable con medidor',
    categoria: CATEGORIA_SERVICIO.AGUA,
    precio_base: 35000,
    precio_por_metro: 0, // Precio fijo
    unidad_medida: 'conexión',
    cuenta_liquidacion: 'AGUA_001',
    estado: 'activo',
    requiere_medicion: false,
    tiempo_estimado_dias: 15,
    observaciones: 'Incluye medidor y conexión domiciliaria'
  },
  {
    id: 4,
    nombre: 'Perforación para Agua de Pozo',
    descripcion: 'Perforación de pozo de agua con bomba sumergible',
    categoria: CATEGORIA_SERVICIO.AGUA,
    precio_base: 120000,
    precio_por_metro: 800, // Por metro perforado
    unidad_medida: 'metro perforado',
    cuenta_liquidacion: 'AGUA_002',
    estado: 'activo',
    requiere_medicion: true,
    tiempo_estimado_dias: 21,
    observaciones: 'Incluye bomba sumergible y tablero de control'
  },
  
  // Servicios de Gas
  {
    id: 5,
    nombre: 'Conexión de Gas Natural',
    descripcion: 'Conexión a red de gas natural con medidor',
    categoria: CATEGORIA_SERVICIO.GAS,
    precio_base: 28000,
    precio_por_metro: 0,
    unidad_medida: 'conexión',
    cuenta_liquidacion: 'GAS_001',
    estado: 'activo',
    requiere_medicion: false,
    tiempo_estimado_dias: 20,
    observaciones: 'Sujeto a disponibilidad de red en la zona'
  },
  
  // Servicios de Corte de Césped
  {
    id: 6,
    nombre: 'Corte de Césped Mensual',
    descripcion: 'Servicio mensual de corte y limpieza del lote',
    categoria: CATEGORIA_SERVICIO.CORTE_CESPED,
    precio_base: 3500,
    precio_por_metro: 0,
    unidad_medida: 'servicio mensual',
    cuenta_liquidacion: 'MANTENIMIENTO_001',
    estado: 'activo',
    requiere_medicion: false,
    tiempo_estimado_dias: 1,
    observaciones: 'Servicio mensual recurrente'
  },
  {
    id: 7,
    nombre: 'Limpieza y Desmonte Inicial',
    descripcion: 'Limpieza completa del lote y desmonte de vegetación',
    categoria: CATEGORIA_SERVICIO.CORTE_CESPED,
    precio_base: 15000,
    precio_por_metro: 25,
    unidad_medida: 'metro cuadrado',
    cuenta_liquidacion: 'MANTENIMIENTO_002',
    estado: 'activo',
    requiere_medicion: true,
    tiempo_estimado_dias: 3,
    observaciones: 'Incluye retiro de material vegetal'
  },
  
  // Servicios de Instalación
  {
    id: 8,
    nombre: 'Instalación Eléctrica Básica',
    descripcion: 'Conexión eléctrica domiciliaria con medidor',
    categoria: CATEGORIA_SERVICIO.INSTALACION,
    precio_base: 42000,
    precio_por_metro: 0,
    unidad_medida: 'conexión',
    cuenta_liquidacion: 'ELECTRICIDAD_001',
    estado: 'activo',
    requiere_medicion: false,
    tiempo_estimado_dias: 12,
    observaciones: 'Incluye tablero principal y medidor'
  },
  
  // Servicios de Mejoras
  {
    id: 9,
    nombre: 'Construcción de Portón',
    descripcion: 'Portón de chapa con marco de hierro',
    categoria: CATEGORIA_SERVICIO.MEJORAS,
    precio_base: 38000,
    precio_por_metro: 0,
    unidad_medida: 'unidad',
    cuenta_liquidacion: 'MEJORAS_001',
    estado: 'activo',
    requiere_medicion: false,
    tiempo_estimado_dias: 5,
    observaciones: 'Medidas estándar 3.5m x 2m'
  },
  {
    id: 10,
    nombre: 'Nivelación de Terreno',
    descripcion: 'Nivelación y compactación del terreno',
    categoria: CATEGORIA_SERVICIO.MEJORAS,
    precio_base: 8000,
    precio_por_metro: 45,
    unidad_medida: 'metro cuadrado',
    cuenta_liquidacion: 'MEJORAS_002',
    estado: 'activo',
    requiere_medicion: true,
    tiempo_estimado_dias: 7,
    observaciones: 'Incluye maquinaria y compactación'
  }
];

// Servicios contratados por clientes
export const mockServiciosContratados = [
  {
    id: 1,
    cliente_id: 2,
    lote_id: 4,
    servicio_id: 1, // Alambrado Perimetral Básico
    fecha_contratacion: '2023-08-10',
    fecha_inicio: '2023-08-15',
    fecha_finalizacion: '2023-08-22',
    estado: 'completado',
    precio_acordado: 28500, // Precio personalizado
    metros_medidos: 190,
    observaciones: 'Cliente satisfecho con el trabajo',
    vendedor_id: 'carlos.lopez'
  },
  {
    id: 2,
    cliente_id: 2,
    lote_id: 7,
    servicio_id: 3, // Conexión de Agua Potable
    fecha_contratacion: '2024-01-15',
    fecha_inicio: '2024-02-01',
    fecha_finalizacion: null,
    estado: 'en_proceso',
    precio_acordado: 35000,
    metros_medidos: null,
    observaciones: 'Esperando disponibilidad de cuadrilla',
    vendedor_id: 'maria.garcia'
  },
  {
    id: 3,
    cliente_id: 3,
    lote_id: 12,
    servicio_id: 6, // Corte de Césped Mensual
    fecha_contratacion: '2023-09-01',
    fecha_inicio: '2023-09-01',
    fecha_finalizacion: null, // Servicio recurrente
    estado: 'activo',
    precio_acordado: 3500,
    metros_medidos: null,
    observaciones: 'Servicio mensual - próximo corte 15/11',
    vendedor_id: 'carlos.lopez'
  }
];

// Funciones auxiliares
export const getServiciosByCategoria = (categoria) => {
  return mockServicios.filter(servicio => servicio.categoria === categoria);
};

export const getServiciosActivos = () => {
  return mockServicios.filter(servicio => servicio.estado === 'activo');
};

export const getServiciosContratadosByCliente = (clienteId) => {
  return mockServiciosContratados.filter(sc => sc.cliente_id === clienteId);
};

export const getServiciosContratadosByContrato = (contratoId, loteId) => {
  // Los servicios están específicamente asociados al lote
  return mockServiciosContratados.filter(sc => sc.lote_id === loteId);
};

export const getServiciosContratadosByLote = (loteId) => {
  return mockServiciosContratados.filter(sc => sc.lote_id === loteId);
};

export const calcularPrecioServicio = (servicioId, metros = null) => {
  const servicio = mockServicios.find(s => s.id === servicioId);
  if (!servicio) return 0;
  
  let precio = servicio.precio_base;
  if (metros && servicio.precio_por_metro > 0) {
    precio += metros * servicio.precio_por_metro;
  }
  
  return precio;
};

export const getServiciosEnProceso = () => {
  return mockServiciosContratados.filter(sc => sc.estado === 'en_proceso');
};

export const getEstadisticasServicios = () => {
  const totalContratados = mockServiciosContratados.length;
  const completados = mockServiciosContratados.filter(sc => sc.estado === 'completado').length;
  const enProceso = mockServiciosContratados.filter(sc => sc.estado === 'en_proceso').length;
  const activos = mockServiciosContratados.filter(sc => sc.estado === 'activo').length;
  
  const montoTotal = mockServiciosContratados
    .filter(sc => sc.estado === 'completado')
    .reduce((total, sc) => total + sc.precio_acordado, 0);
  
  return {
    total_contratados: totalContratados,
    completados,
    en_proceso: enProceso,
    activos_recurrentes: activos,
    monto_total_facturado: montoTotal
  };
};