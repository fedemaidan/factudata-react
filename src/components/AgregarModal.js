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
} from "@mui/material";

const AgregarModal = ({ open, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    numeroComprobante: "",
    fecha: new Date().toISOString().split("T")[0], // Fecha actual
    hora: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    cliente: "",
    cuentaDestino: "ENSHOP SRL",
    montoEnviado: "",
    monedaDePago: "ARS",
    CC: "ARS",
    montoCC: "",
    tipoDeCambio: "1",
    estado: "PENDIENTE",
    usuario: "Martin Sorby",
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    // Validar campos requeridos
    if (!formData.numeroComprobante || !formData.cliente || !formData.montoEnviado) {
      alert("Por favor complete todos los campos requeridos");
      return;
    }

    // Convertir montos a números
    const datosParaGuardar = {
      ...formData,
      montoEnviado: parseFloat(formData.montoEnviado) || 0,
      montoCC: parseFloat(formData.montoCC) || 0,
      tipoDeCambio: parseFloat(formData.tipoDeCambio) || 0,
      id: Date.now(), // Generar ID único
    };

    onSave(datosParaGuardar);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      numeroComprobante: "",
      fecha: new Date().toISOString().split("T")[0],
      hora: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      cliente: "",
      cuentaDestino: "ENSHOP SRL",
      montoEnviado: "",
      monedaDePago: "ARS",
      CC: "ARS",
      montoCC: "",
      tipoDeCambio: "1",
      estado: "PENDIENTE",
      usuario: "Martin Sorby",
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Nuevo Comprobante
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Número de Comprobante *"
                value={formData.numeroComprobante}
                onChange={(e) => handleInputChange("numeroComprobante", e.target.value)}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cliente *"
                value={formData.cliente}
                onChange={(e) => handleInputChange("cliente", e.target.value)}
                margin="normal"
                required
              />
            </Grid>
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
                label="Hora *"
                value={formData.hora}
                onChange={(e) => handleInputChange("hora", e.target.value)}
                margin="normal"
                placeholder="HH:MM"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Cuenta Destino *</InputLabel>
                <Select
                  value={formData.cuentaDestino}
                  label="Cuenta Destino *"
                  onChange={(e) => handleInputChange("cuentaDestino", e.target.value)}
                  required
                >
                  <MenuItem value="ENSHOP SRL">ENSHOP SRL</MenuItem>
                  <MenuItem value="FINANCIERA">FINANCIERA</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monto *"
                type="number"
                value={formData.montoEnviado}
                onChange={(e) => handleInputChange("montoEnviado", e.target.value)}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Moneda de Pago *</InputLabel>
                <Select
                  value={formData.monedaDePago}
                  label="Moneda de Pago *"
                  onChange={(e) => handleInputChange("monedaDePago", e.target.value)}
                  required
                >
                  <MenuItem value="ARS">ARS</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Cuenta Corriente *</InputLabel>
                <Select
                  value={formData.CC}
                  label="Cuenta Corriente *"
                  onChange={(e) => handleInputChange("CC", e.target.value)}
                  required
                >
                  <MenuItem value="ARS">ARS</MenuItem>
                  <MenuItem value="USD BLUE">USD BLUE</MenuItem>
                  <MenuItem value="USD OFICIAL">USD OFICIAL</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tipo de Cambio"
                type="number"
                value={formData.tipoDeCambio}
                onChange={(e) => handleInputChange("tipoDeCambio", e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Estado *</InputLabel>
                <Select
                  value={formData.estado}
                  label="Estado *"
                  onChange={(e) => handleInputChange("estado", e.target.value)}
                  required
                >
                  <MenuItem value="CONFIRMADO">CONFIRMADO</MenuItem>
                  <MenuItem value="PENDIENTE">PENDIENTE</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Usuario"
                value={formData.usuario}
                onChange={(e) => handleInputChange("usuario", e.target.value)}
                margin="normal"
                disabled
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Cancelar
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Agregar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgregarModal;
