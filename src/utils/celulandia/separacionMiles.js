export const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const clean = String(v).replace(",", ".").trim();
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
};

export const formatNumberWithThousands = (value) => {
  if (!value || value === 0) return "0";
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
