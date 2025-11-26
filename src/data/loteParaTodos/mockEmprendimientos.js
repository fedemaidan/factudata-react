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

const buildEmprendimiento = ({
  id,
  nombre,
  codigo_interno,
  abreviatura,
  ciudad,
  provincia = 'Buenos Aires',
  direccion = 'Sin dirección definida',
  coordenadas = { lat: -34.6037, lng: -58.3816 },
  estado = ESTADO_EMPRENDIMIENTO.ACTIVO,
  superficie_total_hectareas = 25,
  cantidad_lotes_total = 100,
  valor_m2_base = 15000,
  tipo_precio_default = TIPO_PRECIO.POR_M2,
  indice_actualizacion_default = INDICE_ACTUALIZACION.IPC,
  lotes_disponibles = 30,
  lotes_vendidos = 50,
  lotes_reservados = 10,
  lotes_bloqueados = 10,
  descripcion,
  observaciones,
  municipio,
  masterPlanSlug,
  fecha_lanzamiento = '2023-06-01',
  fecha_entrega_estimada = '2026-12-31',
  permite_reservas = true,
  permite_ventas = true,
  requiere_aprobacion_gerencia = false
}) => {
  const slug = masterPlanSlug || codigo_interno.toLowerCase();
  const municipioSlug = municipio || (ciudad ? ciudad.toLowerCase().replace(/\s+/g, '_') : 'buenos_aires');

  return {
    id,
    nombre,
    codigo_interno,
    abreviatura: abreviatura || codigo_interno,
    descripcion: descripcion || `Desarrollo ${nombre} orientado a vivienda familiar y convenios con gremios.`,
    sociedad_razon_social: 'Factudata Desarrollos S.A.',
    cuit: '30-71458236-9',
    provincia,
    ciudad,
    direccion,
    coordenadas,
    moneda_principal: 'ARS',
    indice_actualizacion_default,
    dia_vencimiento_default: 10,
    superficie_total_hectareas,
    cantidad_lotes_total,
    valor_m2_base,
    tipo_precio_default,
    estado,
    fecha_creacion: '2023-01-15',
    fecha_lanzamiento,
    fecha_entrega_estimada,
    fecha_ultima_actualizacion: '2025-11-15',
    permite_reservas,
    permite_ventas,
    requiere_aprobacion_gerencia,
    desarrollador: {
      nombre: 'Equipo Factudata',
      contacto: 'Oficina Comercial',
      telefono: '+54 9 11 4000-0000',
      email: 'comercial@factudata.com'
    },
    servicios_incluidos: ['luz', 'agua_corriente', 'calles_mejoradas'],
    servicios_opcionales: ['gas_natural', 'fibra_optica'],
    documentos_requeridos: ['boleto', 'contrato', 'reglamento'],
    master_plan_url: `/documentos/emprendimientos/${slug}/master-plan.pdf`,
    master_plan_imagen: `/images/emprendimientos/${slug}/plano-general.jpg`,
    documentos_reglamento: [
      { nombre: 'Reglamento General', url: `/documentos/emprendimientos/${slug}/reglamento.pdf` },
      { nombre: 'Memoria Descriptiva', url: `/documentos/emprendimientos/${slug}/memoria.pdf` }
    ],
    municipio: municipioSlug,
    url_deuda_municipal_base: `https://${municipioSlug}.gob.ar/consulta-partida/`,
    lotes_disponibles,
    lotes_vendidos,
    lotes_reservados,
    lotes_bloqueados,
    observaciones: observaciones || 'Datos de muestra alineados al catálogo oficial de emprendimientos.',
    creado_por: 'mock-admin',
    modificado_por: 'mock-admin'
  };
};

export const mockEmprendimientos = [
  buildEmprendimiento({
    id: 1,
    nombre: 'Cerro Rico 1',
    codigo_interno: 'CR1',
    ciudad: 'La Matanza',
    direccion: 'Ruta Provincial 21 Km 35',
    coordenadas: { lat: -34.766, lng: -58.564 },
    superficie_total_hectareas: 52,
    cantidad_lotes_total: 240,
    valor_m2_base: 16500,
    lotes_disponibles: 80,
    lotes_vendidos: 140,
    lotes_reservados: 15,
    lotes_bloqueados: 5,
    observaciones: 'Primera etapa enfocada en convenios con sindicatos metalúrgicos.',
    municipio: 'la_matanza'
  }),
  buildEmprendimiento({
    id: 2,
    nombre: 'Cerro Rico 2',
    codigo_interno: 'CR2',
    ciudad: 'La Matanza',
    direccion: 'Ruta Provincial 21 Km 37',
    coordenadas: { lat: -34.772, lng: -58.571 },
    superficie_total_hectareas: 48,
    cantidad_lotes_total: 210,
    valor_m2_base: 17000,
    lotes_disponibles: 70,
    lotes_vendidos: 120,
    lotes_reservados: 12,
    lotes_bloqueados: 8,
    observaciones: 'Incluye amenities y centro de ventas propio.'
  }),
  buildEmprendimiento({
    id: 3,
    nombre: 'Cerro Rico 2 Etapa 2',
    codigo_interno: 'CR2E2',
    ciudad: 'La Matanza',
    direccion: 'Ruta Provincial 21 Km 38',
    estado: ESTADO_EMPRENDIMIENTO.BORRADOR,
    superficie_total_hectareas: 30,
    cantidad_lotes_total: 140,
    valor_m2_base: 17200,
    lotes_disponibles: 140,
    lotes_vendidos: 0,
    lotes_reservados: 0,
    lotes_bloqueados: 0,
    observaciones: 'Expansión en proceso de aprobación municipal.'
  }),
  buildEmprendimiento({
    id: 4,
    nombre: 'Moreno',
    codigo_interno: 'MO',
    ciudad: 'Moreno',
    direccion: 'Av. Mitre 2100',
    coordenadas: { lat: -34.6504, lng: -58.7915 },
    superficie_total_hectareas: 65,
    cantidad_lotes_total: 310,
    valor_m2_base: 14000,
    lotes_disponibles: 150,
    lotes_vendidos: 130,
    lotes_reservados: 20,
    lotes_bloqueados: 10,
    descripcion: 'Plan maestro urbano para el corredor Oeste.'
  }),
  buildEmprendimiento({
    id: 5,
    nombre: 'La Glorieta 1',
    codigo_interno: 'LG1',
    abreviatura: 'LG',
    ciudad: 'San Miguel',
    direccion: 'Av. Balbín 950',
    superficie_total_hectareas: 22,
    cantidad_lotes_total: 120,
    valor_m2_base: 15500,
    lotes_disponibles: 55,
    lotes_vendidos: 55,
    lotes_reservados: 5,
    lotes_bloqueados: 5,
    descripcion: 'Primera etapa residencial del complejo La Glorieta.'
  }),
  buildEmprendimiento({
    id: 6,
    nombre: 'La Glorieta 2',
    codigo_interno: 'LG2',
    abreviatura: 'LG',
    ciudad: 'San Miguel',
    direccion: 'Av. Balbín 980',
    estado: ESTADO_EMPRENDIMIENTO.SUSPENDIDO,
    superficie_total_hectareas: 18,
    cantidad_lotes_total: 90,
    valor_m2_base: 15800,
    lotes_disponibles: 90,
    lotes_vendidos: 0,
    lotes_reservados: 0,
    lotes_bloqueados: 0,
    observaciones: 'Suspendido temporalmente por actualización de planos estructurales.'
  }),
  buildEmprendimiento({
    id: 7,
    nombre: 'Cerro Rico 3',
    codigo_interno: 'CR3',
    ciudad: 'La Matanza',
    direccion: 'Ruta 3 Km 40',
    superficie_total_hectareas: 60,
    cantidad_lotes_total: 260,
    valor_m2_base: 18000,
    lotes_disponibles: 90,
    lotes_vendidos: 150,
    lotes_reservados: 15,
    lotes_bloqueados: 5
  }),
  buildEmprendimiento({
    id: 8,
    nombre: 'Nuevo Horizonte',
    codigo_interno: 'NH',
    ciudad: 'Merlo',
    direccion: 'Camino de la Ribera 1500',
    superficie_total_hectareas: 38,
    cantidad_lotes_total: 160,
    valor_m2_base: 13500,
    lotes_disponibles: 60,
    lotes_vendidos: 80,
    lotes_reservados: 10,
    lotes_bloqueados: 10
  }),
  buildEmprendimiento({
    id: 9,
    nombre: 'Parque Central',
    codigo_interno: 'PC',
    ciudad: 'Pilar',
    direccion: 'Colectora Oeste Km 52',
    superficie_total_hectareas: 70,
    cantidad_lotes_total: 320,
    valor_m2_base: 19000,
    lotes_disponibles: 120,
    lotes_vendidos: 170,
    lotes_reservados: 20,
    lotes_bloqueados: 10,
    descripcion: 'Mix de lotes residenciales y comerciales con servicios premium.'
  }),
  buildEmprendimiento({
    id: 10,
    nombre: 'Pinares del Casco',
    codigo_interno: 'PI',
    ciudad: 'Escobar',
    direccion: 'Ruta 25 Km 8',
    superficie_total_hectareas: 44,
    cantidad_lotes_total: 180,
    valor_m2_base: 17500,
    estado: ESTADO_EMPRENDIMIENTO.INACTIVO,
    lotes_disponibles: 0,
    lotes_vendidos: 150,
    lotes_reservados: 10,
    lotes_bloqueados: 20,
    observaciones: 'Inactivo hasta completar la actualización de infraestructura pluvial.'
  }),
  buildEmprendimiento({
    id: 11,
    nombre: 'El Portal',
    codigo_interno: 'EP',
    ciudad: 'Luján',
    direccion: 'Ruta Nacional 7 Km 80',
    superficie_total_hectareas: 36,
    cantidad_lotes_total: 150,
    valor_m2_base: 14500,
    lotes_disponibles: 70,
    lotes_vendidos: 60,
    lotes_reservados: 10,
    lotes_bloqueados: 10
  }),
  buildEmprendimiento({
    id: 12,
    nombre: 'Parque Bicentenario',
    codigo_interno: 'PB',
    ciudad: 'Ituzaingó',
    direccion: 'Av. Ratti 5100',
    superficie_total_hectareas: 55,
    cantidad_lotes_total: 230,
    valor_m2_base: 15000,
    estado: ESTADO_EMPRENDIMIENTO.SUSPENDIDO,
    lotes_disponibles: 230,
    lotes_vendidos: 0,
    lotes_reservados: 0,
    lotes_bloqueados: 0,
    observaciones: 'Suspendido por revisión ambiental solicitada por el municipio.'
  }),
  buildEmprendimiento({
    id: 13,
    nombre: 'La Fraternidad',
    codigo_interno: 'LF',
    ciudad: 'General Rodríguez',
    direccion: 'Camino a Navarro Km 12',
    superficie_total_hectareas: 40,
    cantidad_lotes_total: 170,
    valor_m2_base: 14200,
    lotes_disponibles: 90,
    lotes_vendidos: 60,
    lotes_reservados: 10,
    lotes_bloqueados: 10,
    observaciones: 'Orientado a convenios ferroviarios del sindicato La Fraternidad.'
  }),
  buildEmprendimiento({
    id: 14,
    nombre: 'Vaca Muerta',
    codigo_interno: 'VM',
    ciudad: 'Añelo',
    provincia: 'Neuquén',
    direccion: 'Ruta Provincial 17 Km 10',
    coordenadas: { lat: -38.1913, lng: -68.7971 },
    superficie_total_hectareas: 120,
    cantidad_lotes_total: 400,
    valor_m2_base: 21000,
    tipo_precio_default: TIPO_PRECIO.FIJO,
    lotes_disponibles: 220,
    lotes_vendidos: 150,
    lotes_reservados: 20,
    lotes_bloqueados: 10,
    observaciones: 'Desarrollo industrial asociado a operadores petroleros.'
  })
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