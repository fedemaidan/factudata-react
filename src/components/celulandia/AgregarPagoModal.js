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
  CircularProgress,
} from "@mui/material";
import { useMovimientoForm } from "src/hooks/useMovimientoForm";
import movimientosService from "src/services/celulandia/movimientosService";
import { getUser } from "src/utils/celulandia/currentUser";

// Objeto inicial constante para evitar re-renders
const initialPagoData = {
  cliente: { nombre: "PAGO" },
  cuentaDestino: "ENSHOP SRL",
  moneda: "ARS",
  cuentaCorriente: "ARS",
  estado: "CONFIRMADO",
  concepto: "",
};

const AgregarPagoModal = ({ open, onClose, onSave, cajas }) => {
  const [isSaving, setIsSaving] = useState(false);

  const { formData, handleMontoEnviado, handleInputChange, resetForm } = useMovimientoForm(
    initialPagoData,
    null
  );

  const handleSave = async () => {
    if (!formData.cuentaDestino || !formData.montoEnviado) {
      alert("Por favor complete todos los campos requeridos");
      return;
    }

    setIsSaving(true);
    try {
      const cajaId = cajas.find((caja) => caja.nombre === formData.cuentaDestino)?._id;
      const payload = {
        movimiento: {
          type: "EGRESO",
          cliente: { nombre: "PAGO" },
          cuentaCorriente: "ARS",
          moneda: formData.monedaDePago,
          tipoFactura: "transferencia",
          caja: cajaId,
          nombreUsuario: getUser(),
          tipoDeCambio: 1,
          estado: "CONFIRMADO",
          concepto: formData.concepto || "",
          empresaId: "celulandia",
          fechaFactura: new Date(),
        },
        montoEnviado: -1 * formData.montoEnviado,
      };

      const result = await movimientosService.createMovimiento(payload);

      if (result.success) {
        onSave(result.data);
        handleClose();
      } else {
        alert(result.error || "Error al crear el pago");
      }
    } catch (error) {
      console.error("Error al crear pago:", error);
      alert("Error al crear el pago. Por favor, intente nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Nuevo Pago
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Concepto"
                value={formData.concepto || ""}
                onChange={(e) => handleInputChange("concepto", e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Cuenta Origen *</InputLabel>
                <Select
                  value={formData.cuentaDestino}
                  label="Cuenta Origen *"
                  onChange={(e) => handleInputChange("cuentaDestino", e.target.value)}
                  required
                >
                  {cajas?.map((caja) => (
                    <MenuItem key={caja._id} value={caja.nombre}>
                      {caja.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monto *"
                type="number"
                value={formData.montoEnviado}
                helperText={
                  formData.montoEnviado < 0
                    ? "Recuerde que el monto se multiplicará por -1 antes de enviar"
                    : ""
                }
                onChange={(e) => handleMontoEnviado(e.target.value)}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Moneda *</InputLabel>
                <Select
                  value={formData.monedaDePago}
                  label="Moneda *"
                  onChange={(e) => handleInputChange("monedaDePago", e.target.value)}
                  required
                >
                  <MenuItem value="ARS">ARS</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {/* Campos específicos de pagos: sin CC, sin Monto CC, sin Tipo de Cambio */}
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
        <Button onClick={handleClose} color="inherit" disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={16} /> : null}
        >
          {isSaving ? "Agregando..." : "Agregar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgregarPagoModal;
