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
  const [fechaEntrega, setFechaEntrega] = useState("");

  const {
    formData,
    clienteSeleccionado,
    getCCOptions,
    getTipoDeCambio,
    tipoDeCambioManual,
    handleTipoDeCambioChange,
    handleMontoEnviado,
    handleInputChange,
    handleClienteChange,
    resetForm,
  } = useMovimientoForm(null, { clientes, tipoDeCambio });

  // Convertir porcentaje a factor: 5% -> 0.95, 10% -> 0.90
  const factorDescuento = 1 - (parseFloat(descuentoPorcentaje) || 0) / 100;
  const subtotalEntrega = Math.round(parseFloat(formData.montoCC) || 0);
  const totalEntrega = Math.round(subtotalEntrega * factorDescuento);

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
      const tcOficial = tipoDeCambio?.oficial?.venta || tipoDeCambio?.oficial || 1;
      const tcBlue = tipoDeCambio?.blue?.venta || tipoDeCambio?.blue || 1;

      // Subtotal basado en el monto CC calculado por el hook (como en AgregarModal)
      let subTotal = { ars: 0, usdOficial: 0, usdBlue: 0 };
      if (formData.CC === "ARS") {
        subTotal = {
          ars: -subtotalEntrega,
          usdOficial: -Math.round(subtotalEntrega / tcOficial),
          usdBlue: -Math.round(subtotalEntrega / tcBlue),
        };
      } else if (formData.CC === "USD OFICIAL") {
        subTotal = {
          ars: -Math.round(subtotalEntrega * tcOficial),
          usdOficial: -subtotalEntrega,
          usdBlue: -subtotalEntrega,
        };
      } else if (formData.CC === "USD BLUE") {
        subTotal = {
          ars: -Math.round(subtotalEntrega * tcBlue),
          usdOficial: -subtotalEntrega,
          usdBlue: -subtotalEntrega,
        };
      }

      // Total con descuento aplicado
      let montoTotal = { ars: 0, usdOficial: 0, usdBlue: 0 };
      if (formData.CC === "ARS") {
        montoTotal = {
          ars: -totalEntrega,
          usdOficial: -Math.round(totalEntrega / tcOficial),
          usdBlue: -totalEntrega,
        };
      } else if (formData.CC === "USD OFICIAL") {
        montoTotal = {
          ars: -Math.round(totalEntrega * tcOficial),
          usdOficial: -totalEntrega,
          usdBlue: -totalEntrega,
        };
      } else if (formData.CC === "USD BLUE") {
        montoTotal = {
          ars: -Math.round(totalEntrega * tcBlue),
          usdOficial: -totalEntrega,
          usdBlue: -totalEntrega,
        };
      }

      // Crear fecha completa con hora por defecto (12:00) si se especificó fecha
      let fechaCuentaCompleta = new Date();
      if (fechaEntrega) {
        const [year, month, day] = fechaEntrega.split("-");
        fechaCuentaCompleta = new Date(
          parseInt(year),
          parseInt(month) - 1, // Los meses en JS van de 0 a 11
          parseInt(day),
          12, // hora por defecto: 12:00
          0, // minuto por defecto: 00
          0, // segundos
          0 // milisegundos
        );
      }

      const payload = {
        descripcion: formData.concepto,
        proveedorOCliente: formData.cliente,
        fechaCuenta: fechaCuentaCompleta,
        fechaCreacion: new Date(),
        descuentoAplicado: factorDescuento,
        subTotal,
        montoTotal,
        empresaId: "celulandia",
        moneda: formData.monedaDePago,
        cc: formData.CC,
        tipoDeCambio: getTipoDeCambio(formData.monedaDePago, formData.CC),
        usuario: getUser(),
      };

      const result = await cuentasPendientesService.create(payload);
      if (result.success) {
        onSaved && onSaved(result.data);
        resetForm();
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
    setFechaEntrega("");
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Nueva Entrega</DialogTitle>
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

            {/* Fila 2: Fecha de Entrega - Monto */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de Entrega"
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                margin="normal"
                InputLabelProps={{
                  shrink: true,
                }}
                helperText="Opcional"
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
                helperText={
                  formData.montoEnviado < 0
                    ? "Recuerde que el monto se multiplicará por -1 antes de enviar"
                    : ""
                }
              />
            </Grid>

            {/* Fila 3: Moneda - Cuenta Corriente */}
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

            {/* Fila 4: Cuenta Corriente - Subtotal */}
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

            {/* Fila 4: Subtotal - Total con Descuento */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Subtotal (sin descuento)"
                type="number"
                value={subtotalEntrega}
                margin="normal"
                disabled
                helperText="Calculado automáticamente"
              />
            </Grid>

            {/* Fila 5: Total con Descuento - Descuento */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Total (con descuento)"
                type="number"
                value={totalEntrega}
                margin="normal"
                disabled
                helperText="Con el descuento aplicado"
              />
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

            {/* Fila 6: Usuario - Tipo de Cambio */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Usuario"
                value={formData.usuario}
                margin="normal"
                disabled
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tipo de Cambio"
                type="number"
                value={getTipoDeCambio(formData.monedaDePago, formData.CC)}
                disabled={
                  (formData.monedaDePago === "ARS" && formData.CC === "ARS") ||
                  (formData.monedaDePago === "USD" && formData.CC === "USD BLUE") ||
                  (formData.monedaDePago === "USD" && formData.CC === "USD OFICIAL")
                }
                onChange={(e) => handleTipoDeCambioChange(e.target.value)}
                margin="normal"
                helperText={
                  (formData.monedaDePago === "ARS" && formData.CC === "ARS") ||
                  (formData.monedaDePago === "USD" && formData.CC === "USD BLUE") ||
                  (formData.monedaDePago === "USD" && formData.CC === "USD OFICIAL")
                    ? "No aplica"
                    : tipoDeCambioManual !== null
                    ? "Valor personalizado"
                    : tipoDeCambio?.ultimaActualizacion
                    ? `Última actualización: ${new Date(
                        tipoDeCambio.ultimaActualizacion
                      ).toLocaleString("es-AR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "Valor automático"
                }
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
