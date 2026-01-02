export const getNombreCliente = (c) => {
  console.log('c', c)
  if (c?.profile && c?.empresa) {
    return `${c.profile.firstName} ${c.profile.lastName} - (${c.empresa.nombre}) ${c.profile.phone.slice(-4)}`;
  }
  if (c?.ultimoMensaje?.emisor?.toLowerCase() === "sorby") {
    return c?.ultimoMensaje?.receptor;
  }
  return c?.wPid?.split('@')[0] || c?.lid;
}
  
export const getTitulo = (selected) => {
  if (!selected) {
    return "Conversaciones";
  }
  return getNombreCliente(selected);
}