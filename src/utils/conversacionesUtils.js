export const getNombreCliente = (c) => {
  if (c?.profile && c?.empresa) {
    const fullName = [c.profile.firstName, c.profile.lastName].filter(Boolean).join(' ').trim()
      || c.profile.email
      || '';
    const tail = c.profile.phone ? ` ${String(c.profile.phone).slice(-4)}` : '';
    return `${fullName} - (${c.empresa.nombre})${tail}`;
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