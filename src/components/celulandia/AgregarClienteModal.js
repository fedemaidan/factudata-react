import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  OutlinedInput,
  FormHelperText,
  CircularProgress,
} from "@mui/material";
import clientesService from "src/services/celulandia/clientesService";
import { getUser } from "src/utils/celulandia/currentUser";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const ccOptions = ["ARS", "USD BLUE", "USD OFICIAL"];

const AgregarClienteModal = ({ open, onClose, onSave }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    descuento: 0,
    ccActivas: ["ARS"],
    usuario: getUser(),
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido";
    }

    if (formData.descuento < 0 || formData.descuento > 1) {
      newErrors.descuento = "El descuento debe estar entre 0 y 1 (ej: 0.05 = 5%, 0.15 = 15%)";
    }

    if (!formData.ccActivas || formData.ccActivas.length === 0) {
      newErrors.ccActivas = "Debe seleccionar al menos una cuenta corriente";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleDescuentoChange = (value) => {
    const descuento = parseFloat(value) || 0;
    handleInputChange("descuento", descuento);
  };

  const handleCCActivasChange = (event) => {
    const {
      target: { value },
    } = event;

    // Convertir a array si es string
    const ccActivas = typeof value === "string" ? value.split(",") : value;
    handleInputChange("ccActivas", ccActivas);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await clientesService.createCliente(formData);

      if (result.success) {
        onSave(result.data);
        handleClose();
      } else {
        alert(result.error || "Error al crear el cliente");
      }
    } catch (error) {
      console.error("Error al crear cliente:", error);
      alert("Error al crear el cliente. Por favor, intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      nombre: "",
      descuento: 0,
      ccActivas: ["ARS"],
      usuario: getUser(),
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Nuevo Cliente
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                variant="standard"
                label="Nombre del Cliente *"
                value={formData.nombre}
                onChange={(e) => handleInputChange("nombre", e.target.value)}
                margin="normal"
                required
                error={!!errors.nombre}
                helperText={errors.nombre}
                disabled={isLoading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                variant="standard"
                label="Descuento (0-1) *"
                type="number"
                value={formData.descuento}
                onChange={(e) => handleDescuentoChange(e.target.value)}
                margin="normal"
                required
                error={!!errors.descuento}
                helperText={
                  errors.descuento || `Descuento actual: ${(formData.descuento * 100).toFixed(0)}%`
                }
                inputProps={{
                  min: 0,
                  max: 1,
                  step: 0.01,
                }}
                disabled={isLoading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal" error={!!errors.ccActivas}>
                <InputLabel variant="standard">Cuentas Corrientes Activas *</InputLabel>
                <Select
                  variant="standard"
                  multiple
                  value={formData.ccActivas}
                  onChange={handleCCActivasChange}
                  input={<OutlinedInput label="Cuentas Corrientes Activas *" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={value}
                          size="small"
                          sx={{
                            backgroundColor:
                              value === "USD BLUE"
                                ? "#aadcac"
                                : value === "USD OFICIAL"
                                ? "#C8E6C9"
                                : "#E3F2FD",
                            color:
                              value === "USD BLUE"
                                ? "#1B5E20"
                                : value === "USD OFICIAL"
                                ? "#33691E"
                                : "#1565C0",
                            fontWeight: "bold",
                            fontSize: "0.7rem",
                            height: "20px",
                          }}
                        />
                      ))}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                  disabled={isLoading}
                >
                  {ccOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
                {errors.ccActivas && <FormHelperText>{errors.ccActivas}</FormHelperText>}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                variant="standard"
                label="Usuario"
                value={formData.usuario}
                margin="normal"
                disabled={true}
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
          {isLoading ? "Creando..." : "Crear Cliente"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgregarClienteModal;
