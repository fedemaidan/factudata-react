export const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const clean = String(v).replace(",", ".").trim();
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
};

export const formatNumberWithThousands = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  const n = typeof value === "number" ? value : toNumber(value);
  if (!Number.isFinite(n)) return String(value);
  if (n === 0) return "0";

  const negative = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  // Montos con decimales: redondear a céntimos para evitar cola de float (ej. USD desde ARS/tc)
  const rounded = Number.isInteger(abs) ? abs : Math.round(abs * 100) / 100;
  const str = rounded.toString();
  const dotIdx = str.indexOf(".");
  const intRaw = dotIdx === -1 ? str : str.slice(0, dotIdx);
  let fracRaw = dotIdx === -1 ? "" : str.slice(dotIdx + 1);
  if (fracRaw) {
    fracRaw = fracRaw.replace(/0+$/, "");
  }

  const intPart = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (!fracRaw) return `${negative}${intPart}`;
  return `${negative}${intPart},${fracRaw}`;
};

export const formatearMonto = (valor) => {
  if (!valor || valor === "") return "";
  const numero = parseFloat(String(valor).replace(/\./g, ""));
  if (isNaN(numero)) return "";
  return formatNumberWithThousands(Math.round(numero));
};

export const parsearMonto = (valor) => {
  if (!valor || valor === "") return "";
  return String(valor).replace(/\./g, "");
};
