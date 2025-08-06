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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from "@mui/material";

const EditarModal = ({ open, onClose, data, onSave }) => {
  const [formData, setFormData] = useState({
    numeroComprobante: "",
    fecha: "",
    hora: "",
    cliente: "",
    cuentaDestino: "",
    montoEnviado: "",
    monedaDePago: "",
    CC: "",
    montoCC: "",
    tipoDeCambio: "",
    estado: "",
    usuario: "",
  });

  // Función para limpiar el formato de moneda y convertir a string para el input
  const limpiarFormatoMoneda = (valor) => {
    if (!valor) return "";
    // Si es un string, remover símbolos de moneda y separadores de miles
    if (typeof valor === "string") {
      return valor.replace(/[^\d.,]/g, "").replace(",", ".");
    }
    // Si es un número, convertirlo a string
    return valor.toString();
  };

  useEffect(() => {
    if (data) {
      setFormData({
        numeroComprobante: data.numeroComprobante || "",
        fecha: data.fecha || "",
        hora: data.hora || "",
        cliente: data.cliente || "",
        cuentaDestino: data.cuentaDestino || "",
        montoEnviado: limpiarFormatoMoneda(data.montoEnviado),
        monedaDePago: data.monedaDePago || "",
        CC: data.CC || "",
        montoCC: limpiarFormatoMoneda(data.montoCC),
        tipoDeCambio: data.tipoDeCambio || "",
        estado: data.estado || "",
        usuario: data.usuario || "",
      });
    }
  }, [data]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    if (onSave && data) {
      // Convertir montos a números antes de guardar
      const datosParaGuardar = {
        ...formData,
        montoEnviado: parseFloat(formData.montoEnviado) || 0,
        montoCC: parseFloat(formData.montoCC) || 0,
        tipoDeCambio: parseFloat(formData.tipoDeCambio) || 0,
      };
      onSave(data.id, datosParaGuardar);
    }
    onClose();
  };

  const handleCancel = () => {
    // Restaurar datos originales
    if (data) {
      setFormData({
        numeroComprobante: data.numeroComprobante || "",
        fecha: data.fecha || "",
        hora: data.hora || "",
        cliente: data.cliente || "",
        cuentaDestino: data.cuentaDestino || "",
        montoEnviado: limpiarFormatoMoneda(data.montoEnviado),
        monedaDePago: data.monedaDePago || "",
        CC: data.CC || "",
        montoCC: limpiarFormatoMoneda(data.montoCC),
        tipoDeCambio: data.tipoDeCambio || "",
        estado: data.estado || "",
        usuario: data.usuario || "",
      });
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Editar Comprobante
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Número de Comprobante"
                value={formData.numeroComprobante}
                onChange={(e) => handleInputChange("numeroComprobante", e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cliente"
                value={formData.cliente}
                onChange={(e) => handleInputChange("cliente", e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => handleInputChange("fecha", e.target.value)}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Hora"
                value={formData.hora}
                onChange={(e) => handleInputChange("hora", e.target.value)}
                margin="normal"
                placeholder="HH:MM"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Cuenta Destino</InputLabel>
                <Select
                  value={formData.cuentaDestino}
                  label="Cuenta Destino"
                  onChange={(e) => handleInputChange("cuentaDestino", e.target.value)}
                >
                  <MenuItem value="ENSHOP SRL">ENSHOP SRL</MenuItem>
                  <MenuItem value="FINANCIERA">FINANCIERA</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monto"
                type="number"
                value={formData.montoEnviado}
                onChange={(e) => handleInputChange("montoEnviado", e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Moneda de Pago</InputLabel>
                <Select
                  value={formData.monedaDePago}
                  label="Moneda de Pago"
                  onChange={(e) => handleInputChange("monedaDePago", e.target.value)}
                >
                  <MenuItem value="ARS">ARS</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Cuenta Corriente</InputLabel>
                <Select
                  value={formData.CC}
                  label="Cuenta Corriente"
                  onChange={(e) => handleInputChange("CC", e.target.value)}
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
                <InputLabel>Estado</InputLabel>
                <Select
                  value={formData.estado}
                  label="Estado"
                  onChange={(e) => handleInputChange("estado", e.target.value)}
                >
                  <MenuItem value="CONFIRMADO">CONFIRMADO</MenuItem>
                  <MenuItem value="PENDIENTE">PENDIENTE</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Usuario"
                value={formData.usuario}
                onChange={(e) => handleInputChange("usuario", e.target.value)}
                margin="normal"
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="inherit">
          Cancelar
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditarModal;
