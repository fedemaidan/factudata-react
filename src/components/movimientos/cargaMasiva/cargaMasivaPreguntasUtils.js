/** Valor de RadioGroup cuando el usuario elige "Otro / especificar". */
export const PREGUNTA_VALOR_OTRO = '__OTRO__';

export function pickRandomFiles(fileList, n) {
  const arr = [...fileList];
  const max = Math.min(n, arr.length);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, max);
}

/**
 * Arma el texto que se inyecta en `contexto_empresa` del extractor.
 */
export function buildContextoCuestionarioTexto(preguntas, respuestas) {
  if (!Array.isArray(preguntas) || !preguntas.length) return '';
  const lines = [];
  preguntas.forEach((q) => {
    const r = respuestas[q.id];
    if (!r) return;
    let answer;
    if (r.seleccion === PREGUNTA_VALOR_OTRO) {
      answer = (r.otro && String(r.otro).trim()) ? String(r.otro).trim() : '(Otro sin detalle)';
    } else if (r.seleccion) {
      const op = q.opciones.find((o) => o.id === r.seleccion);
      answer = op ? `${r.seleccion}) ${op.etiqueta}` : String(r.seleccion);
    } else if (r.otro && String(r.otro).trim()) {
      answer = String(r.otro).trim();
    } else {
      return;
    }
    lines.push(`• ${q.texto}\n  → ${answer}`);
  });
  return lines.join('\n\n');
}

/**
 * ¿Todas las preguntas tienen respuesta válida?
 */
export function preguntasEstanCompletas(preguntas, respuestas) {
  if (!Array.isArray(preguntas) || preguntas.length === 0) return true;
  return preguntas.every((q) => {
    const r = respuestas[q.id];
    if (!r) return false;
    if (r.seleccion === PREGUNTA_VALOR_OTRO) {
      return Boolean(r.otro && String(r.otro).trim());
    }
    if (r.seleccion) return true;
    return Boolean(r.otro && String(r.otro).trim());
  });
}
