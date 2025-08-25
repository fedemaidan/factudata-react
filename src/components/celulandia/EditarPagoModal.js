import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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

const EditarPagoModal = ({ open, onClose, data, onSave, cajas }) => {
  const [isSaving, setIsSaving] = useState(false);

  // Procesar data para mostrar montos en positivo
  const processedData = data
    ? {
        ...data,
        montoEnviado: data.total?.ars ? Math.abs(data.total.ars).toString() : "0",
      }
    : null;

  const { formData, handleMontoEnviado, handleInputChange } = useMovimientoForm(
    processedData,
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
      const monto = parseFloat(formData.montoEnviado) || 0;

      const datosParaGuardar = {
        cliente: data?.cliente || { nombre: "PAGO" },
        cuentaCorriente: "ARS",
        moneda: formData.monedaDePago,
        tipoFactura: "transferencia",
        caja: cajaId,
        nombreUsuario: getUser(),
        tipoDeCambio: 1,
        concepto: formData.concepto || data?.concepto || "",
        // Convertir monto a negativo para backend (como en EditarEntregaModal)
        total: {
          ars: -(formData.monedaDePago === "ARS" ? monto : monto),
          usdOficial: -(formData.monedaDePago === "USD" ? monto : monto),
          usdBlue: -(formData.monedaDePago === "USD" ? monto : monto),
        },
      };

      // Enviar solo cambios
      const camposModificados = {};
      Object.keys(datosParaGuardar).forEach((key) => {
        if (key === "caja") {
          if (datosParaGuardar[key] !== data?.caja?._id) {
            camposModificados[key] = datosParaGuardar[key];
          }
        } else if (key === "total") {
          // Comparar total objeto por objeto
          if (JSON.stringify(datosParaGuardar[key]) !== JSON.stringify(data?.[key])) {
            camposModificados[key] = datosParaGuardar[key];
          }
        } else if (datosParaGuardar[key] !== data?.[key]) {
          camposModificados[key] = datosParaGuardar[key];
        }
      });

      if (Object.keys(camposModificados).length === 0) {
        alert("No hay cambios para guardar");
        onClose();
        return;
      }

      const result = await movimientosService.updateMovimiento(
        data._id,
        camposModificados,
        getUser()
      );
      if (result.success) {
        onSave();
        onClose();
      } else {
        alert(result.error || "Error al actualizar el pago");
      }
    } catch (error) {
      console.error("Error al actualizar pago:", error);
      alert("Error al actualizar el pago. Por favor, intente nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>Editar Pago</DialogTitle>
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
        <Button onClick={handleCancel} color="inherit" disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={16} /> : null}
        >
          {isSaving ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditarPagoModal;
