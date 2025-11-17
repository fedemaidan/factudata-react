import dayjs from 'dayjs';

export const formatDateDDMMYYYY = (fecha) => {
  if (!fecha) return '-';
  const fechaParsed = dayjs(fecha);
  if (!fechaParsed.isValid()) return '-';
  return fechaParsed.format('DD-MM-YYYY');
};
