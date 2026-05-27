export const DOCUMENTOS = [
  { key: "parte", tipoBackend: "parte", label: "Partes", accentColor: "#1976d2" },
  { key: "licencia", tipoBackend: "licencia", label: "Licencias", accentColor: "#7b1fa2" },
  { key: "horas", tipoBackend: "horas", label: "Fichadas", accentColor: "#00838f" },
];

const ERROR_DUPLICADO = {
  key: "duplicado",
  label: "Duplicados",
  accentColor: "#ed6c02",
  filtros: { estado: "duplicado" },
};

export const ERRORES_POR_DOCUMENTO = {
  parte: [
    ERROR_DUPLICADO,
    {
      key: "faltaTrabajador",
      label: "Falta trabajador",
      accentColor: "#d32f2f",
      filtros: { estado: "incompleto" },
    },
    {
      key: "fechaNoDetectada",
      label: "Fecha no detectada",
      accentColor: "#6d4c41",
      filtros: { estado: "error", search: "Fecha no detectada" },
    },
  ],
  licencia: [
    ERROR_DUPLICADO,
    {
      key: "faltaTrabajador",
      label: "Falta trabajador",
      accentColor: "#d32f2f",
      filtros: { estado: "error", search: "Trabajador no identificado" },
    },
    {
      key: "fechaNoDetectada",
      label: "Fecha no detectada",
      accentColor: "#6d4c41",
      filtros: { estado: "error", search: "Fecha de licencia no detectada" },
    },
  ],
  horas: [
    ERROR_DUPLICADO,
    {
      key: "faltaTrabajador",
      label: "Falta trabajador",
      accentColor: "#d32f2f",
      filtros: { search: "Trabajadores no identificados" },
    },
    {
      key: "horasNocturnas",
      label: "Horas nocturnas",
      accentColor: "#3f51b5",
      filtros: {},
      customRoute: "/dhn/horas/nocturnas",
    },
    {
      key: "horasNoRedondeadas",
      label: "Horas no redondeadas",
      accentColor: "#f9a825",
      filtros: {},
      customRoute: "/dhn/horas/no-redondeadas",
    },
  ],
};

export const getErrorByKey = (documentoKey, errorKey) => {
  const lista = ERRORES_POR_DOCUMENTO[documentoKey] || [];
  return lista.find((e) => e.key === errorKey) || null;
};
