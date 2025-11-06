// src/data/loteParaTodos/mockPrecios.js

export const mockHistorialPrecios = [
  // CERRO VERDE I - Actualizaciones de precios
  { id: 1, lote_id: 1, precio: 20000, fecha_inicio: '2023-01-01', fecha_fin: '2023-02-28', motivo: 'Precio inicial de lanzamiento' },
  { id: 2, lote_id: 1, precio: 25000, fecha_inicio: '2023-03-01', fecha_fin: null, motivo: 'Ajuste por inflación y mejoras en infraestructura' },
  
  { id: 3, lote_id: 2, precio: 18000, fecha_inicio: '2023-01-01', fecha_fin: '2023-02-28', motivo: 'Precio inicial de lanzamiento' },
  { id: 4, lote_id: 2, precio: 22000, fecha_inicio: '2023-03-01', fecha_fin: null, motivo: 'Ajuste por inflación y mejoras' },
  
  { id: 5, lote_id: 3, precio: 17500, fecha_inicio: '2023-01-01', fecha_fin: '2023-02-28', motivo: 'Precio inicial de lanzamiento' },
  { id: 6, lote_id: 3, precio: 21000, fecha_inicio: '2023-03-01', fecha_fin: null, motivo: 'Ajuste por inflación' },
  
  // LOTEO NORTE PREMIUM - Precios premium con ajustes
  { id: 7, lote_id: 11, precio: 40000, fecha_inicio: '2023-06-01', fecha_fin: '2023-07-31', motivo: 'Precio de lanzamiento premium' },
  { id: 8, lote_id: 11, precio: 45000, fecha_inicio: '2023-08-01', fecha_fin: null, motivo: 'Ajuste por alta demanda en zona premium' },
  
  { id: 9, lote_id: 12, precio: 38000, fecha_inicio: '2023-06-01', fecha_fin: '2023-07-31', motivo: 'Precio de lanzamiento' },
  { id: 10, lote_id: 12, precio: 43000, fecha_inicio: '2023-08-01', fecha_fin: null, motivo: 'Ajuste por valorización de zona' },
  
  // LOS ROBLES COUNTRY - Precios de lujo con incrementos graduales
  { id: 11, lote_id: 19, precio: 75000, fecha_inicio: '2022-09-01', fecha_fin: '2022-12-31', motivo: 'Precio inicial country club' },
  { id: 12, lote_id: 19, precio: 80000, fecha_inicio: '2023-01-01', fecha_fin: '2023-06-30', motivo: 'Ajuste semestral' },
  { id: 13, lote_id: 19, precio: 85000, fecha_inicio: '2023-07-01', fecha_fin: null, motivo: 'Valorización por amenities completados' },
  
  { id: 14, lote_id: 22, precio: 120000, fecha_inicio: '2022-09-01', fecha_fin: '2022-12-31', motivo: 'Precio lote premium con vista al lago' },
  { id: 15, lote_id: 22, precio: 130000, fecha_inicio: '2023-01-01', fecha_fin: '2023-06-30', motivo: 'Ajuste por exclusividad' },
  { id: 16, lote_id: 22, precio: 140000, fecha_inicio: '2023-07-01', fecha_fin: null, motivo: 'Valorización final antes de venta' },
  
  // HORIZONTE I - Precios tecnológicos con incrementos por innovación
  { id: 17, lote_id: 26, precio: 45000, fecha_inicio: '2024-02-01', fecha_fin: '2024-02-29', motivo: 'Precio de preventa con descuento' },
  { id: 18, lote_id: 26, precio: 48000, fecha_inicio: '2024-03-01', fecha_fin: null, motivo: 'Precio regular con tecnología incluida' }
];

export const mockListaPrecios = [
  {
    id: 1,
    nombre: 'Lista Base 2024',
    activa: true,
    fecha_vigencia_desde: '2024-01-01',
    fecha_vigencia_hasta: null,
    descripcion: 'Lista de precios base para el año 2024',
    factores: {
      esquina: 1.15,           // 15% adicional por lote esquina
      doble_frente: 1.20,      // 20% adicional por doble frente
      vista_especial: 1.10,    // 10% adicional por vista especial
      frente_amplio: 1.08,     // 8% adicional por frente amplio (>15m)
      irregular: 0.95,         // 5% descuento por forma irregular
      superficie_extra: {      // Factor por superficie
        hasta_300: 1.00,
        _301_500: 1.05,
        _501_800: 1.12,
        mas_800: 1.25
      }
    }
  },
  {
    id: 2,
    nombre: 'Lista Promocional Q1',
    activa: false,
    fecha_vigencia_desde: '2024-01-01',
    fecha_vigencia_hasta: '2024-03-31',
    descripcion: 'Lista promocional primer trimestre 2024',
    factores: {
      esquina: 1.10,
      doble_frente: 1.15,
      vista_especial: 1.08,
      frente_amplio: 1.05,
      irregular: 0.92,
      superficie_extra: {
        hasta_300: 0.95,
        _301_500: 1.00,
        _501_800: 1.08,
        mas_800: 1.20
      }
    }
  }
];

export const getPrecioActualLote = (loteId) => {
  const precios = mockHistorialPrecios.filter(p => p.lote_id === loteId);
  const precioActual = precios.find(p => p.fecha_fin === null);
  return precioActual || null;
};

export const getHistorialPreciosLote = (loteId) => {
  return mockHistorialPrecios
    .filter(p => p.lote_id === loteId)
    .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio));
};

export const calcularPrecioConFactores = (precioBase, caracteristicas = {}) => {
  const listaActiva = mockListaPrecios.find(l => l.activa);
  if (!listaActiva) return precioBase;
  
  let factor = 1;
  
  // Factores especiales del lote
  if (caracteristicas.esquina) factor *= listaActiva.factores.esquina;
  if (caracteristicas.doble_frente) factor *= listaActiva.factores.doble_frente;
  if (caracteristicas.vista_especial) factor *= listaActiva.factores.vista_especial;
  if (caracteristicas.frente_amplio) factor *= listaActiva.factores.frente_amplio;
  if (caracteristicas.irregular) factor *= listaActiva.factores.irregular;
  
  // Factor por superficie
  if (caracteristicas.superficie) {
    const superficie = caracteristicas.superficie;
    if (superficie <= 300) {
      factor *= listaActiva.factores.superficie_extra.hasta_300;
    } else if (superficie <= 500) {
      factor *= listaActiva.factores.superficie_extra._301_500;
    } else if (superficie <= 800) {
      factor *= listaActiva.factores.superficie_extra._501_800;
    } else {
      factor *= listaActiva.factores.superficie_extra.mas_800;
    }
  }
  
  return Math.round(precioBase * factor);
};

export const actualizarPrecioLote = (loteId, nuevoPrecio, motivo) => {
  // Finalizar precio actual
  const precioActual = getPrecioActualLote(loteId);
  if (precioActual) {
    precioActual.fecha_fin = new Date().toISOString().split('T')[0];
  }
  
  // Crear nuevo registro
  const nuevoRegistro = {
    id: mockHistorialPrecios.length + 1,
    lote_id: loteId,
    precio: nuevoPrecio,
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: null,
    motivo: motivo
  };
  
  mockHistorialPrecios.push(nuevoRegistro);
  return nuevoRegistro;
};

export const getEvolucionPrecios = (emprendimientoId = null, fechaDesde = null, fechaHasta = null) => {
  let precios = [...mockHistorialPrecios];
  
  // Filtrar por emprendimiento si se especifica
  if (emprendimientoId) {
    // Necesitaríamos importar mockLotes para filtrar, por simplicidad asumimos que se pasa
    // precios = precios.filter(p => lote.emprendimiento_id === emprendimientoId);
  }
  
  // Filtrar por fechas
  if (fechaDesde) {
    precios = precios.filter(p => p.fecha_inicio >= fechaDesde);
  }
  
  if (fechaHasta) {
    precios = precios.filter(p => p.fecha_inicio <= fechaHasta);
  }
  
  // Agrupar por mes para análisis de tendencias
  const evolucion = precios.reduce((acc, precio) => {
    const mes = precio.fecha_inicio.substring(0, 7); // YYYY-MM
    if (!acc[mes]) {
      acc[mes] = {
        mes: mes,
        cantidad_actualizaciones: 0,
        precio_promedio: 0,
        precio_minimo: Infinity,
        precio_maximo: 0,
        precios: []
      };
    }
    
    acc[mes].cantidad_actualizaciones++;
    acc[mes].precios.push(precio.precio);
    acc[mes].precio_minimo = Math.min(acc[mes].precio_minimo, precio.precio);
    acc[mes].precio_maximo = Math.max(acc[mes].precio_maximo, precio.precio);
    
    return acc;
  }, {});
  
  // Calcular promedios
  Object.values(evolucion).forEach(mes => {
    mes.precio_promedio = Math.round(
      mes.precios.reduce((sum, p) => sum + p, 0) / mes.precios.length
    );
    delete mes.precios; // Limpiar array temporal
  });
  
  return Object.values(evolucion).sort((a, b) => a.mes.localeCompare(b.mes));
};

export const simularAjustePorInflacion = (porcentajeAjuste, emprendimientoId = null, motivo = 'Ajuste por inflación') => {
  const lotesAActualizar = emprendimientoId ? 
    mockHistorialPrecios.filter(p => p.fecha_fin === null) : // Simplificado
    mockHistorialPrecios.filter(p => p.fecha_fin === null);
  
  const actualizaciones = [];
  
  lotesAActualizar.forEach(precio => {
    const nuevoPrecio = Math.round(precio.precio * (1 + porcentajeAjuste / 100));
    const actualizacion = actualizarPrecioLote(precio.lote_id, nuevoPrecio, motivo);
    actualizaciones.push(actualizacion);
  });
  
  return {
    lotes_actualizados: actualizaciones.length,
    porcentaje_aplicado: porcentajeAjuste,
    actualizaciones: actualizaciones
  };
};