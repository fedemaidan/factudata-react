export function calcularTotalUF(unidad) {
    const valorUF = parseFloat(unidad.valor_uf) || 0;
    const valorCochera = parseFloat(unidad.valor_cochera) || 0;
    return valorUF + valorCochera;
  }
  
  export function calcularRentabilidad(unidad) {
    const totalUF = calcularTotalUF(unidad);
    const alquilerMensual = parseFloat(unidad.alquiler_mensual) || 0;
    if (totalUF === 0) return 0;
    return (alquilerMensual * 12 * 100) / totalUF;
  }
  