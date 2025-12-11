import React from "react";
import { FormControl, InputLabel, Select, MenuItem, Box, Typography } from "@mui/material";

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toISOString().slice(0, 10);
};

const ContenedorExistenteSelector = ({ contenedores = [], value, onChange, disabled = false }) => {
  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel>Seleccionar Contenedor</InputLabel>
      <Select
        value={value}
        label="Seleccionar Contenedor"
        onChange={(e) => onChange(e.target.value)}
      >
        <MenuItem value="">
          <Typography variant="body2" color="text.secondary">
            Sin contenedor asignado
          </Typography>
        </MenuItem>
        {contenedores.map((contenedor) => (
          <MenuItem key={contenedor._id} value={contenedor._id}>
            <Box>
              <Typography variant="body2" fontWeight="bold">
                {contenedor.codigo || contenedor.numero || "Sin código"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Llegada estimada: {formatDate(contenedor.fechaEstimadaLlegada || contenedor.fechaEstimada)}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default ContenedorExistenteSelector;
