// src/data/loteParaTodos/mockEmprendimientos.js

export const ESTADO_EMPRENDIMIENTO = {
  BORRADOR: 'borrador',
  ACTIVO: 'activo', 
  SUSPENDIDO: 'suspendido',
  INACTIVO: 'inactivo',
  ARCHIVADO: 'archivado'
};

export const ESTADO_EMPRENDIMIENTO_LABELS = {
  [ESTADO_EMPRENDIMIENTO.BORRADOR]: 'Borrador',
  [ESTADO_EMPRENDIMIENTO.ACTIVO]: 'Activo',
  [ESTADO_EMPRENDIMIENTO.SUSPENDIDO]: 'Suspendido', 
  [ESTADO_EMPRENDIMIENTO.INACTIVO]: 'Inactivo',
  [ESTADO_EMPRENDIMIENTO.ARCHIVADO]: 'Archivado'
};

export const ESTADO_EMPRENDIMIENTO_COLORS = {
  [ESTADO_EMPRENDIMIENTO.BORRADOR]: 'default',
  [ESTADO_EMPRENDIMIENTO.ACTIVO]: 'success',
  [ESTADO_EMPRENDIMIENTO.SUSPENDIDO]: 'warning',
  [ESTADO_EMPRENDIMIENTO.INACTIVO]: 'error', 
  [ESTADO_EMPRENDIMIENTO.ARCHIVADO]: 'secondary'
};

export const TIPO_PRECIO = {
  FIJO: 'fijo',
  POR_M2: 'por_m2',
  PERSONALIZADO: 'personalizado'
};

export const TIPO_PRECIO_LABELS = {
  [TIPO_PRECIO.FIJO]: 'Precio fijo por lote',
  [TIPO_PRECIO.POR_M2]: 'Precio por m²',
  [TIPO_PRECIO.PERSONALIZADO]: 'Precio personalizado por lote'
};

export const INDICE_ACTUALIZACION = {
  IPC: 'ipc',
  ICL: 'icl', 
  DOLAR: 'dolar',
  FIJO: 'fijo'
};

export const INDICE_ACTUALIZACION_LABELS = {
  [INDICE_ACTUALIZACION.IPC]: 'IPC (Índice de Precios al Consumidor)',
  [INDICE_ACTUALIZACION.ICL]: 'ICL (Índice Costo de Vida)',
  [INDICE_ACTUALIZACION.DOLAR]: 'Cotización USD',
  [INDICE_ACTUALIZACION.FIJO]: 'Sin actualización'
};

export const mockEmprendimientos = [
  {
    id: 1,
    nombre: 'Cerro Verde I',
    codigo_interno: 'CV001',
    
    // Datos generales ampliados
    descripcion: 'Desarrollo residencial con lotes de 300-500 m². Primera etapa del proyecto Cerro Verde.',
    sociedad_razon_social: 'Desarrollos Cerro Verde SA',
    cuit: '30-12345678-9',
    
    // Ubicación detallada
    provincia: 'Buenos Aires',
    ciudad: 'La Matanza',
    direccion: 'Ruta 3 Km 42',
    coordenadas: { lat: -34.7704, lng: -58.6256 },
    
    // Configuración inicial
    moneda_principal: 'ARS',
    indice_actualizacion_default: INDICE_ACTUALIZACION.IPC,
    dia_vencimiento_default: 10,
    
    // Datos comerciales
    superficie_total_hectareas: 35.5,
    cantidad_lotes_total: 120,
    valor_m2_base: 15000,
    tipo_precio_default: TIPO_PRECIO.POR_M2,
    
    // Estado y fechas
    estado: ESTADO_EMPRENDIMIENTO.ACTIVO,
    fecha_creacion: '2023-01-15',
    fecha_lanzamiento: '2023-03-01',
    fecha_entrega_estimada: '2025-12-31',
    fecha_ultima_actualizacion: '2024-11-01',
    
    // Configuración operativa
    permite_reservas: true,
    permite_ventas: true,
    requiere_aprobacion_gerencia: false,
    
    // Desarrollador
    desarrollador: {
      nombre: 'Inmobiliaria Verde',
      contacto: 'Carlos Mendez',
      telefono: '+54 9 11 4567-8901',
      email: 'cmendez@inmoverde.com.ar'
    },
    
    // Servicios
    servicios_incluidos: ['luz', 'agua_corriente', 'gas_natural'],
    servicios_opcionales: ['alambrado', 'corte_cesped'],
    
    // Documentación
    documentos_requeridos: ['boleto', 'contrato', 'reglamento'],
    master_plan_url: '/documentos/emprendimientos/cerro-verde-1/master-plan.pdf',
    master_plan_imagen: '/images/emprendimientos/cerro-verde-1/plano-general.jpg',
    documentos_reglamento: [
      { nombre: 'Reglamento General', url: '/documentos/emprendimientos/cerro-verde-1/reglamento.pdf' },
      { nombre: 'Memoria Descriptiva', url: '/documentos/emprendimientos/cerro-verde-1/memoria.pdf' }
    ],
    
    // Deuda municipal
    municipio: 'la_matanza',
    url_deuda_municipal_base: 'https://lamatanza.gob.ar/consulta-partida/',
    
    // Estadísticas (se calculan dinámicamente pero se pueden cachear)
    lotes_disponibles: 45,
    lotes_vendidos: 60,
    lotes_reservados: 12,
    lotes_bloqueados: 3,
    
    // Observaciones y metadatos
    observaciones: 'Primera etapa del desarrollo Cerro Verde. Excelente conectividad.',
    creado_por: 'admin',
    modificado_por: 'carlos.lopez'
  },
  {
    id: 2,
    nombre: 'Loteo Norte Premium',
    ubicacion: 'Av. San Martín 2800, Morón Norte',
    estado: 'ACTIVO',
    fecha_inicio: '2023-06-01',
    fecha_fin: '2026-06-30',
    observaciones: 'Loteo premium con infraestructura completa y club house.',
    descripcion: 'Lotes de 400-800 m² con todos los servicios, seguridad 24hs y amenities.',
    total_lotes: 85,
    lotes_disponibles: 32,
    lotes_vendidos: 41,
    lotes_reservados: 8,
    lotes_bloqueados: 4
  },
  {
    id: 3,
    nombre: 'Los Robles Country',
    ubicacion: 'Ruta 205 Km 15, Cañuelas',
    estado: 'ACTIVO',
    fecha_inicio: '2022-09-01',
    fecha_fin: '2024-12-31',
    observaciones: 'Country club con lotes de gran superficie y cancha de golf.',
    descripcion: 'Desarrollo de alta gama con lotes de 800-1500 m², cancha de golf 18 hoyos.',
    total_lotes: 150,
    lotes_disponibles: 28,
    lotes_vendidos: 95,
    lotes_reservados: 18,
    lotes_bloqueados: 9
  },
  {
    id: 4,
    nombre: 'Horizonte I',
    ubicacion: 'Camino Real 1200, Ezeiza',
    estado: 'ACTIVO',
    fecha_inicio: '2024-02-01',
    fecha_fin: '2027-02-28',
    observaciones: 'Nuevo desarrollo con foco en sustentabilidad y tecnología.',
    descripcion: 'Lotes con pre-instalación domótica, placas solares y sistema de riego.',
    total_lotes: 95,
    lotes_disponibles: 78,
    lotes_vendidos: 12,
    lotes_reservados: 4,
    lotes_bloqueados: 1
  },
  {
    id: 5,
    nombre: 'Delta Tigre',
    ubicacion: 'Río Luján s/n, Delta del Tigre',
    estado: 'PLANIFICACION',
    fecha_inicio: '2024-08-01',
    fecha_fin: '2026-12-31',
    observaciones: 'Desarrollo en el delta con acceso náutico exclusivo.',
    descripcion: 'Lotes con frente al río, muelles privados y acceso por lancha.',
    total_lotes: 45,
    lotes_disponibles: 0,
    lotes_vendidos: 0,
    lotes_reservados: 0,
    lotes_bloqueados: 45
  },
  {
    id: 6,
    nombre: 'Cerro Verde II',
    ubicacion: 'Ruta 3 Km 44, La Matanza',
    estado: 'PLANIFICACION',
    fecha_inicio: '2025-03-01',
    fecha_fin: '2027-03-31',
    observaciones: 'Segunda etapa del desarrollo Cerro Verde.',
    descripcion: 'Ampliación del desarrollo original con lotes de mayor superficie.',
    total_lotes: 180,
    lotes_disponibles: 0,
    lotes_vendidos: 0,
    lotes_reservados: 0,
    lotes_bloqueados: 180
  }
];

// Funciones auxiliares
export const getEmprendimientoById = (id) => {
  return mockEmprendimientos.find(emp => emp.id === parseInt(id));
};

export const getEmprendimientosActivos = () => {
  return mockEmprendimientos.filter(emp => emp.estado === ESTADO_EMPRENDIMIENTO.ACTIVO);
};

export const getEmprendimientosBorrador = () => {
  return mockEmprendimientos.filter(emp => emp.estado === ESTADO_EMPRENDIMIENTO.BORRADOR);
};

export const getEmprendimientosByEstado = (estado) => {
  return mockEmprendimientos.filter(emp => emp.estado === estado);
};

// Estadísticas generales
export const getEstadisticasGeneralesEmprendimientos = () => {
  const total = mockEmprendimientos.length;
  const activos = mockEmprendimientos.filter(e => e.estado === ESTADO_EMPRENDIMIENTO.ACTIVO).length;
  const borrador = mockEmprendimientos.filter(e => e.estado === ESTADO_EMPRENDIMIENTO.BORRADOR).length;
  const suspendidos = mockEmprendimientos.filter(e => e.estado === ESTADO_EMPRENDIMIENTO.SUSPENDIDO).length;
  
  const totalLotes = mockEmprendimientos.reduce((sum, emp) => sum + emp.cantidad_lotes_total, 0);
  const totalSuperficie = mockEmprendimientos.reduce((sum, emp) => sum + emp.superficie_total_hectareas, 0);
  
  return {
    total_emprendimientos: total,
    activos,
    borrador,
    suspendidos,
    total_lotes: totalLotes,
    total_superficie_hectareas: totalSuperficie
  };
};

// Buscar emprendimientos
export const buscarEmprendimientos = (termino) => {
  const terminoLower = termino.toLowerCase();
  return mockEmprendimientos.filter(emp => 
    emp.nombre.toLowerCase().includes(terminoLower) ||
    emp.codigo_interno.toLowerCase().includes(terminoLower) ||
    emp.ciudad.toLowerCase().includes(terminoLower) ||
    emp.sociedad_razon_social.toLowerCase().includes(terminoLower)
  );
};

// Validaciones
export const validarCambioEstado = (emprendimientoId, nuevoEstado) => {
  const emprendimiento = getEmprendimientoById(emprendimientoId);
  if (!emprendimiento) return { valido: false, mensaje: 'Emprendimiento no encontrado' };
  
  const estadoActual = emprendimiento.estado;
  
  // Reglas de transición de estados
  const transicionesValidas = {
    [ESTADO_EMPRENDIMIENTO.BORRADOR]: [ESTADO_EMPRENDIMIENTO.ACTIVO, ESTADO_EMPRENDIMIENTO.ARCHIVADO],
    [ESTADO_EMPRENDIMIENTO.ACTIVO]: [ESTADO_EMPRENDIMIENTO.SUSPENDIDO, ESTADO_EMPRENDIMIENTO.INACTIVO],
    [ESTADO_EMPRENDIMIENTO.SUSPENDIDO]: [ESTADO_EMPRENDIMIENTO.ACTIVO, ESTADO_EMPRENDIMIENTO.INACTIVO],
    [ESTADO_EMPRENDIMIENTO.INACTIVO]: [ESTADO_EMPRENDIMIENTO.ARCHIVADO],
    [ESTADO_EMPRENDIMIENTO.ARCHIVADO]: [] // No se puede cambiar desde archivado
  };
  
  const transicionesPermitidas = transicionesValidas[estadoActual] || [];
  
  if (!transicionesPermitidas.includes(nuevoEstado)) {
    return { 
      valido: false, 
      mensaje: `No se puede cambiar de ${ESTADO_EMPRENDIMIENTO_LABELS[estadoActual]} a ${ESTADO_EMPRENDIMIENTO_LABELS[nuevoEstado]}` 
    };
  }
  
  return { valido: true, mensaje: 'Cambio de estado válido' };
};