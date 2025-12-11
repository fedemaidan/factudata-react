import React from "react";
import { Grid, TextField } from "@mui/material";

const NuevoContenedorForm = ({ formData, onChange }) => {
  const handleChange = (field, value) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Código del Contenedor"
          value={formData.numero}
          onChange={(e) => handleChange("numero", e.target.value.toUpperCase())}
          placeholder="Ej: TCLU123456"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Fecha Estimada de Llegada"
          type="date"
          value={formData.fechaEstimada}
          onChange={(e) => handleChange("fechaEstimada", e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
    </Grid>
  );
};

export default NuevoContenedorForm;
