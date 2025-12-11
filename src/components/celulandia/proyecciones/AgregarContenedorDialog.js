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

const AgregarContenedorDialog = ({ open, onClose, contenedores = [] }) => {
  const [contenedorId, setContenedorId] = useState("");

  const handleClose = () => {
    setContenedorId("");
    onClose?.();
  };

  const handleConfirm = () => {
    // No POST por ahora: solo UX
    handleClose();
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
                <MenuItem key={c?.contenedor?._id || c?.contenedor?.codigo} value={c?.contenedor?._id || c?.contenedor?.codigo}>
                  {c?.contenedor?.codigo || "Sin código"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!contenedorId}>
          Asociar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgregarContenedorDialog;
