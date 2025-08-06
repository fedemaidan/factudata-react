import { Timestamp } from 'firebase/firestore';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';

  // Soportar tanto `seconds` como `_seconds`
  const seconds = timestamp.seconds !== undefined ? timestamp.seconds : timestamp._seconds;
  if (seconds === undefined) return '';

  const utcDate = new Date(seconds * 1000);

  const isMidnightUTC = 
    utcDate.getUTCHours() === 0 &&
    utcDate.getUTCMinutes() === 0 &&
    utcDate.getUTCSeconds() === 0;

  const displayDate = isMidnightUTC
    ? utcDate
    : new Date(utcDate.getTime() - 3 * 60 * 60 * 1000);

  const year = displayDate.getFullYear();
  const month = `0${displayDate.getMonth() + 1}`.slice(-2);
  const day = `0${displayDate.getDate()}`.slice(-2);

  return `${year}-${month}-${day}`;
};


  const formatCurrency = (amount, digits = 0) => {
    if (amount)
      return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: digits });
    else
      return "$ 0";
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

export {formatTimestamp, formatCurrency, toDateFromFirestore, dateToTimestamp};