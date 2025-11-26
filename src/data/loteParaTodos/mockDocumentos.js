// src/data/loteParaTodos/mockDocumentos.js

export const TIPO_DOCUMENTO = {
  BOLETO: 'boleto',
  PAGARE: 'pagare',
  CONTRATO_SERVICIO: 'contrato_servicio',
  CONTRATO_PRESTAMO: 'contrato_prestamo',
  NOTA_EXTENSION: 'nota_extension',
  NOTA_RESCISION: 'nota_rescision',
  REGLAMENTO: 'reglamento',
  REFINANCIACION: 'refinanciacion',
  ACTA_ENTREGA: 'acta_entrega',
  COMPROBANTE_PAGO: 'comprobante_pago',
  RESERVA: 'reserva'
};

export const TIPO_DOCUMENTO_LABELS = {
  [TIPO_DOCUMENTO.BOLETO]: 'Boleto de Compraventa',
  [TIPO_DOCUMENTO.PAGARE]: 'Pagaré',
  [TIPO_DOCUMENTO.CONTRATO_SERVICIO]: 'Contrato de Servicio',
  [TIPO_DOCUMENTO.CONTRATO_PRESTAMO]: 'Contrato de Préstamo',
  [TIPO_DOCUMENTO.NOTA_EXTENSION]: 'Nota de Extensión',
  [TIPO_DOCUMENTO.NOTA_RESCISION]: 'Nota de Rescisión',
  [TIPO_DOCUMENTO.REGLAMENTO]: 'Reglamento del Emprendimiento',
  [TIPO_DOCUMENTO.REFINANCIACION]: 'Convenio de Refinanciación',
  [TIPO_DOCUMENTO.ACTA_ENTREGA]: 'Acta de Entrega',
  [TIPO_DOCUMENTO.COMPROBANTE_PAGO]: 'Comprobante de Pago',
  [TIPO_DOCUMENTO.RESERVA]: 'Reserva'
};

export const ESTADO_DOCUMENTO = {
  BORRADOR: 'borrador',
  GENERADO: 'generado',
  FIRMADO: 'firmado',
  ARCHIVADO: 'archivado',
  VENCIDO: 'vencido'
};

export const ESTADO_DOCUMENTO_LABELS = {
  [ESTADO_DOCUMENTO.BORRADOR]: 'Borrador',
  [ESTADO_DOCUMENTO.GENERADO]: 'Generado',
  [ESTADO_DOCUMENTO.FIRMADO]: 'Firmado',
  [ESTADO_DOCUMENTO.ARCHIVADO]: 'Archivado',
  [ESTADO_DOCUMENTO.VENCIDO]: 'Vencido'
};

export const mockDocumentos = [
  // Documentos del contrato 1 (Cliente 1 - Juan Carlos)
  {
    id: 1,
    contrato_id: 1,
    cliente_id: 1,
    lote_id: 1,
    tipo_documento: TIPO_DOCUMENTO.BOLETO,
    titulo: 'Boleto de Compraventa - Lote 1',
    descripcion: 'Boleto de compraventa del lote 1 del emprendimiento Los Aromos',
    file_url: '/docs/boletos/boleto_contrato_1_001.pdf',
    estado: ESTADO_DOCUMENTO.FIRMADO,
    fecha_generacion: '2023-03-15',
    fecha_firma: '2023-03-15',
    fecha_vencimiento: null,
    user_generacion: 'juan.perez',
    version: 1,
    observaciones: 'Documento original firmado por ambas partes'
  },
  {
    id: 2,
    contrato_id: 1,
    cliente_id: 1,
    lote_id: 1,
    tipo_documento: TIPO_DOCUMENTO.PAGARE,
    titulo: 'Pagaré - Contrato Lote 1',
    descripcion: 'Pagaré por el saldo del contrato del lote 1',
    file_url: '/docs/pagares/pagare_contrato_1_001.pdf',
    estado: ESTADO_DOCUMENTO.FIRMADO,
    fecha_generacion: '2023-03-15',
    fecha_firma: '2023-03-15',
    fecha_vencimiento: '2025-03-15',
    user_generacion: 'juan.perez',
    version: 1,
    observaciones: 'Pagaré por el monto restante del contrato'
  },
  {
    id: 3,
    contrato_id: 1,
    cliente_id: 1,
    lote_id: 1,
    tipo_documento: TIPO_DOCUMENTO.REGLAMENTO,
    titulo: 'Reglamento - Los Aromos',
    descripcion: 'Reglamento del emprendimiento Los Aromos',
    file_url: '/docs/reglamentos/reglamento_emprendimiento_1.pdf',
    estado: ESTADO_DOCUMENTO.ARCHIVADO,
    fecha_generacion: '2023-01-01',
    fecha_firma: null,
    fecha_vencimiento: null,
    user_generacion: 'admin',
    version: 2,
    observaciones: 'Reglamento actualizado - versión 2.0'
  },

  // Documentos del contrato 2 (Cliente 2 - Ana Rodríguez)
  {
    id: 4,
    contrato_id: 2,
    cliente_id: 2,
    lote_id: 4,
    tipo_documento: TIPO_DOCUMENTO.BOLETO,
    titulo: 'Boleto de Compraventa - Lote 4',
    descripcion: 'Boleto de compraventa del lote 4 del emprendimiento Villa del Sol',
    file_url: '/docs/boletos/boleto_contrato_2_001.pdf',
    estado: ESTADO_DOCUMENTO.FIRMADO,
    fecha_generacion: '2023-07-22',
    fecha_firma: '2023-07-22',
    fecha_vencimiento: null,
    user_generacion: 'maria.garcia',
    version: 1,
    observaciones: 'Primera compra de la cliente'
  },
  {
    id: 5,
    contrato_id: 2,
    cliente_id: 2,
    lote_id: 4,
    tipo_documento: TIPO_DOCUMENTO.CONTRATO_SERVICIO,
    titulo: 'Contrato Alambrado - Lote 4',
    descripcion: 'Contrato de servicio de alambrado perimetral',
    file_url: '/docs/servicios/contrato_servicio_alambrado_001.pdf',
    estado: ESTADO_DOCUMENTO.FIRMADO,
    fecha_generacion: '2023-08-10',
    fecha_firma: '2023-08-15',
    fecha_vencimiento: null,
    user_generacion: 'carlos.lopez',
    version: 1,
    observaciones: 'Servicio completado satisfactoriamente'
  },

  // Documentos del contrato 3 (Cliente 2 - Ana Rodríguez - segundo lote)
  {
    id: 6,
    contrato_id: 3,
    cliente_id: 2,
    lote_id: 7,
    tipo_documento: TIPO_DOCUMENTO.BOLETO,
    titulo: 'Boleto de Compraventa - Lote 7',
    descripcion: 'Boleto de compraventa del lote 7 del emprendimiento Bella Vista',
    file_url: '/docs/boletos/boleto_contrato_3_001.pdf',
    estado: ESTADO_DOCUMENTO.FIRMADO,
    fecha_generacion: '2024-01-10',
    fecha_firma: '2024-01-10',
    fecha_vencimiento: null,
    user_generacion: 'maria.garcia',
    version: 1,
    observaciones: 'Segunda compra de la cliente - cliente fiel'
  },
  {
    id: 7,
    contrato_id: 3,
    cliente_id: 2,
    lote_id: 7,
    tipo_documento: TIPO_DOCUMENTO.CONTRATO_PRESTAMO,
    titulo: 'Contrato de Préstamo - Mejoras Lote 7',
    descripcion: 'Contrato de préstamo para mejoras del lote 7',
    file_url: '/docs/prestamos/contrato_prestamo_001.pdf',
    estado: ESTADO_DOCUMENTO.FIRMADO,
    fecha_generacion: '2024-01-20',
    fecha_firma: '2024-02-01',
    fecha_vencimiento: '2024-08-01',
    user_generacion: 'maria.garcia',
    version: 1,
    observaciones: 'Préstamo para construcción de galpón'
  },

  // Documentos del contrato 4 (Cliente 3 - Pedro Martínez)
  {
    id: 8,
    contrato_id: 4,
    cliente_id: 3,
    lote_id: 12,
    tipo_documento: TIPO_DOCUMENTO.BOLETO,
    titulo: 'Boleto de Compraventa - Lote 12',
    descripcion: 'Boleto de compraventa del lote 12 - pago contado',
    file_url: '/docs/boletos/boleto_contrato_4_001.pdf',
    estado: ESTADO_DOCUMENTO.FIRMADO,
    fecha_generacion: '2023-08-15',
    fecha_firma: '2023-08-15',
    fecha_vencimiento: null,
    user_generacion: 'carlos.lopez',
    version: 1,
    observaciones: 'Pago contado completo - sin financiación'
  },
  {
    id: 9,
    contrato_id: 4,
    cliente_id: 3,
    lote_id: 12,
    tipo_documento: TIPO_DOCUMENTO.ACTA_ENTREGA,
    titulo: 'Acta de Entrega - Lote 12',
    descripcion: 'Acta de entrega formal del lote 12 al propietario',
    file_url: '/docs/actas/acta_entrega_lote_12.pdf',
    estado: ESTADO_DOCUMENTO.FIRMADO,
    fecha_generacion: '2023-08-15',
    fecha_firma: '2023-08-15',
    fecha_vencimiento: null,
    user_generacion: 'carlos.lopez',
    version: 1,
    observaciones: 'Entrega inmediata por pago contado'
  },

  // Documentos de refinanciación (ejemplo)
  {
    id: 10,
    contrato_id: 2,
    cliente_id: 2,
    lote_id: 4,
    tipo_documento: TIPO_DOCUMENTO.REFINANCIACION,
    titulo: 'Convenio de Refinanciación - Lote 4',
    descripcion: 'Convenio de refinanciación por actualización de índices',
    file_url: '/docs/refinanciaciones/refinanciacion_contrato_2_001.pdf',
    estado: ESTADO_DOCUMENTO.GENERADO,
    fecha_generacion: '2024-03-01',
    fecha_firma: null,
    fecha_vencimiento: '2024-03-31',
    user_generacion: 'admin',
    version: 1,
    observaciones: 'Pendiente de firma del cliente'
  },

  // Comprobantes de pago (ejemplos)
  {
    id: 11,
    contrato_id: 1,
    cliente_id: 1,
    lote_id: 1,
    tipo_documento: TIPO_DOCUMENTO.COMPROBANTE_PAGO,
    titulo: 'Comprobante de Pago - Cuota 1',
    descripcion: 'Comprobante de pago de la primera cuota',
    file_url: '/docs/comprobantes/comprobante_pago_001.pdf',
    estado: ESTADO_DOCUMENTO.ARCHIVADO,
    fecha_generacion: '2023-03-15',
    fecha_firma: null,
    fecha_vencimiento: null,
    user_generacion: 'sistema',
    version: 1,
    observaciones: 'Generado automáticamente al registrar el pago'
  },
  {
    id: 12,
    contrato_id: 2,
    cliente_id: 2,
    lote_id: 4,
    tipo_documento: TIPO_DOCUMENTO.COMPROBANTE_PAGO,
    titulo: 'Comprobante de Pago - Servicio Alambrado',
    descripcion: 'Comprobante de pago del servicio de alambrado',
    file_url: '/docs/comprobantes/comprobante_servicio_001.pdf',
    estado: ESTADO_DOCUMENTO.ARCHIVADO,
    fecha_generacion: '2023-08-15',
    fecha_firma: null,
    fecha_vencimiento: null,
    user_generacion: 'sistema',
    version: 1,
    observaciones: 'Pago del servicio de alambrado perimetral'
  }
];

export const mockPlantillas = [
  {
    id: 1,
    emprendimiento_id: 1,
    tipo_documento: TIPO_DOCUMENTO.BOLETO,
    nombre: 'Plantilla Boleto Estándar 2025',
    descripcion: 'Modelo de boleto para ventas en cuotas',
    archivo: 'plantilla_boleto_v2.docx',
    fecha_subida: '2025-01-10',
    usuario_subida: 'admin',
    version: 2,
    variables: ['cliente.nombre', 'cliente.dni', 'lote.numero', 'lote.superficie', 'contrato.precio_total']
  },
  {
    id: 2,
    emprendimiento_id: 1,
    tipo_documento: TIPO_DOCUMENTO.RESERVA,
    nombre: 'Formulario de Reserva',
    descripcion: 'Documento para formalizar la reserva',
    archivo: 'plantilla_reserva_v1.docx',
    fecha_subida: '2024-12-01',
    usuario_subida: 'admin',
    version: 1,
    variables: ['cliente.nombre', 'lote.numero', 'reserva.monto']
  },
  {
    id: 3,
    emprendimiento_id: 2,
    tipo_documento: TIPO_DOCUMENTO.BOLETO,
    nombre: 'Boleto Aires del Sur',
    descripcion: 'Boleto específico para Aires del Sur',
    archivo: 'boleto_aires_v1.docx',
    fecha_subida: '2024-11-15',
    usuario_subida: 'juan.perez',
    version: 1,
    variables: ['cliente.nombre', 'lote.numero', 'contrato.precio_total']
  }
];

// Funciones auxiliares para consultar documentos
export const getPlantillasByEmprendimiento = (emprendimientoId) => {
  return mockPlantillas.filter(p => p.emprendimiento_id === emprendimientoId);
};

export const getDocumentosByContrato = (contratoId) => {
  return mockDocumentos.filter(d => d.contrato_id === contratoId);
};

export const getDocumentosByCliente = (clienteId) => {
  return mockDocumentos.filter(doc => doc.cliente_id === clienteId);
};

export const getDocumentosByLote = (loteId) => {
  return mockDocumentos.filter(doc => doc.lote_id === loteId);
};

export const getDocumentosByTipo = (tipoDocumento) => {
  return mockDocumentos.filter(doc => doc.tipo_documento === tipoDocumento);
};

export const getDocumentosVencidos = () => {
  const hoy = new Date().toISOString().split('T')[0];
  return mockDocumentos.filter(doc => 
    doc.fecha_vencimiento && 
    doc.fecha_vencimiento < hoy && 
    doc.estado !== ESTADO_DOCUMENTO.ARCHIVADO
  );
};

export const getDocumentosPendientesFirma = () => {
  return mockDocumentos.filter(doc => 
    doc.estado === ESTADO_DOCUMENTO.GENERADO &&
    !doc.fecha_firma
  );
};

export const generarUrlDocumento = (documento) => {
  // En producción, esto generaría una URL firmada temporalmente
  // Para desarrollo, devolver la URL fake
  return `${window.location.origin}${documento.file_url}`; 
};

export const getDocumentosRequiredByContrato = (contratoId) => {
  // Documentos mínimos requeridos por contrato
  const documentosRequeridos = [
    TIPO_DOCUMENTO.BOLETO,
    TIPO_DOCUMENTO.PAGARE,
    TIPO_DOCUMENTO.REGLAMENTO
  ];
  
  const documentosExistentes = getDocumentosByContrato(contratoId);
  const tiposExistentes = documentosExistentes.map(doc => doc.tipo_documento);
  
  const documentosFaltantes = documentosRequeridos.filter(tipo => 
    !tiposExistentes.includes(tipo)
  );
  
  return {
    requeridos: documentosRequeridos,
    existentes: documentosExistentes,
    faltantes: documentosFaltantes,
    porcentaje_completitud: ((documentosRequeridos.length - documentosFaltantes.length) / documentosRequeridos.length) * 100
  };
};

export const crearNuevoDocumento = (datosDocumento) => {
  // Función para crear un nuevo documento (mock)
  const nuevoId = Math.max(...mockDocumentos.map(d => d.id)) + 1;
  
  const documentoNuevo = {
    id: nuevoId,
    ...datosDocumento,
    fecha_generacion: new Date().toISOString().split('T')[0],
    estado: ESTADO_DOCUMENTO.BORRADOR,
    version: 1,
    user_generacion: 'usuario_actual' // En producción vendría del contexto de usuario
  };
  
  // En un sistema real, aquí se haría la llamada a la API
  console.log('Nuevo documento creado:', documentoNuevo);
  
  return documentoNuevo;
};

export const getEstadisticasDocumentos = () => {
  const totalDocumentos = mockDocumentos.length;
  const firmados = mockDocumentos.filter(d => d.estado === ESTADO_DOCUMENTO.FIRMADO).length;
  const pendientes = mockDocumentos.filter(d => d.estado === ESTADO_DOCUMENTO.GENERADO).length;
  const vencidos = getDocumentosVencidos().length;
  
  const porTipo = {};
  Object.values(TIPO_DOCUMENTO).forEach(tipo => {
    porTipo[tipo] = mockDocumentos.filter(d => d.tipo_documento === tipo).length;
  });
  
  return {
    total_documentos: totalDocumentos,
    firmados,
    pendientes_firma: pendientes,
    vencidos,
    por_tipo: porTipo,
    porcentaje_firmados: totalDocumentos > 0 ? (firmados / totalDocumentos) * 100 : 0
  };
};