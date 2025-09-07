// components/shared/ProyectoSelect.jsx
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

export default function ProyectoSelect({
  label = 'Proyecto (opcional)',
  value,
  onChange,
  proyectos = [],
  allowEmpty = true,
  fullWidth = true,
  ...props
}) {
  return (
    <FormControl fullWidth={fullWidth} {...props}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={value ?? ''} onChange={(e) => onChange?.(e.target.value)}>
        {allowEmpty && <MenuItem value=""><em>Sin proyecto</em></MenuItem>}
        {proyectos.map((p) => (
          <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
