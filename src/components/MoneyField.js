import { useEffect, useState } from 'react';
import { TextField } from '@mui/material';

/**
 * Campo de importe con formato es-AR mientras se escribe:
 *  - separador de miles "." (531.900)
 *  - separador decimal "," (531.900,50)
 *
 * Hacia afuera trabaja con el valor numérico "crudo" como string (punto decimal,
 * sin miles), por lo que el padre puede seguir haciendo Number(value) como antes.
 *
 * Props extra: todas las de TextField (label, size, fullWidth, helperText, etc.).
 * No pasar type="number" — el campo es de texto formateado.
 */

// Deja solo dígitos y una única coma decimal.
const soloNumero = (s) => {
  let t = String(s ?? '').replace(/[^\d,]/g, '');
  const i = t.indexOf(',');
  if (i !== -1) t = t.slice(0, i + 1) + t.slice(i + 1).replace(/,/g, '');
  return t;
};

// "531900,5" (dígitos + coma) -> "531.900,5" (con miles).
const formatear = (limpio) => {
  if (limpio === '' || limpio == null) return '';
  const [ent, dec] = String(limpio).split(',');
  const entFmt = (ent || '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec !== undefined ? `${entFmt || '0'},${dec}` : entFmt;
};

// Texto mostrado -> valor crudo "531900.5" (punto decimal, sin miles).
const aCrudo = (display) => {
  const t = soloNumero(display);
  if (t === '') return '';
  return t.replace(/\./g, '').replace(',', '.');
};

// Valor crudo del padre ("531900" | "531900.5" | número) -> texto formateado.
const aDisplay = (v) => {
  if (v === '' || v == null) return '';
  return formatear(String(v).replace('.', ','));
};

export default function MoneyField({ value, onChange, ...props }) {
  const [text, setText] = useState(aDisplay(value));

  // Resincroniza cuando el padre cambia el valor (ej. al abrir un diálogo).
  useEffect(() => { setText(aDisplay(value)); /* eslint-disable-next-line */ }, [value]);

  const handle = (e) => {
    const limpio = soloNumero(e.target.value);
    setText(formatear(limpio));
    onChange(aCrudo(limpio));
  };

  return <TextField {...props} value={text} onChange={handle} inputMode="decimal" />;
}
