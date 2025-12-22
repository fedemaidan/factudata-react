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
import TrabajoRegistradoService from "src/services/dhn/TrabajoRegistradoService";
import useModalAlert from "src/hooks/useModalAlert";

const EditarTrabajoDiarioModal = ({ open, onClose, onSave, trabajoDiario }) => {
  const { alert, showAlert, closeAlert } = useModalAlert(open);

  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    fecha: "",
    horasTrabajadas: "",
    horasNormales: "",
    horas50: "",
    horas100: "",
    horasAltura: "",
    horasHormigon: "",
    horasZanjeo: "",
    fechaLicencia: false,
  });

  useEffect(() => {
    if (trabajoDiario) {
      setFormData({
        fecha: trabajoDiario.fecha ? new Date(trabajoDiario.fecha).toISOString().split("T")[0] : "",
        horasTrabajadas: trabajoDiario.horasTrabajadasExcel?.total ?? "",
        horasNormales: trabajoDiario.horasNormales ?? "",
        horas50: trabajoDiario.horas50 ?? "",
        horas100: trabajoDiario.horas100 ?? "",
        horasAltura: trabajoDiario.horasAltura ?? "",
        horasHormigon: trabajoDiario.horasHormigon ?? "",
        horasZanjeo: trabajoDiario.horasZanjeo ?? "",
        fechaLicencia: trabajoDiario.fechaLicencia || false,
      });
    }
  }, [trabajoDiario]);

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
    if (!formData.fecha) {
      showAlert({ message: "Por favor complete la fecha", severity: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const originalFechaDay = trabajoDiario?.fecha
        ? new Date(trabajoDiario.fecha).toISOString().split("T")[0]
        : "";

      const shouldUpdateFecha = Boolean(formData.fecha && formData.fecha !== originalFechaDay);

      const buildNoonISO = (yyyyMmDd) => `${yyyyMmDd}T12:00:00.000Z`;

      const payload = {
        ...formData,
        ...(shouldUpdateFecha ? { fecha: buildNoonISO(formData.fecha) } : {}),
        horasTrabajadasExcel: {
          ...trabajoDiario.horasTrabajadasExcel,
          total: formData.horasTrabajadas ? parseFloat(formData.horasTrabajadas) : null
        }
      };
      
      delete payload.horasTrabajadas;
      if (!shouldUpdateFecha) delete payload.fecha;
      
      await TrabajoRegistradoService.update(trabajoDiario._id, payload);
      
      showAlert({ message: "Trabajo diario actualizado correctamente", severity: "success" });

      setTimeout(() => {
        if (onSave) {
          onSave(formData);
        }
        if (typeof onClose === "function") onClose();
      }, 500);
    } catch (error) {
      console.error('Error al actualizar trabajo diario:', error);
      showAlert({
        message: error.response?.data?.error || "Error al actualizar el trabajo diario",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = useCallback(() => {
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
            Editar Trabajo Diario
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha *"
                type="date"
                value={formData.fecha}
                onChange={(e) => handleInputChange("fecha", e.target.value)}
                margin="normal"
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Horas Normales"
                type="number"
                value={formData.horasNormales}
                onChange={(e) => handleInputChange("horasNormales", e.target.value)}
                margin="normal"
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Horas 50%"
                type="number"
                value={formData.horas50}
                onChange={(e) => handleInputChange("horas50", e.target.value)}
                margin="normal"
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Horas 100%"
                type="number"
                value={formData.horas100}
                onChange={(e) => handleInputChange("horas100", e.target.value)}
                margin="normal"
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Horas Altura"
                type="number"
                value={formData.horasAltura}
                onChange={(e) => handleInputChange("horasAltura", e.target.value)}
                margin="normal"
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Horas Hormigón"
                type="number"
                value={formData.horasHormigon}
                onChange={(e) => handleInputChange("horasHormigon", e.target.value)}
                margin="normal"
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Horas Zanjeo"
                type="number"
                value={formData.horasZanjeo}
                onChange={(e) => handleInputChange("horasZanjeo", e.target.value)}
                margin="normal"
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", height: "100%", mt: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.fechaLicencia}
                      onChange={(e) => handleInputChange("fechaLicencia", e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Fecha Licencia"
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

export default EditarTrabajoDiarioModal;

