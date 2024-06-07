import React, { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';

const StepCategorias = ({ handleNext, handleBack, handleDataChange }) => {
  const [categoria, setCategoria] = useState('');

  const handleChange = (e) => setCategoria(e.target.value);

  const handleAddCategory = () => {
    handleDataChange({ categorias: [categoria] });
    setCategoria('');
  };

  const handleSubmit = () => handleNext();

  return (
    <Box>
      <TextField
        label="Nombre de la Categoría"
        value={categoria}
        onChange={handleChange}
        fullWidth
      />
      <Button variant="contained" color="primary" onClick={handleAddCategory} sx={{ mt: 2 }}>
        Agregar Categoría
      </Button>
      <Button variant="contained" color="primary" onClick={handleSubmit} sx={{ mt: 2 }}>
        Siguiente
      </Button>
      <Button variant="outlined" onClick={handleBack} sx={{ mt: 2, ml: 2 }}>
        Atrás
      </Button>
    </Box>
  );
};

export default StepCategorias;
