export const STATUS_MAP = {
  pending: { color: "#757575", label: "Pendiente" },
  processing: { color: "#ed6c02", label: "Procesando" },
  done: { color: "#2e7d32", label: "Completado" },
  ok: { color: "#2e7d32", label: "OK" },
  error: { color: "#d32f2f", label: "Error" },
  duplicado: { color: "#ed6c02", label: "Duplicado" },
  incompleto: { color: "#ed6c02", label: "Incompleto" },
};

export const getStatusChipConfig = (status) => {
  return STATUS_MAP[status] || { color: "#757575", label: status || "-" };
};
