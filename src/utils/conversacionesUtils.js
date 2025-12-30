export const getNombreCliente = (c) =>
  c?.profile && c?.empresa
    ? `${c.profile.firstName} ${c.profile.lastName} - (${c.empresa.nombre}) ${c.profile.phone.slice(-4)}`
    : c?.ultimoMensaje?.emisor?.toLowerCase() === "sorby"
    ? c?.ultimoMensaje?.receptor
    : c?.ultimoMensaje?.emisor;

export const getTitulo = (selected) => {
  if (!selected) {
    return "Conversaciones";
  }
  return getNombreCliente(selected);
}