import React from 'react';
import { Box, Typography, TextField, Autocomplete, Button, Chip, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export default function StepProveedor({ proveedor, setProveedor, proveedoresOptions = [], onNext }) {
  const handleSelect = (value) => {
    setProveedor(value);
  };

  const handleContinue = () => {
    if (proveedor && onNext) onNext();
  };

  // Proveedores más usados (los primeros 5)
  const proveedoresFrecuentes = proveedoresOptions.slice(0, 5);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        ¿De qué proveedor es?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Elegí el proveedor que te envió la lista o factura
      </Typography>

      {proveedoresFrecuentes.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Proveedores frecuentes:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {proveedoresFrecuentes.map((p) => (
              <Chip
                key={p}
                label={p}
                onClick={() => handleSelect(p)}
                color={proveedor === p ? 'primary' : 'default'}
                variant={proveedor === p ? 'filled' : 'outlined'}
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Autocomplete
        freeSolo
        options={proveedoresOptions}
        value={proveedor}
        onInputChange={(e, v) => setProveedor(v)}
        renderInput={(params) => (
          <TextField 
            {...params} 
            label="Buscar o escribir proveedor" 
            fullWidth
            placeholder="Ej: Loma Negra, Cementos Avellaneda..."
          />
        )}
      />

      {proveedor && !proveedoresOptions.includes(proveedor) && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AddIcon fontSize="small" color="info" />
            <Typography variant="body2" color="info.dark">
              Se agregará "{proveedor}" como nuevo proveedor
            </Typography>
          </Stack>
        </Box>
      )}

      <Box sx={{ mt: 4 }}>
        <Button
          variant="contained"
          onClick={handleContinue}
          disabled={!proveedor?.trim()}
          fullWidth
          size="large"
        >
          Continuar
        </Button>
      </Box>
    </Box>
  );
}
