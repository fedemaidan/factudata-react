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
import TrabajoRegistradoService from "src/services/dhn/TrabajoRegistradoService";

const EditarTrabajoDiarioModal = ({ open, onClose, onSave, trabajoDiario }) => {
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "error",
  });

  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    fecha: "",
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

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!formData.fecha) {
      setAlert({
        open: true,
        message: "Por favor complete la fecha",
        severity: "error",
      });
      return;
    }

    setIsLoading(true);
    try {
      await TrabajoRegistradoService.update(trabajoDiario._id, formData);
      
      setAlert({
        open: true,
        message: "Trabajo diario actualizado correctamente",
        severity: "success",
      });

      setTimeout(() => {
        if (onSave) {
          onSave(formData);
        }
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error al actualizar trabajo diario:', error);
      setAlert({
        open: true,
        message: error.response?.data?.error || "Error al actualizar el trabajo diario",
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

export default EditarTrabajoDiarioModal;

