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


  const formatCurrency = (amount) => {
    if (amount)
      return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
    else
      return "$ 0";
  };


export {formatTimestamp, formatCurrency};