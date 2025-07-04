import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography
} from '@mui/material';

const NodoForm = ({ nodo, onChange, onRemove, nivel = 1 }) => {
  const handleFieldChange = (field, value) => {
    onChange({ ...nodo, [field]: value });
  };

  const handleAddHijo = () => {
    const nuevosHijos = [...(nodo.nodos || []), {
      nombre: '',
      estado: 'Disponible',
      valor: '',
      meses: '',
      nodos: []
    }];
    onChange({ ...nodo, nodos: nuevosHijos });
  };

  const handleUpdateHijo = (index, nuevoHijo) => {
    const nuevos = [...(nodo.nodos || [])];
    nuevos[index] = nuevoHijo;
    onChange({ ...nodo, nodos: nuevos });
  };

  const handleRemoveHijo = (index) => {
    const nuevos = nodo.nodos.filter((_, i) => i !== index);
    onChange({ ...nodo, nodos: nuevos });
  };

  return (
    <Box
      sx={{
        border: '1px solid #ccc',
        borderRadius: 2,
        p: 2,
        mb: 2,
        ml: (nivel - 1) * 2,
        backgroundColor: '#fafafa'
      }}
    >
      <Typography variant="subtitle1">Nivel {nivel}</Typography>
      <TextField
        label="Nombre"
        value={nodo.nombre}
        onChange={(e) => handleFieldChange('nombre', e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Estado</InputLabel>
        <Select
          value={nodo.estado}
          label="Estado"
          onChange={(e) => {
            handleFieldChange('estado', e.target.value);
            if (e.target.value !== 'alquilado') handleFieldChange('meses', '');
          }}
        >
          <MenuItem value="disponible">Disponible</MenuItem>
          <MenuItem value="vendido">Vendido</MenuItem>
          <MenuItem value="alquilado">Alquilado</MenuItem>
        </Select>
      </FormControl>
      <TextField
        label="Valor"
        type="number"
        value={nodo.valor}
        onChange={(e) => handleFieldChange('valor', e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      {nodo.estado === 'alquilado' && (
        <TextField
          label="Meses de alquiler"
          type="number"
          value={nodo.meses || ''}
          onChange={(e) => handleFieldChange('meses', e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
      )}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button variant="outlined" onClick={handleAddHijo} disabled={nivel >= 3}>
          Agregar Subnivel
        </Button>
        <Button variant="outlined" color="error" onClick={onRemove}>
          Eliminar
        </Button>
      </Box>
      {nodo.nodos?.map((hijo, i) => (
        <NodoForm
          key={i}
          nodo={hijo}
          onChange={(nuevo) => handleUpdateHijo(i, nuevo)}
          onRemove={() => handleRemoveHijo(i)}
          nivel={nivel + 1}
        />
      ))}
    </Box>
  );
};

export default NodoForm;
