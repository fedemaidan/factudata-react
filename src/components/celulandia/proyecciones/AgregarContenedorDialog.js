import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import pedidoService from "src/services/celulandia/pedidoService";

const AgregarContenedorDialog = ({ open, onClose, contenedores = [], pedidoId, onAsociado }) => {
  const [contenedorId, setContenedorId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setContenedorId("");
    onClose?.();
  };

  const handleConfirm = async () => {
    if (!pedidoId || !contenedorId) return;
    try {
      setIsSubmitting(true);
      await pedidoService.asociarContenedor(pedidoId, contenedorId);
      onAsociado?.();
      handleClose();
    } catch (e) {
      // Podrías conectar con Alerts globales si hace falta
      console.error("Error al asociar contenedor", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Agregar contenedor existente</DialogTitle>
      <DialogContent>
          <FormControl fullWidth>
            <InputLabel>Contenedor</InputLabel>
            <Select
              value={contenedorId}
              label="Contenedor"
              onChange={(e) => setContenedorId(e.target.value)}
            >
              {contenedores.length === 0 && (
                <MenuItem value="" disabled>
                  No hay contenedores disponibles
                </MenuItem>
              )}
              {contenedores.map((c) => (
                <MenuItem key={c._id || c.codigo} value={c._id}>
                  {c.codigo}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!contenedorId || isSubmitting}>
          {isSubmitting ? "Asociando..." : "Asociar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgregarContenedorDialog;
