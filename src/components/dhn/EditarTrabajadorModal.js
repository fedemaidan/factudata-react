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
  FormControlLabel,
  Checkbox,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import TrabajadorService from "src/services/dhn/TrabajadorService";
import { getUser } from "src/utils/celulandia/currentUser";
import useModalAlert from "src/hooks/useModalAlert";

const EditarTrabajadorModal = ({ open, onClose, onSave, trabajador }) => {
  const { alert, showAlert, closeAlert } = useModalAlert(open);

  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    desde: "",
    hasta: "",
    active: true,
  });

  const [initialFormData, setInitialFormData] = useState(null);

  useEffect(() => {
    // Evitar que quede el loader activo entre aperturas
    if (!open) setIsLoading(false);
  }, [open]);

  useEffect(() => {
    if (trabajador) {
      const next = {
        nombre: trabajador.nombre || "",
        apellido: trabajador.apellido || "",
        dni: trabajador.dni || "",
        desde: trabajador.desde ? new Date(trabajador.desde).toISOString().split("T")[0] : "",
        hasta: trabajador.hasta ? new Date(trabajador.hasta).toISOString().split("T")[0] : "",
        active: trabajador.active !== undefined ? trabajador.active : true,
      };
      setFormData(next);
      setInitialFormData(next);
    }
  }, [trabajador]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const buildIsoNoonUtc = (yyyyMmDd) => {
    if (!yyyyMmDd) return null;
    // Evita cambios por zona horaria comparado con medianoche
    return new Date(`${yyyyMmDd}T12:00:00.000Z`);
  };

  const buildPatch = () => {
    if (!initialFormData) return { ...formData };

    const patch = {};

    const norm = (v) => (v || "").toString().trim();

    if (norm(formData.nombre) !== norm(initialFormData.nombre)) patch.nombre = norm(formData.nombre);
    if (norm(formData.apellido) !== norm(initialFormData.apellido)) patch.apellido = norm(formData.apellido);
    if (norm(formData.dni) !== norm(initialFormData.dni)) patch.dni = norm(formData.dni);

    if ((formData.active ?? true) !== (initialFormData.active ?? true)) patch.active = !!formData.active;

    if ((formData.desde || "") !== (initialFormData.desde || "")) {
      patch.desde = buildIsoNoonUtc(formData.desde);
    }

    if ((formData.hasta || "") !== (initialFormData.hasta || "")) {
      patch.hasta = formData.hasta ? buildIsoNoonUtc(formData.hasta) : null;
    }

    return patch;
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.apellido || !formData.dni || !formData.desde) {
      showAlert({ message: "Por favor complete todos los campos requeridos", severity: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const patch = buildPatch();
      if (!patch || Object.keys(patch).length === 0) {
        showAlert({ message: "No hay cambios para guardar", severity: "info" });
        setIsLoading(false);
        return;
      }

      await TrabajadorService.update(trabajador._id, { ...patch, user: getUser() });
      
      showAlert({ message: "Trabajador actualizado correctamente", severity: "success" });

      setTimeout(() => {
        if (onSave) {
          onSave(formData);
        }
        if (typeof onClose === "function") onClose();
      }, 500);
    } catch (error) {
      console.error('Error al actualizar trabajador:', error);
      showAlert({
        message: error.response?.data?.error || "Error al actualizar el trabajador",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = useCallback(() => {
    setIsLoading(false);
    if (typeof onClose === "function") onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleCloseModal} maxWidth="md" fullWidth>
      <Snackbar anchorOrigin={{ vertical: "top", horizontal: "center" }} open={alert.open} autoHideDuration={6000} onClose={closeAlert}>
        <Alert onClose={closeAlert} severity={alert.severity} sx={{ width: "100%" }}>
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
        <Button onClick={handleCloseModal} color="inherit" disabled={isLoading}>
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

