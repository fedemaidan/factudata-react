import React, { useState, useMemo } from "react";
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

const AgregarEntregaModal = ({ open, onClose, onSaved, clientes = [], tipoDeCambio }) => {
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    proveedorOCliente: "",
    descripcion: "",
    montoEnviado: "",
    moneda: "ARS",
    cc: "ARS",
    descuentoAplicado: 1,
  });

  const getTipoDeCambio = (moneda, cc) => {
    if ((moneda === "ARS" && cc === "ARS") || (moneda === "USD" && cc !== "ARS")) {
      return 1;
    }
    if (moneda === "ARS" && cc === "USD OFICIAL")
      return tipoDeCambio?.oficial?.venta || tipoDeCambio?.oficial || 1;
    if (moneda === "ARS" && cc === "USD BLUE")
      return tipoDeCambio?.blue?.venta || tipoDeCambio?.blue || 1;
    if (moneda === "USD" && cc === "ARS")
      return tipoDeCambio?.blue?.venta || tipoDeCambio?.blue || 1;
    return 1;
  };

  const montoCC = useMemo(() => {
    const monto = parseFloat(formData.montoEnviado) || 0;
    const tc = getTipoDeCambio(formData.moneda, formData.cc);
    let base = monto;
    if (
      formData.moneda === "ARS" &&
      (formData.cc === "USD OFICIAL" || formData.cc === "USD BLUE")
    ) {
      base = monto / tc;
    } else if (formData.moneda === "USD" && formData.cc === "ARS") {
      base = monto * tc;
    }
    const factor = parseFloat(formData.descuentoAplicado) || 1;
    return Math.round(base * factor);
  }, [
    getTipoDeCambio,
    formData.montoEnviado,
    formData.moneda,
    formData.cc,
    formData.descuentoAplicado,
  ]);

  const handleInput = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.proveedorOCliente || !formData.montoEnviado) {
      alert("Completá los campos requeridos");
      return;
    }
    setIsSaving(true);
    try {
      const monto = parseFloat(formData.montoEnviado) || 0;
      const tc = getTipoDeCambio(formData.moneda, formData.cc);
      // subTotal y montoTotal según schema (guardamos en las 3 monedas)
      const subTotal = {
        ars:
          formData.moneda === "ARS"
            ? monto
            : Math.round(monto * (tipoDeCambio?.oficial?.venta || tipoDeCambio?.oficial || 1)),
        usdOficial:
          formData.moneda === "USD"
            ? monto
            : Math.round(monto / (tipoDeCambio?.oficial?.venta || tipoDeCambio?.oficial || 1)),
        usdBlue:
          formData.moneda === "USD"
            ? monto
            : Math.round(monto / (tipoDeCambio?.blue?.venta || tipoDeCambio?.blue || 1)),
      };
      const montoTotal = {
        ars:
          formData.cc === "ARS"
            ? montoCC
            : Math.round(montoCC * (tipoDeCambio?.oficial?.venta || tipoDeCambio?.oficial || 1)),
        usdOficial:
          formData.cc === "USD OFICIAL"
            ? montoCC
            : Math.round(montoCC / (tipoDeCambio?.oficial?.venta || tipoDeCambio?.oficial || 1)),
        usdBlue:
          formData.cc === "USD BLUE"
            ? montoCC
            : Math.round(montoCC / (tipoDeCambio?.blue?.venta || tipoDeCambio?.blue || 1)),
      };

      const payload = {
        descripcion: formData.descripcion,
        proveedorOCliente: formData.proveedorOCliente,
        fechaCuenta: new Date(),
        fechaCreacion: new Date(),
        descuentoAplicado: parseFloat(formData.descuentoAplicado) || 1,
        subTotal,
        montoTotal,
        moneda: formData.moneda,
        cc: formData.cc,
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
    setFormData({
      proveedorOCliente: "",
      descripcion: "",
      montoEnviado: "",
      moneda: "ARS",
      cc: "ARS",
      descuentoAplicado: 1,
    });
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
                value={formData.proveedorOCliente}
                onChange={(_, val) =>
                  handleInput(
                    "proveedorOCliente",
                    typeof val === "string" ? val : val?.nombre || ""
                  )
                }
                renderInput={(params) => (
                  <TextField {...params} label="Cliente *" margin="normal" required fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Descripción"
                value={formData.descripcion}
                onChange={(e) => handleInput("descripcion", e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Monto *"
                type="number"
                value={formData.montoEnviado}
                onChange={(e) => handleInput("montoEnviado", e.target.value)}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Moneda *</InputLabel>
                <Select
                  value={formData.moneda}
                  label="Moneda *"
                  onChange={(e) => handleInput("moneda", e.target.value)}
                >
                  <MenuItem value="ARS">ARS</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Cuenta Corriente *</InputLabel>
                <Select
                  value={formData.cc}
                  label="Cuenta Corriente *"
                  onChange={(e) => handleInput("cc", e.target.value)}
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
                label="Descuento (factor)"
                type="number"
                value={formData.descuentoAplicado}
                onChange={(e) => handleInput("descuentoAplicado", e.target.value)}
                margin="normal"
                helperText="Ej: 1 = sin descuento, 0.95 = 5% desc."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monto CC"
                type="number"
                value={montoCC}
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
