import React from "react";
import { Box, Typography, Grid, Stack, TextField } from "@mui/material";

const ProductosList = ({ productos, cantidades, onCantidadChange }) => {
  const sanitizeCantidadInput = (value) => {
    const stringValue = String(value ?? "");
    if (stringValue === "") return "";
    return stringValue.replace(/[^\d]/g, "");
  };

  const normalizeCantidadOnBlur = (value) => {
    const sanitized = sanitizeCantidadInput(value);
    const parsed = parseInt(sanitized, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return "1";
    return String(parsed);
  };

  if (!productos || productos.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No hay productos seleccionados
      </Typography>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" gutterBottom>
        📦 Productos a agregar ({productos.length}):
      </Typography>
      <Grid container spacing={2}>
        {productos.map((producto) => (
          <Grid item xs={12} md={6} key={producto._id}>
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "background.paper",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box flex={1}>
                  <Typography variant="body2" fontWeight="bold">
                    {producto.codigo}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {producto.nombre || producto.descripcion}
                  </Typography>
                </Box>
                <TextField
                  size="small"
                  label="Cantidad"
                  type="text"
                  value={cantidades?.[producto._id] ?? "1"}
                  onChange={(e) => {
                    const sanitized = sanitizeCantidadInput(e.target.value);
                    onCantidadChange(producto._id, sanitized);
                  }}
                  onBlur={(e) => {
                    const normalized = normalizeCantidadOnBlur(e.target.value);
                    onCantidadChange(producto._id, normalized);
                  }}
                  inputProps={{
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                    "aria-label": `Cantidad para ${producto.codigo}`,
                  }}
                  sx={{ width: 80 }}
                />
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ProductosList;
