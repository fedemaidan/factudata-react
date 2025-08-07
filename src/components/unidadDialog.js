import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Button
} from '@mui/material';

import { calcularTotalUF, calcularRentabilidad } from 'src/utils/unidadUtils';

export default function UnidadDialog({ unidad, onClose, onChange, onSave, proyectos }) {
  if (!unidad) return null;

  const handleProyectoChange = (id) => {
    const proyecto = proyectos.find(p => p.id === id);
    onChange('proyectoId', id);
    onChange('proyecto', proyecto?.nombre || '');
  };

  const handleSave = () => {
    if (!unidad.proyectoId) {
      alert('Seleccioná un proyecto para continuar');
      return;
    }

    const unidadConEstado = {
      ...unidad,
      estado: unidad.estado || 'disponible'
    };

    onSave(unidadConEstado);
  };

  const totalUF = calcularTotalUF(unidad);
  const rentabilidad = calcularRentabilidad(unidad);

  return (
    <Dialog open={!!unidad} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{unidad.nombreAntiguo ? 'Editar Unidad' : 'Nueva Unidad'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <FormControl fullWidth>
          <InputLabel>Proyecto</InputLabel>
          <Select
            value={unidad.proyectoId || ''}
            onChange={e => handleProyectoChange(e.target.value)}
          >
            {proyectos.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField label="Nombre" value={unidad.nombre || ''} onChange={e => onChange('nombre', e.target.value)} fullWidth />
        <TextField label="Lote" value={unidad.lote || ''} onChange={e => onChange('lote', e.target.value)} fullWidth />
        <TextField label="Edificio" value={unidad.edificio || ''} onChange={e => onChange('edificio', e.target.value)} fullWidth />
        <TextField label="Piso" value={unidad.piso || ''} onChange={e => onChange('piso', e.target.value)} fullWidth />
        <TextField label="Tipificación" value={unidad.tipificacion || ''} onChange={e => onChange('tipificacion', e.target.value)} fullWidth />
        <TextField label="m² Cubiertos" type="number" value={unidad.m2_cubierta || ''} onChange={e => onChange('m2_cubierta', e.target.value)} fullWidth />
        <TextField label="m² Comunes" type="number" value={unidad.m2_comunes || ''} onChange={e => onChange('m2_comunes', e.target.value)} fullWidth />
        <TextField
          label="m² Totales"
          value={(parseFloat(unidad.m2_cubierta || 0) + parseFloat(unidad.m2_comunes || 0)).toFixed(2)}
          fullWidth
          InputProps={{ readOnly: true }}
          variant="filled"
        />
        <TextField label="Cocheras" type="number" value={unidad.cocheras || ''} onChange={e => onChange('cocheras', e.target.value)} fullWidth />
        <TextField label="Camas" type="number" value={unidad.camas || ''} onChange={e => onChange('camas', e.target.value)} fullWidth />
        <TextField label="Valor UF" type="number" value={unidad.valor_uf || ''} onChange={e => onChange('valor_uf', e.target.value)} fullWidth />
        <TextField label="Valor cochera" type="number" value={unidad.valor_cochera || ''} onChange={e => onChange('valor_cochera', e.target.value)} fullWidth />
        <TextField label="Total UF" value={totalUF.toFixed(2)} fullWidth InputProps={{ readOnly: true }} variant="filled" />
        <TextField label="Alquiler mensual" type="number" value={unidad.alquiler_mensual || ''} onChange={e => onChange('alquiler_mensual', e.target.value)} fullWidth />
        <TextField label="Rentabilidad estimada" value={`${rentabilidad.toFixed(2)}%`} fullWidth InputProps={{ readOnly: true }} variant="filled" />

        <FormControl fullWidth>
          <InputLabel>Estado</InputLabel>
          <Select
            value={unidad.estado || 'disponible'}
            onChange={e => onChange('estado', e.target.value)}
          >
            <MenuItem value="disponible">Disponible</MenuItem>
            <MenuItem value="alquilado">Alquilado</MenuItem>
            <MenuItem value="vendido">Vendido</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}
