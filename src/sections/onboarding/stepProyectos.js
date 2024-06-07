import React, { useState } from 'react';
import { TextField, Button, Box, Grid } from '@mui/material';

const StepTwo = ({ handleNext, handleBack, handleDataChange }) => {
  const [proyecto, setProyecto] = useState('');

  const handleChange = (e) => setProyecto(e.target.value);

  const handleAddProject = (e) => {
    e.preventDefault();
    if (proyecto) {
      handleDataChange({proyectos: [proyecto]})
      setProyecto('');
    }
  };

  const handleSubmit = () => {
    handleNext();
  };

  return (
    <Box component="form" onSubmit={handleAddProject}>
      <TextField
        label="Nombre del Proyecto"
        value={proyecto}
        onChange={handleChange}
        fullWidth
      />
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Button variant="contained" color="primary" onClick={handleAddProject} fullWidth>
            Agregar Proyecto
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

export default StepTwo;
