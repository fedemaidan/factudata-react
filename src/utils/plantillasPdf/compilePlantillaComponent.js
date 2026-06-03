import React from 'react';

/**
 * Compilación segura de plantillas PDF generadas por IA.
 *
 * El código generado define `function PlantillaPDF({ data, logoDataUrl, empresaNombre })`
 * usando React.createElement y primitivos de @react-pdf/renderer. Se ejecuta con
 * `new Function(...)` inyectando SOLO esos primitivos (sin acceso a window/fetch/DOM),
 * igual que el flujo actual de nota de pedido.
 */

export function sanitizePdfCode(code) {
  // react-pdf no soporta fontStyle/fontWeight — la fontFamily ya codifica el estilo.
  return (code || '')
    .replace(/fontStyle\s*:\s*['"][^'"]*['"]\s*,?\s*/g, '')
    .replace(/fontWeight\s*:\s*['"\d][^,}]*,?\s*/g, '');
}

export async function compilePlantillaComponent(jsCode) {
  const sanitized = sanitizePdfCode(jsCode);
  const { Document, Page, Text, View, Image, StyleSheet } = await import('@react-pdf/renderer');
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    'React', 'Document', 'Page', 'Text', 'View', 'Image', 'StyleSheet',
    `${sanitized}\nreturn typeof PlantillaPDF !== 'undefined' ? PlantillaPDF : null;`
  );
  const Component = factory(React, Document, Page, Text, View, Image, StyleSheet);
  if (!Component) throw new Error('El código no define PlantillaPDF');
  return Component;
}
