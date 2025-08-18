// src/utils/dateSerde.js
import { Timestamp } from 'firebase/firestore';

export const toJsDate = (v) => {
  if (!v) return null;
  if (v.toDate) return v.toDate(); // Firestore Timestamp
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export const toFirestoreMaybe = (v) => {
  if (!v) return v;
  if (v.toDate) return v;                // ya es Timestamp
  if (v instanceof Date) return Timestamp.fromDate(v);
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : Timestamp.fromDate(d);
};

export const reviveFilterDates = (obj) => {
  const out = { ...obj };
  if (out.fechaDesde) out.fechaDesde = toJsDate(out.fechaDesde);
  if (out.fechaHasta) out.fechaHasta = toJsDate(out.fechaHasta);
  return out;
};

export const serializeFilterDates = (obj) => {
  const out = { ...obj };
  if (out.fechaDesde) out.fechaDesde = toFirestoreMaybe(out.fechaDesde);
  if (out.fechaHasta) out.fechaHasta = toFirestoreMaybe(out.fechaHasta);
  return out;
};
