export const getFechaArgentina = (fecha) => {
  if (!fecha) return null;

  // Si la fecha ya está en formato DD/M/YYYY, retornarla tal como está
  if (typeof fecha === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha)) {
    return fecha;
  }

  // Si es una fecha ISO o Date, convertirla
  try {
    const date = new Date(fecha);

    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      console.warn("Fecha inválida recibida:", fecha);
      return fecha; // Retornar el valor original si no se puede parsear
    }

    return date.toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
    });
  } catch (error) {
    console.warn("Error al convertir fecha:", fecha, error);
    return fecha; // Retornar el valor original en caso de error
  }
};

export const getFechaArgentinaISO = (fecha) => {
  if (!fecha) return null;

  const date = new Date(fecha);
  return date.toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
};

export const getHoraArgentina = (fecha) => {
  if (!fecha) return null;

  // Si la hora ya está en formato HH:MM, retornarla tal como está
  if (typeof fecha === "string" && /^\d{1,2}:\d{2}$/.test(fecha)) {
    return fecha;
  }

  // Si es una fecha ISO o Date, convertirla
  try {
    const date = new Date(fecha);

    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      console.warn("Fecha inválida recibida para hora:", fecha);
      return fecha; // Retornar el valor original si no se puede parsear
    }

    return date.toLocaleTimeString("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.warn("Error al convertir fecha a hora:", fecha, error);
    return fecha; // Retornar el valor original en caso de error
  }
};

export const getFechaHoraArgentina = (fecha) => {
  if (!fecha) return null;

  const date = new Date(fecha);
  return date.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const calcularFechasFiltro = (filtro) => {
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  switch (filtro) {
    case "hoy":
      return {
        fechaInicio: inicioHoy.toISOString().split("T")[0],
        fechaFin: inicioHoy.toISOString().split("T")[0],
      };
    case "estaSemana": {
      const inicioSemana = new Date(inicioHoy);
      inicioSemana.setDate(inicioHoy.getDate() - inicioHoy.getDay());
      return {
        fechaInicio: inicioSemana.toISOString().split("T")[0],
        fechaFin: inicioHoy.toISOString().split("T")[0],
      };
    }
    case "esteMes": {
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      return {
        fechaInicio: inicioMes.toISOString().split("T")[0],
        fechaFin: inicioHoy.toISOString().split("T")[0],
      };
    }
    case "esteAño": {
      const inicioAño = new Date(hoy.getFullYear(), 0, 1);
      return {
        fechaInicio: inicioAño.toISOString().split("T")[0],
        fechaFin: inicioHoy.toISOString().split("T")[0],
      };
    }
    default:
      return { fechaInicio: null, fechaFin: null };
  }
};
