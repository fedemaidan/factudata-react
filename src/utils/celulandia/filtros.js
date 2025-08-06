/**
 * Filtra movimientos por fecha según el filtro seleccionado
 * @param {Array} movimientos - Array de movimientos a filtrar
 * @param {string} filtroFecha - Tipo de filtro: 'todos', 'hoy', 'estaSemana', 'esteMes', 'esteAño'
 * @returns {Array} - Array de movimientos filtrados por fecha
 */
export const filtrarPorFecha = (movimientos, filtroFecha) => {
  if (filtroFecha === "todos") {
    return movimientos;
  }

  const ahora = new Date();

  return movimientos.filter((mov) => {
    const fechaMov = new Date(mov.fecha);

    switch (filtroFecha) {
      case "hoy":
        return fechaMov.toDateString() === ahora.toDateString();

      case "estaSemana": {
        const inicioSemana = new Date(ahora);
        inicioSemana.setDate(ahora.getDate() - ahora.getDay());
        inicioSemana.setHours(0, 0, 0, 0);
        return fechaMov >= inicioSemana;
      }

      case "esteMes":
        return (
          fechaMov.getMonth() === ahora.getMonth() && fechaMov.getFullYear() === ahora.getFullYear()
        );

      case "esteAño":
        return fechaMov.getFullYear() === ahora.getFullYear();

      default:
        return true;
    }
  });
};

/**
 * Filtra movimientos por término de búsqueda
 * @param {Array} movimientos - Array de movimientos a filtrar
 * @param {string} busqueda - Término de búsqueda
 * @param {Array} campos - Array de nombres de campos a buscar
 * @returns {Array} - Array de movimientos filtrados por búsqueda
 */
export const filtrarPorBusqueda = (movimientos, busqueda, campos) => {
  if (!busqueda.trim()) {
    return movimientos;
  }

  const terminoBusqueda = busqueda.toLowerCase().trim();

  return movimientos.filter((mov) => {
    const valoresCampos = campos.map((campo) => {
      const valor = mov[campo];
      return valor ? valor.toString() : "";
    });

    return valoresCampos.some((valor) => valor.toLowerCase().includes(terminoBusqueda));
  });
};
