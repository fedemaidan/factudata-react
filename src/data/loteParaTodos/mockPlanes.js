// src/data/loteParaTodos/mockPlanes.js

export const mockPlanes = [
  {
    id: 1,
    nombre: 'Contado Efectivo',
    tipo: 'CONTADO',
    descripcion: 'Pago único al contado con descuento especial',
    activo: true,
    descuento_porcentaje: 15,
    cuotas_cantidad: 1,
    interes_mensual: 0,
    entrega_inicial_minima: 100,
    observaciones: 'Descuento del 15% sobre precio de lista'
  },
  {
    id: 2,
    nombre: 'Plan 60 Cuotas',
    tipo: 'FINANCIADO',
    descripcion: 'Financiación a 60 meses con tasa fija',
    activo: true,
    descuento_porcentaje: 0,
    cuotas_cantidad: 60,
    interes_mensual: 2.5,
    entrega_inicial_minima: 30,
    observaciones: 'Tasa fija del 2.5% mensual. Entrega mínima 30%'
  },
  {
    id: 3,
    nombre: 'Plan 36 Cuotas',
    tipo: 'FINANCIADO',
    descripcion: 'Financiación a 36 meses con tasa preferencial',
    activo: true,
    descuento_porcentaje: 5,
    cuotas_cantidad: 36,
    interes_mensual: 1.8,
    entrega_inicial_minima: 40,
    observaciones: 'Tasa del 1.8% mensual + 5% descuento por menor plazo'
  },
  {
    id: 4,
    nombre: 'Plan 24 Cuotas Premium',
    tipo: 'FINANCIADO',
    descripcion: 'Plan corto para clientes premium',
    activo: true,
    descuento_porcentaje: 8,
    cuotas_cantidad: 24,
    interes_mensual: 1.2,
    entrega_inicial_minima: 50,
    observaciones: 'Plan exclusivo con tasa promocional del 1.2%'
  },
  {
    id: 5,
    nombre: 'Plan 120 Cuotas',
    tipo: 'FINANCIADO',
    descripcion: 'Financiación extendida a 10 años',
    activo: true,
    descuento_porcentaje: -5,
    cuotas_cantidad: 120,
    interes_mensual: 3.2,
    entrega_inicial_minima: 25,
    observaciones: 'Plan largo con recargo del 5%. Tasa del 3.2% mensual'
  },
  {
    id: 6,
    nombre: 'Plan Empleados',
    tipo: 'ESPECIAL',
    descripcion: 'Plan exclusivo para empleados de la empresa',
    activo: true,
    descuento_porcentaje: 20,
    cuotas_cantidad: 48,
    interes_mensual: 1.0,
    entrega_inicial_minima: 20,
    observaciones: 'Beneficio especial: 20% descuento + tasa del 1% mensual'
  },
  {
    id: 7,
    nombre: '50% - 50%',
    tipo: 'MIXTO',
    descripcion: 'Mitad al contado, mitad financiado',
    activo: true,
    descuento_porcentaje: 8,
    cuotas_cantidad: 12,
    interes_mensual: 1.5,
    entrega_inicial_minima: 50,
    observaciones: '50% al contado (8% desc.) + 50% en 12 cuotas al 1.5%'
  },
  {
    id: 8,
    nombre: 'Plan Lanzamiento',
    tipo: 'PROMOCIONAL',
    descripcion: 'Promoción especial para nuevos emprendimientos',
    activo: false,
    descuento_porcentaje: 12,
    cuotas_cantidad: 30,
    interes_mensual: 1.0,
    entrega_inicial_minima: 35,
    observaciones: 'PLAN SUSPENDIDO - Era promoción de lanzamiento'
  }
];

export const mockCondicionesEspeciales = [
  {
    id: 1,
    nombre: 'Descuento Hermanos',
    tipo: 'DESCUENTO_FAMILIAR',
    descripcion: 'Descuento por compra de múltiples lotes en familia',
    activo: true,
    descuento_adicional: 3,
    condiciones: 'Mínimo 2 lotes, documentar parentesco'
  },
  {
    id: 2,
    nombre: 'Pronto Pago',
    tipo: 'DESCUENTO_TEMPORAL',
    descripcion: 'Descuento por pago adelantado de cuotas',
    activo: true,
    descuento_adicional: 2,
    condiciones: 'Pago de 6 meses adelantado'
  },
  {
    id: 3,
    nombre: 'Cliente VIP',
    tipo: 'DESCUENTO_FIDELIDAD',
    descripcion: 'Descuento para clientes recurrentes',
    activo: true,
    descuento_adicional: 5,
    condiciones: 'Cliente con compra anterior'
  },
  {
    id: 4,
    nombre: 'Referido',
    tipo: 'DESCUENTO_REFERENCIA',
    descripcion: 'Descuento por referencia de otro cliente',
    activo: true,
    descuento_adicional: 2,
    condiciones: 'Referencia documentada y verificada'
  }
];

export const getPlanById = (id) => {
  return mockPlanes.find(plan => plan.id === id);
};

export const getPlanesActivos = () => {
  return mockPlanes.filter(plan => plan.activo);
};

export const calcularFinanciacion = (precioBase, planId, condicionesEspeciales = []) => {
  const plan = getPlanById(planId);
  if (!plan) return null;
  
  // Aplicar descuento/recargo del plan
  let precioFinal = precioBase * (1 - (plan.descuento_porcentaje / 100));
  
  // Aplicar condiciones especiales
  let descuentoAdicional = 0;
  condicionesEspeciales.forEach(condicionId => {
    const condicion = mockCondicionesEspeciales.find(c => c.id === condicionId && c.activo);
    if (condicion) {
      descuentoAdicional += condicion.descuento_adicional;
    }
  });
  
  precioFinal = precioFinal * (1 - (descuentoAdicional / 100));
  
  // Calcular financiación
  const entregaMinima = precioFinal * (plan.entrega_inicial_minima / 100);
  
  if (plan.tipo === 'CONTADO') {
    return {
      plan: plan,
      precio_original: Math.round(precioBase),
      precio_final: Math.round(precioFinal),
      entrega_inicial: Math.round(precioFinal),
      monto_financiado: 0,
      cuota_mensual: 0,
      total_intereses: 0,
      total_a_pagar: Math.round(precioFinal),
      descuento_aplicado: Math.round((plan.descuento_porcentaje + descuentoAdicional) * 100) / 100
    };
  }
  
  // Para planes financiados
  let montoFinanciado, entregaInicial;
  
  if (plan.tipo === 'MIXTO') {
    // 50-50: mitad al contado, mitad financiado
    entregaInicial = precioFinal * 0.5;
    montoFinanciado = precioFinal * 0.5;
  } else {
    entregaInicial = entregaMinima;
    montoFinanciado = precioFinal - entregaInicial;
  }
  
  // Calcular cuota con interés compuesto
  const tasaMensual = plan.interes_mensual / 100;
  const cuotaMensual = montoFinanciado * (tasaMensual * Math.pow(1 + tasaMensual, plan.cuotas_cantidad)) / 
                      (Math.pow(1 + tasaMensual, plan.cuotas_cantidad) - 1);
  
  const totalCuotas = cuotaMensual * plan.cuotas_cantidad;
  const totalIntereses = totalCuotas - montoFinanciado;
  const totalAPagar = entregaInicial + totalCuotas;
  
  return {
    plan: plan,
    precio_original: Math.round(precioBase),
    precio_final: Math.round(precioFinal),
    entrega_inicial: Math.round(entregaInicial),
    monto_financiado: Math.round(montoFinanciado),
    cuota_mensual: Math.round(cuotaMensual),
    total_intereses: Math.round(totalIntereses),
    total_a_pagar: Math.round(totalAPagar),
    descuento_aplicado: Math.round((plan.descuento_porcentaje + descuentoAdicional) * 100) / 100,
    condiciones_aplicadas: condicionesEspeciales.map(id => 
      mockCondicionesEspeciales.find(c => c.id === id)?.nombre
    ).filter(Boolean)
  };
};

export const compararPlanes = (precioBase, planesIds = [], condicionesEspeciales = []) => {
  const planesActivos = planesIds.length > 0 ? 
    planesIds.map(id => getPlanById(id)).filter(Boolean) : 
    getPlanesActivos();
  
  return planesActivos.map(plan => calcularFinanciacion(precioBase, plan.id, condicionesEspeciales))
    .sort((a, b) => a.total_a_pagar - b.total_a_pagar);
};