import React from "react";
import { FormControl, InputLabel, Select, MenuItem, Box, Typography, Chip, Stack } from "@mui/material";

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toISOString().slice(0, 10);
};

const PedidoExistenteSelector = ({ pedidos = [], value, onChange, disabled = false }) => {
  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel>Seleccionar Pedido</InputLabel>
      <Select
        value={value}
        label="Seleccionar Pedido"
        onChange={(e) => onChange(e.target.value)}
      >
        {pedidos.map((pedido) => {
          const fechaCreacion = formatDate(pedido.createdAt);
          const fechaActualizacion = formatDate(pedido.updatedAt);
          return (
            <MenuItem key={pedido._id} value={pedido._id}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight="bold">
                    {pedido.numeroPedido || "Sin número"}
                  </Typography>
                  {pedido.estado && (
                    <Chip
                      size="small"
                      label={pedido.estado}
                      color={pedido.estado === "PENDIENTE" ? "warning" : "success"}
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Creado: {fechaCreacion} | Últ. act: {fechaActualizacion}
                </Typography>
                {pedido.observaciones && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {pedido.observaciones}
                  </Typography>
                )}
              </Box>
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};

export default PedidoExistenteSelector;
