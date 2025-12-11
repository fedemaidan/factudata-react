import React from "react";
import { Box, Typography, Grid, Stack, TextField } from "@mui/material";

const ProductosList = ({ productos, cantidades, onCantidadChange }) => {
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
                  type="number"
                  value={cantidades[producto._id] || 1}
                  onChange={(e) => onCantidadChange(producto._id, e.target.value)}
                  inputProps={{ min: 1, step: 1 }}
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
