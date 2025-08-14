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

const EditarEntregaModal = ({ open, onClose, data, onSaved, clientes = [], tipoDeCambio }) => {
  console.log(data);
  const [isSaving, setIsSaving] = useState(false);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);

  // Resetear loading cuando se abre el modal
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setInitialData(null);
    }
  }, [open]);

  // Procesar datos iniciales cuando están disponibles
  useEffect(() => {
    if (data && Object.keys(data).length > 0 && open) {
      const processedData = {
        _id: data._id,
        cliente: { nombre: data.proveedorOCliente || "" },
        cuentaDestino: "ENSHOP SRL",
        monedaDePago: data.moneda || "ARS",
        moneda: data.moneda || "ARS",
        montoEnviado: Math.abs(data.montoEnviado || 0).toString(), // Convertir a positivo
        CC: data.CC || "ARS",

        cuentaCorriente: data.CC || "ARS",
        montoCC: Math.abs(data.montoCC || 0).toString(), // Convertir a positivo
        estado: "CONFIRMADO",
        concepto: data.descripcion || "",
        usuario: getUser(),
      };
      setDescuentoPorcentaje(
        typeof data.descuentoAplicado === "number"
          ? ((1 - data.descuentoAplicado) * 100).toString()
          : "0"
      );
      setInitialData(processedData);
      setIsLoading(false);
    }
  }, [data, open]);

  const { formData, getCCOptions, handleMontoEnviado, handleInputChange, handleClienteChange } =
    useMovimientoForm(initialData, { clientes, tipoDeCambio });

  const factorDescuento = 1 - (parseFloat(descuentoPorcentaje) || 0) / 100;
  const montoCCConDescuento = Math.round((parseFloat(formData.montoCC) || 0) * factorDescuento);

  const handleSave = async () => {
    if (!formData.cliente || !formData.montoEnviado) {
      alert("Completá los campos requeridos");
      return;
    }
    setIsSaving(true);
    try {
      const monto = parseFloat(formData.montoEnviado) || 0;

      // Detectar si cambiaron inputs que afectan los totales
      const originalMontoAbs = Math.abs(data.montoEnviado || 0);
      const didChangeMonto = originalMontoAbs !== monto;
      const didChangeMoneda = (data.moneda || "ARS") !== formData.monedaDePago;
      const didChangeCC = (data.CC || data.cc || "ARS") !== formData.CC;
      const originalFactor =
        typeof data.descuentoAplicado === "number" ? data.descuentoAplicado : 1;
      const didChangeDescuento = Math.abs(originalFactor - factorDescuento) > 1e-6;
      const cambiosAfectanTotales =
        didChangeMonto || didChangeMoneda || didChangeCC || didChangeDescuento;

      let datosParaGuardar = {
        descripcion: formData.concepto,
        proveedorOCliente: formData.cliente,
        moneda: formData.monedaDePago,
        cc: formData.CC,
      };

      if (didChangeDescuento) {
        datosParaGuardar.descuentoAplicado = factorDescuento;
      }

      if (cambiosAfectanTotales) {
        const subTotal = {
          ars: -(formData.monedaDePago === "ARS"
            ? monto
            : Math.round(monto * (tipoDeCambio?.oficial?.venta || tipoDeCambio?.oficial || 1))),
          usdOficial: -(formData.monedaDePago === "USD"
            ? monto
            : Math.round(monto / (tipoDeCambio?.oficial?.venta || tipoDeCambio?.oficial || 1))),
          usdBlue: -(formData.monedaDePago === "USD"
            ? monto
            : Math.round(monto / (tipoDeCambio?.blue?.venta || tipoDeCambio?.blue || 1))),
        };
        const montoTotal = {
          ars: -(formData.CC === "ARS"
            ? montoCCConDescuento
            : Math.round(
                montoCCConDescuento * (tipoDeCambio?.oficial?.venta || tipoDeCambio?.oficial || 1)
              )),
          usdOficial: -(formData.CC === "USD OFICIAL"
            ? montoCCConDescuento
            : Math.round(
                montoCCConDescuento / (tipoDeCambio?.oficial?.venta || tipoDeCambio?.oficial || 1)
              )),
          usdBlue: -(formData.CC === "USD BLUE"
            ? montoCCConDescuento
            : Math.round(
                montoCCConDescuento / (tipoDeCambio?.blue?.venta || tipoDeCambio?.blue || 1)
              )),
        };
        datosParaGuardar = { ...datosParaGuardar, subTotal, montoTotal };
      }

      const camposModificados = {};
      Object.keys(datosParaGuardar).forEach((key) => {
        if (key === "subTotal" || key === "montoTotal") {
          if (JSON.stringify(datosParaGuardar[key]) !== JSON.stringify(data[key])) {
            camposModificados[key] = datosParaGuardar[key];
          }
        } else {
          if (key === "cc") {
            if (datosParaGuardar[key] !== (data.CC ?? data.cc)) {
              camposModificados[key] = datosParaGuardar[key];
            }
          } else if (datosParaGuardar[key] !== data[key]) {
            camposModificados[key] = datosParaGuardar[key];
          }
        }
      });

      if (Object.keys(camposModificados).length === 0) {
        alert("No hay cambios para guardar");
        onClose();
        return;
      }

      console.log("Campos modificados:", camposModificados);
      const result = await cuentasPendientesService.update(data._id, camposModificados, getUser());
      if (result.success) {
        onSaved && onSaved(result.data);
        onClose();
      } else {
        alert(result.error || "Error al actualizar la entrega");
      }
    } catch (err) {
      console.error(err);
      alert("Error al actualizar la entrega");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
        <DialogTitle>Editar Entrega</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              py: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 200,
            }}
          >
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Box sx={{ textAlign: "center", color: "text.secondary" }}>
              Cargando datos de la entrega...
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="inherit">
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>Editar Entrega</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Grid container spacing={2}>
            {/* Fila 1: Cliente - Descripción */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={Array.isArray(clientes) ? clientes : []}
                getOptionLabel={(option) => (typeof option === "string" ? option : option.nombre)}
                value={formData.cliente}
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

            {/* Fila 3: Monto CC - Cuenta Corriente */}
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

export default EditarEntregaModal;
