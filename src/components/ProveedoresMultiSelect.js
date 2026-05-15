import { useMemo, useState } from 'react';
import { Autocomplete, Chip, Stack, TextField, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';

/**
 * Multi-select de proveedores con chips, freeSolo y deduplicación por nombre.
 *
 * Valor canónico: array de { id, nombre }. La UI internamente trabaja con strings
 * (nombres) y reconcilia con el array de objetos al hacer commit.
 *
 * @param {Array<{id?: string|null, nombre: string}>} value - Selección actual.
 * @param {(next: Array<{id: string|null, nombre: string}>) => void} onChange
 * @param {string[]} options - Nombres de proveedores conocidos de la empresa.
 * @param {'small' | 'medium'} [size='medium']
 * @param {string} [placeholder='Buscar o crear proveedor...']
 */
export default function ProveedoresMultiSelect({
  value = [],
  onChange,
  options = [],
  size = 'medium',
  placeholder = 'Buscar o crear proveedor...',
}) {
  const selectedNombres = useMemo(() => value.map((p) => p.nombre), [value]);
  const [inputValue, setInputValue] = useState('');

  const handleChange = (_e, nuevosNombres) => {
    const seen = new Set();
    const next = [];
    for (const raw of nuevosNombres) {
      const nombre = String(raw || '').trim();
      if (!nombre || seen.has(nombre)) continue;
      seen.add(nombre);
      const existing = value.find((p) => p.nombre === nombre);
      next.push(existing || { id: null, nombre });
    }
    onChange(next);
  };

  // Commitea el texto pendiente como nuevo proveedor (freeSolo) si el usuario
  // tipeó pero no presionó Enter antes de salir/submit.
  const commitPendingInput = () => {
    const nombre = inputValue.trim();
    if (!nombre) return;
    if (selectedNombres.includes(nombre)) {
      setInputValue('');
      return;
    }
    onChange([...value, { id: null, nombre }]);
    setInputValue('');
  };

  return (
    <Autocomplete
      multiple
      freeSolo
      autoSelect
      size={size}
      options={options}
      value={selectedNombres}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={(_e, val) => setInputValue(val)}
      onBlur={commitPendingInput}
      getOptionLabel={(option) => option || ''}
      renderTags={(values, getTagProps) =>
        values.map((nombre, index) => (
          <Chip
            {...getTagProps({ index })}
            key={nombre}
            label={nombre}
            size="small"
            icon={<StorefrontIcon fontSize="small" />}
          />
        ))
      }
      renderOption={(props, option) => (
        <li {...props}>
          <Stack direction="row" spacing={1} alignItems="center">
            <StorefrontIcon fontSize="small" color="action" />
            <Typography>{option}</Typography>
          </Stack>
        </li>
      )}
      renderInput={(params) => (
        <TextField {...params} placeholder={selectedNombres.length === 0 ? placeholder : ''} />
      )}
    />
  );
}
