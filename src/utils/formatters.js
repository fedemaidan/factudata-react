import { Timestamp } from 'firebase/firestore';

const normalizeNumericString = (value, options = {}) => {
  const { preserveTrailingDecimal = false } = options;
  if (value === '' || value == null) return '';

  const cleaned = String(value).trim().replace(/[^\d.,-]/g, '');
  if (!cleaned) return '';

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const separator = hasComma && hasDot ? (lastComma > lastDot ? ',' : '.') : hasComma ? ',' : hasDot ? '.' : null;

  let integerRaw = cleaned;
  let decimalRaw = '';

  if (separator) {
    const occurrences = cleaned.split(separator).length - 1;
    const index = cleaned.lastIndexOf(separator);
    const integerPartRaw = cleaned.slice(0, index);
    const decimalPartRaw = cleaned.slice(index + 1);
    const decimalDigits = decimalPartRaw.replace(/\D/g, '');
    const integerDigits = integerPartRaw.replace(/[^\d-]/g, '');
    const treatAsThousands =
      occurrences > 1 ||
      (separator === '.' && decimalDigits.length === 3) ||
      (decimalDigits.length > 2 && integerDigits.length <= 3);

    if (!treatAsThousands) {
      integerRaw = integerPartRaw;
      decimalRaw = decimalPartRaw;
    }
  }

  let sign = '';
  if (integerRaw.startsWith('-')) {
    sign = '-';
    integerRaw = integerRaw.slice(1);
  }

  integerRaw = integerRaw.replace(/\D/g, '');
  decimalRaw = decimalRaw.replace(/\D/g, '');
  const hasTrailingDecimal =
    preserveTrailingDecimal &&
    separator &&
    cleaned.endsWith(separator) &&
    decimalRaw === '';

  if (!integerRaw && !decimalRaw) return '';
  if (!integerRaw && decimalRaw) integerRaw = '0';

  return `${sign}${integerRaw}${decimalRaw ? `.${decimalRaw}` : hasTrailingDecimal ? '.' : ''}`;
};


const formatTimestamp = (timestamp, formato = 'ANO-MES-DIA') => {
  if (!timestamp) return "";

  // Soportar Date nativo (ej: desde MongoDB)
  if (timestamp instanceof Date) {
    const seconds = Math.floor(timestamp.getTime() / 1000);
    return formatTimestamp({ seconds }, formato);
  }

  // Soportar ISO string (ej: "2025-03-15T12:00:00.000Z" desde MongoDB serializado)
  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) {
      const seconds = Math.floor(parsed.getTime() / 1000);
      return formatTimestamp({ seconds }, formato);
    }
    return "";
  }

  // Soportar tanto `seconds` como `_seconds` (Firestore Timestamp)
  const seconds = timestamp.seconds !== undefined ? timestamp.seconds : timestamp._seconds;
  if (seconds === undefined) return "";

  const utcDate = new Date(seconds * 1000);

  const isMidnightUTC =
    utcDate.getUTCHours() === 0 && utcDate.getUTCMinutes() === 0 && utcDate.getUTCSeconds() === 0;

  const displayDate = isMidnightUTC ? utcDate : new Date(utcDate.getTime() - 3 * 60 * 60 * 1000);

  const year = displayDate.getFullYear();
  const month = `0${displayDate.getMonth() + 1}`.slice(-2);
  const day = `0${displayDate.getDate()}`.slice(-2);

  if (formato === 'DIA/MES/ANO') {
    return `${day}/${month}/${year}`;
  }

  return `${year}-${month}-${day}`;
};


const formatCurrency = (amount, digits = 0) => {
  if (amount === null || amount === undefined || amount === "") {
    return "$ 0";
  }

  const normalized = typeof amount === 'string' ? normalizeNumericString(amount) : String(amount);
  const numericAmount = parseFloat(normalized);

  // Verificar si es un número válido
  if (isNaN(numericAmount)) {
    return "$ 0";
  }

  if (typeof digits === 'string') {
    return formatCurrencyWithCode(numericAmount, digits);
  }

  // Validar que digits esté en el rango permitido (0-20)
  const validDigits = Math.max(0, Math.min(20, parseInt(digits) || 0));

  // Formatear como moneda
  return numericAmount.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: validDigits,
  });
};

// Función mejorada que acepta el código de moneda
const formatCurrencyWithCode = (amount, currencyCode = 'ARS') => {
  if (amount === null || amount === undefined || amount === "") {
    return "$ 0";
  }

  let numericAmount;
  if (typeof amount === "string") {
    numericAmount = parseFloat(normalizeNumericString(amount));
  } else {
    numericAmount = parseFloat(amount);
  }

  // Verificar si es un número válido
  if (isNaN(numericAmount)) {
    return "$ 0";
  }

  // Definir decimales según la moneda
  const digits = currencyCode === 'USD' ? 2 : 0;

  // Formatear como moneda
  return numericAmount.toLocaleString("es-AR", {
    style: "currency",
    currency: currencyCode === 'USD' ? 'USD' : 'ARS',
    minimumFractionDigits: digits,
  });
};

  const toDateFromFirestore = (timestamp) => {
    if (!timestamp) return null;
    const seconds = timestamp.seconds ?? timestamp._seconds;
    if (seconds === undefined) return null;
    return new Date(seconds * 1000);
  };
  

  const dateToTimestamp = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return Timestamp.fromDate(new Date(year, month - 1, day, 13, 30));
  };

/** Formatea un string/number para mostrar con separador de miles (es-AR: 1.234.567,89) */
const formatNumberInput = (value) => {
  if (value === '' || value == null) return '';
  const normalized = normalizeNumericString(value, { preserveTrailingDecimal: true });
  if (!normalized) return '';

  let sign = '';
  let numeric = normalized;
  if (numeric.startsWith('-')) {
    sign = '-';
    numeric = numeric.slice(1);
  }

  const endsWithDecimal = numeric.endsWith('.');
  const [integerRaw, decimalRaw = ''] = numeric.split('.');
  const intPart = integerRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (decimalRaw) return `${sign}${intPart},${decimalRaw}`;
  if (endsWithDecimal) return `${sign}${intPart},`;
  return `${sign}${intPart}`;
};

/** Parsea un string con separador de miles a valor numérico crudo (string sin formato) */
const parseNumberInput = (formatted) => {
  if (formatted === '' || formatted == null) return '';
  return normalizeNumericString(formatted, { preserveTrailingDecimal: true });
};

export {formatTimestamp, formatCurrency, formatCurrencyWithCode, toDateFromFirestore, dateToTimestamp, formatNumberInput, parseNumberInput
};

