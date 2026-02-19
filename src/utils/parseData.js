export const toNumber = (value) => {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  const parsed = Number(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

export const normalizeDate = (value) => {
  if (!value) return null;
  return typeof value === "number" ? new Date(value) : new Date(value);
};