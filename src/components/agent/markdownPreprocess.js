/**
 * Convierte el formato WhatsApp que usa el agente (`*bold*`, `_italic_`) a markdown
 * estándar para que `react-markdown` lo renderice correctamente.
 *
 * Usa lookarounds para no convertir asteriscos sueltos o palabras con `*` en el medio
 * (ej. `2*3=6` queda intacto).
 */
export function whatsappToMarkdown(text) {
  if (typeof text !== 'string' || !text) return text;
  return text.replace(/(?<![\w*])\*([^*\n]+?)\*(?![\w*])/g, '**$1**');
}
