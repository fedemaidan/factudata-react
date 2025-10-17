import React, { useState, useEffect } from "react";
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
  FormControlLabel,
  Checkbox,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import TrabajadorService from "src/services/dhn/TrabajadorService";

const EditarTrabajadorModal = ({ open, onClose, onSave, trabajador }) => {
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "error",
  });

  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    desde: "",
    hasta: "",
    active: true,
  });

  useEffect(() => {
    if (trabajador) {
      setFormData({
        nombre: trabajador.nombre || "",
        apellido: trabajador.apellido || "",
        dni: trabajador.dni || "",
        desde: trabajador.desde ? new Date(trabajador.desde).toISOString().split("T")[0] : "",
        hasta: trabajador.hasta ? new Date(trabajador.hasta).toISOString().split("T")[0] : "",
        active: trabajador.active !== undefined ? trabajador.active : true,
      });
    }
  }, [trabajador]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.apellido || !formData.dni || !formData.desde) {
      setAlert({
        open: true,
        message: "Por favor complete todos los campos requeridos",
        severity: "error",
      });
      return;
    }

    setIsLoading(true);
    try {
      await TrabajadorService.update(trabajador._id, formData);
      
      setAlert({
        open: true,
        message: "Trabajador actualizado correctamente",
        severity: "success",
      });

      setTimeout(() => {
        if (onSave) {
          onSave(formData);
        }
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error al actualizar trabajador:', error);
      setAlert({
        open: true,
        message: error.response?.data?.error || "Error al actualizar el trabajador",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setAlert({ ...alert, open: false });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Snackbar anchorOrigin={{ vertical: "top", horizontal: "center" }} open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: "100%" }}>
          {alert.message}
        </Alert>
      </Snackbar>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Editar Trabajador
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
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", height: "100%", mt: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.active}
                      onChange={(e) => handleInputChange("active", e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Activo"
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={isLoading}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSave} 
          color="primary" 
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : null}
        >
          {isLoading ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditarTrabajadorModal;

