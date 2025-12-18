import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Grid,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import TrabajadorService from "src/services/dhn/TrabajadorService";
import { getUser } from "src/utils/celulandia/currentUser";
import useModalAlert from "src/hooks/useModalAlert";

const AgregarTrabajadorModal = ({ open, onClose, onSave }) => {
  const { alert, showAlert, closeAlert } = useModalAlert(open);

  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    desde: new Date().toISOString().split("T")[0], // Hoy por defecto
    hasta: "",
  });

  useEffect(() => {
    // Evitar que quede el loader activo entre aperturas
    if (!open) setIsLoading(false);
  }, [open]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.apellido || !formData.dni) {
      showAlert({ message: "Por favor complete todos los campos requeridos", severity: "error" });
      return;
    }

    setIsLoading(true);
    try {
      await TrabajadorService.create({ ...formData, user: getUser() });
      
      showAlert({ message: "Trabajador creado correctamente", severity: "success" });

      setTimeout(() => {
        if (onSave) {
          onSave(formData);
        }
        handleClose();
      }, 500);
    } catch (error) {
      console.error('Error al crear trabajador:', error);
      showAlert({
        message: error.response?.data?.error || "Error al crear el trabajador",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = useCallback(() => {
    setIsLoading(false);
    setFormData({
      nombre: "",
      apellido: "",
      dni: "",
      desde: new Date().toISOString().split("T")[0],
      hasta: "",
    });
    if (typeof onClose === "function") onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <Snackbar anchorOrigin={{ vertical: "top", horizontal: "center" }} open={alert.open} autoHideDuration={6000} onClose={closeAlert}>
        <Alert onClose={closeAlert} severity={alert.severity} sx={{ width: "100%" }}>
          {alert.message}
        </Alert>
      </Snackbar>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Nuevo Trabajador
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre *"
                value={formData.nombre}
                onChange={(e) => handleInputChange("nombre", e.target.value)}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Apellido *"
                value={formData.apellido}
                onChange={(e) => handleInputChange("apellido", e.target.value)}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="DNI *"
                value={formData.dni}
                onChange={(e) => handleInputChange("dni", e.target.value)}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Desde *"
                type="date"
                value={formData.desde}
                onChange={(e) => handleInputChange("desde", e.target.value)}
                margin="normal"
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Hasta"
                type="date"
                value={formData.hasta}
                onChange={(e) => handleInputChange("hasta", e.target.value)}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit" disabled={isLoading}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSave} 
          color="primary" 
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : null}
        >
          {isLoading ? "Agregando..." : "Agregar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgregarTrabajadorModal;

