import React, { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';

const StepNombre = ({ handleNext, handleDataChange }) => {
  const [nombre, setNombre] = useState('');

  const handleChange = (e) => {
    setNombre(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleDataChange({ nombre });
    handleNext();
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <TextField
        name="nombre"
        label="Nombre de la Empresa"
        value={nombre}
        onChange={handleChange}
        fullWidth
      />
      <Button variant="contained" color="primary" onClick={handleSubmit} sx={{ mt: 2 }}>
        Siguiente
      </Button>
    </Box>
  );
};

export default StepNombre;
