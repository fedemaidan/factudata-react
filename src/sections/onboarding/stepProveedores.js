import React, { useState } from 'react';
import { TextField, Button, Box, Grid } from '@mui/material';

const StepProveedores = ({ handleNext, handleBack, handleDataChange }) => {
  const [proveedor, setProveedor] = useState('');

  const handleChange = (e) => setProveedor(e.target.value);

  const handleAddProveedor = (e) => {
    e.preventDefault();
    handleDataChange({ proveedores: [proveedor] });
    setProveedor('');
  };

  const handleSubmit = () => handleNext();

  return (
    <Box component="form" onSubmit={handleAddProveedor}>
      <TextField
        label="Nombre del Proveedor"
        value={proveedor}
        onChange={handleChange}
        fullWidth
      />
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Button variant="contained" color="primary" onClick={handleAddProveedor} fullWidth>
            Agregar proveedor
          </Button>
        </Grid>
        <Grid item xs={6}>
          <Button variant="outlined" onClick={handleBack} fullWidth>
            Atrás
          </Button>
        </Grid>
        <Grid item xs={6}>
          <Button variant="contained" color="primary" onClick={handleSubmit} fullWidth>
            Siguiente
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StepProveedores;
