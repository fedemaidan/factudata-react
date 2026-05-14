export const parsearTrabajadoresNoIdentificados = (observacion) => {
  if (!observacion || typeof observacion !== "string") return [];

  const prefix = "Trabajadores no identificados: ";
  const start = observacion.indexOf(prefix);
  if (start === -1) return [];

  const trabajadoresStr = observacion.slice(start + prefix.length).trim();
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

export const parsearConteoIdentificados = (observacion) => {
  if (!observacion || typeof observacion !== "string") return null;
  const match = observacion.match(/(?:Trabajadores\s+)?[Ii]dentificados:\s*(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;
  const encontrados = Number.parseInt(match[1], 10);
  const total = Number.parseInt(match[2], 10);
  if (!Number.isFinite(encontrados) || !Number.isFinite(total)) return null;
  return { encontrados, total, noEncontrados: Math.max(0, total - encontrados) };
};
