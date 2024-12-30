const formatTimestamp = (timestamp) => {
    if (!timestamp) {
      return '';
    }
    const date = new Date(timestamp.seconds * 1000); 
    const year = date.getFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2); 
    const day = `0${date.getDate()}`.slice(-2);
  
    return `${year}-${month}-${day}`;
  };

  const formatCurrency = (amount) => {
    if (amount)
      return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
    else
      return "$ 0";
  };


export {formatTimestamp, formatCurrency};