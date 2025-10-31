export function toNumber(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return value;

  // Limpia todo lo que no sea número, coma o punto
  let str = String(value).trim().replace(/[^\d.,-]/g, '');

  // Si tiene coma y punto, asumimos que el punto es separador de miles
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Ejemplo: "1.234,56" => "1234.56"
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Ejemplo: "1,234.56" (estilo inglés) => "1234.56"
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Solo coma → tratamos como decimal
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return Number.isFinite(num) ? num : 0;
}
