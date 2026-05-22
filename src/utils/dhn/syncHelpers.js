export const STATUS_MAP = {
  pending: { color: "#757575", label: "Pendiente" },
  queued: { color: "#0288d1", label: "Encolado" },
  processing: { color: "#ed6c02", label: "Procesando" },
  done: { color: "#2e7d32", label: "Completado" },
  ok: { color: "#2e7d32", label: "OK" },
  error: { color: "#d32f2f", label: "Error" },
  duplicado: { color: "#ed6c02", label: "Duplicado" },
  ignorado: { color: "#9e9e9e", label: "Ignorado" },
  incompleto: { color: "#ed6c02", label: "Incompleto" },
  ignored: { color: "#9e9e9e", label: "Ignorado", dashed: true },
};

export const getStatusChipConfig = (status) => {
  return STATUS_MAP[status] || { color: "#757575", label: status || "-" };
};
