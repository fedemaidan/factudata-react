import React from "react";
import { Grid, TextField } from "@mui/material";

const NuevoPedidoForm = ({ formData, onChange }) => {
  const handleChange = (field, value) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Número de Pedido"
          value={formData.numero}
          onChange={(e) => handleChange("numero", e.target.value)}
          placeholder="Ej: PED-2025-020"
          required
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Fecha Estimada"
          type="date"
          value={formData.fechaEstimada}
          onChange={(e) => handleChange("fechaEstimada", e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Observaciones del Pedido"
          value={formData.observaciones}
          onChange={(e) => handleChange("observaciones", e.target.value)}
          placeholder="Observaciones opcionales"
        />
      </Grid>
    </Grid>
  );
};

export default NuevoPedidoForm;
