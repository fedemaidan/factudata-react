export const parsearTrabajadoresNoIdentificados = (observacion) => {
  if (!observacion || typeof observacion !== "string") return [];

  const prefix = "Trabajadores no identificados: ";
  if (!observacion.startsWith(prefix)) return [];

  const trabajadoresStr = observacion.slice(prefix.length).trim();
  if (!trabajadoresStr) return [];

  const trabajadores = trabajadoresStr
    .split(",")
    .map((parte) => {
      const trimmed = parte.trim();
      const match = trimmed.match(/^(.+?)\s+\((\d+)\)$/);
      if (!match) return null;

      const nombreCompleto = match[1].trim();
      const dni = match[2].trim();
      const partesNombre = nombreCompleto.split(/\s+/);
      if (partesNombre.length >= 2) {
        const apellido = partesNombre[partesNombre.length - 1];
        const nombre = partesNombre.slice(0, -1).join(" ");
        return { nombre, apellido, dni };
      }

      return { nombre: "", apellido: nombreCompleto, dni };
    })
    .filter(Boolean);

  return trabajadores;
};
