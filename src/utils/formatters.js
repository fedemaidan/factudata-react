import { Timestamp } from 'firebase/firestore';


const formatTimestamp = (timestamp, formato = 'ANO-MES-DIA') => {
  if (!timestamp) return "";

  // Soportar tanto `seconds` como `_seconds`
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

  // Convertir a número si es string
  let numericAmount;
  if (typeof amount === "string") {
    // Remover símbolos de moneda y separadores de miles
    const cleanAmount = amount.replace(/[^\d.,]/g, "").replace(",", ".");
    numericAmount = parseFloat(cleanAmount);
  } else {
    numericAmount = parseFloat(amount);
  }

  // Verificar si es un número válido
  if (isNaN(numericAmount)) {
    return "$ 0";
  }

  // Formatear como moneda
  return numericAmount.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
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

export {formatTimestamp, formatCurrency, toDateFromFirestore, dateToTimestamp
};

