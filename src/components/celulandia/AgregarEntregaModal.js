import React, { useState, useEffect } from "react";
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
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import cuentasPendientesService from "src/services/celulandia/cuentasPendientesService";
import { getUser } from "src/utils/celulandia/currentUser";
import { useMovimientoForm } from "src/hooks/useMovimientoForm";

const AgregarEntregaModal = ({ open, onClose, onSaved, clientes = [], tipoDeCambio }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState("");

  const {
    formData,
    clienteSeleccionado,
    getCCOptions,
    handleMontoEnviado,
    handleInputChange,
    handleClienteChange,
    resetForm,
  } = useMovimientoForm(null, { clientes, tipoDeCambio });

  // Convertir porcentaje a factor: 5% -> 0.95, 10% -> 0.90
  const factorDescuento = 1 - (parseFloat(descuentoPorcentaje) || 0) / 100;

  const montoCCConDescuento = Math.round((parseFloat(formData.montoCC) || 0) * factorDescuento);

  useEffect(() => {
    if (clienteSeleccionado && clienteSeleccionado.descuento !== undefined) {
      const porcentajeCliente = (clienteSeleccionado.descuento || 0) * 100;
      setDescuentoPorcentaje(porcentajeCliente.toString());
    } else {
      setDescuentoPorcentaje("");
    }
  }, [clienteSeleccionado]);

  const handleSave = async () => {
    if (!formData.cliente || !formData.montoEnviado) {
      alert("Completá los campos requeridos");
      return;
    }
    setIsSaving(true);
    try {
      const monto = parseFloat(formData.montoEnviado) || 0;

      // Determinar el tipo de cambio que se va a usar para los cálculos
      let tipoDeCambioFinal;

      // Para subTotal se usa el tipo de cambio según la moneda de pago
      if (formData.monedaDePago === "USD") {
        tipoDeCambioFinal = tipoDeCambio?.oficial?.venta || tipoDeCambio?.oficial || 1;
      } else {
        // Si es ARS, usamos el tipo de cambio de la cuenta corriente para conversión
        if (formData.CC === "USD BLUE") {
          tipoDeCambioFinal = tipoDeCambio?.blue?.venta || tipoDeCambio?.blue || 1;
        } else {
          tipoDeCambioFinal = tipoDeCambio?.oficial?.venta || tipoDeCambio?.oficial || 1;
        }
      }

      const subTotal = {
        ars: -(formData.monedaDePago === "ARS" ? monto : Math.round(monto * tipoDeCambioFinal)),
        usdOficial: -(formData.monedaDePago === "USD"
          ? monto
          : Math.round(monto / tipoDeCambioFinal)),
        usdBlue: -(formData.monedaDePago === "USD"
          ? monto
          : Math.round(monto / (tipoDeCambio?.blue?.venta || tipoDeCambio?.blue || 1))),
      };

      const montoTotal = {
        ars: -(formData.CC === "ARS"
          ? montoCCConDescuento
          : Math.round(montoCCConDescuento * tipoDeCambioFinal)),
        usdOficial: -(formData.CC === "USD OFICIAL"
          ? montoCCConDescuento
          : Math.round(montoCCConDescuento / tipoDeCambioFinal)),
        usdBlue: -(formData.CC === "USD BLUE"
          ? montoCCConDescuento
          : Math.round(
              montoCCConDescuento / (tipoDeCambio?.blue?.venta || tipoDeCambio?.blue || 1)
            )),
      };

      const payload = {
        descripcion: formData.concepto,
        proveedorOCliente: formData.cliente,
        fechaCuenta: new Date(),
        fechaCreacion: new Date(),
        descuentoAplicado: factorDescuento,
        subTotal,
        montoTotal,
        moneda: formData.monedaDePago,
        cc: formData.CC,
        tipoDeCambio: tipoDeCambioFinal,
        usuario: getUser(),
      };

      const result = await cuentasPendientesService.create(payload);
      if (result.success) {
        onSaved && onSaved(result.data);
        onClose();
      } else {
        alert(result.error || "Error al crear la entrega");
      }
    } catch (err) {
      console.error(err);
      alert("Error al crear la entrega");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setDescuentoPorcentaje("");
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Nueva Entrega</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={Array.isArray(clientes) ? clientes : []}
                getOptionLabel={(option) => (typeof option === "string" ? option : option.nombre)}
                value={formData.cliente}
                inputValue={formData.cliente || ""}
                onInputChange={(_, newInputValue) => handleInputChange("cliente", newInputValue)}
                onChange={handleClienteChange}
                renderInput={(params) => (
                  <TextField {...params} label="Cliente *" margin="normal" required fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Descripción"
                value={formData.concepto || ""}
                onChange={(e) => handleInputChange("concepto", e.target.value)}
                margin="normal"
              />
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
                >
                  <MenuItem value="ARS">ARS</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monto CC"
                type="number"
                value={montoCCConDescuento}
                margin="normal"
                disabled
                helperText="Calculado automáticamente con descuento"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Cuenta Corriente *</InputLabel>
                <Select
                  value={formData.CC}
                  label="Cuenta Corriente *"
                  onChange={(e) => handleInputChange("CC", e.target.value)}
                >
                  {getCCOptions().map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Descuento (%)"
                type="number"
                value={descuentoPorcentaje}
                onChange={(e) => setDescuentoPorcentaje(e.target.value)}
                margin="normal"
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Usuario"
                value={formData.usuario}
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
          {isSaving ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgregarEntregaModal;
