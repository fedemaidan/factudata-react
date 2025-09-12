import React, { useState, useEffect, useMemo } from "react";
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
import { Autocomplete } from "@mui/material";
import cuentasPendientesService from "src/services/celulandia/cuentasPendientesService";
import { getUser } from "src/utils/celulandia/currentUser";
import { useMovimientoForm } from "src/hooks/useMovimientoForm";

const formatNumberWithThousands = (value) => {
  if (!value || value === 0) return "0";
  return value.toString().replace(/\B((?=(\d{3})+(?!\d)))/g, ".");
};

const AgregarEntregaModal = ({ open, onClose, onSaved, clientes = [], tipoDeCambio }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");

  // Opciones normalizadas para el Autocomplete
  const clienteOptions = useMemo(
    () =>
      (Array.isArray(clientes) ? clientes : []).map((c) =>
        typeof c === "string"
          ? { id: c, label: c }
          : { id: c._id || c.nombre, label: c.nombre, ...c }
      ),
    [clientes]
  );

  // Estado de input visible en el Autocomplete (controlado para validar)
  const [clienteInput, setClienteInput] = useState("");

  // Hook original
  const {
    formData,
    clienteSeleccionado,
    montoFormateado,
    getCCOptions,
    getTipoDeCambio,
    tipoDeCambioManual,
    handleTipoDeCambioChange,
    handleMontoEnviado,
    handleMontoChange,
    handleInputChange,
    handleClienteChange,
    resetForm,
  } = useMovimientoForm(null, { clientes, tipoDeCambio });

  // Calcular totales
  const factorDescuento = 1 - (parseFloat(descuentoPorcentaje) || 0) / 100;
  const subtotalEntrega = Math.round(parseFloat(formData.montoCC) || 0);
  const totalEntrega = Math.round(subtotalEntrega * factorDescuento);

  // Mantener el input del Autocomplete sincronizado con el formData.cliente
  useEffect(() => {
    setClienteInput(formData.cliente || "");
  }, [formData.cliente]);

  // Si el cliente seleccionado tiene descuento, precargar
  useEffect(() => {
    if (clienteSeleccionado && clienteSeleccionado.descuento !== undefined) {
      const porcentajeCliente = (clienteSeleccionado.descuento || 0) * 100;
      setDescuentoPorcentaje(porcentajeCliente.toString());
    } else {
      setDescuentoPorcentaje("");
    }
  }, [clienteSeleccionado]);

  // Validación estricta: ¿lo escrito coincide con una opción?
  const matchesOption = (text) =>
    !!clienteOptions.find(
      (o) => (o.label || "").trim().toUpperCase() === (text || "").trim().toUpperCase()
    );

  const selectedOption =
    clienteOptions.find(
      (o) => (o.label || "").trim().toUpperCase() === (formData.cliente || "").trim().toUpperCase()
    ) || null;

  const invalidCliente = clienteInput !== "" && !matchesOption(clienteInput);

  const handleSave = async () => {
    // Validar que el cliente sea una de las opciones
    if (!formData.cliente || !matchesOption(formData.cliente)) {
      alert("Seleccioná un cliente válido de la lista.");
      return;
    }
    if (!formData.montoEnviado) {
      alert("Completá los campos requeridos");
      return;
    }

    setIsSaving(true);
    try {
      const tcOficial = tipoDeCambio?.oficial?.venta || tipoDeCambio?.oficial || 1;
      const tcBlue = tipoDeCambio?.blue?.venta || tipoDeCambio?.blue || 1;

      let subTotal = { ars: 0, usdOficial: 0, usdBlue: 0 };
      if (formData.CC === "ARS") {
        subTotal = {
          ars: formData.monedaDePago === "ARS" ? -formData.montoEnviado : -subtotalEntrega,
          usdOficial:
            formData.monedaDePago === "USD"
              ? -formData.montoEnviado
              : -Math.round(subtotalEntrega / tcOficial),
          usdBlue:
            formData.monedaDePago === "USD"
              ? -formData.montoEnviado
              : -Math.round(subtotalEntrega / tcBlue),
        };
      } else if (formData.CC === "USD OFICIAL") {
        subTotal = {
          ars:
            formData.monedaDePago === "ARS"
              ? -formData.montoEnviado
              : -Math.round(subtotalEntrega * tcOficial),
          usdOficial: formData.monedaDePago === "USD" ? -formData.montoEnviado : -subtotalEntrega,
          usdBlue: formData.monedaDePago === "USD" ? -formData.montoEnviado : -subtotalEntrega,
        };
      } else if (formData.CC === "USD BLUE") {
        subTotal = {
          ars:
            formData.monedaDePago === "ARS"
              ? -formData.montoEnviado
              : -Math.round(subtotalEntrega * tcBlue),
          usdOficial: formData.monedaDePago === "USD" ? -formData.montoEnviado : -subtotalEntrega,
          usdBlue: formData.monedaDePago === "USD" ? -formData.montoEnviado : -subtotalEntrega,
        };
      }

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

      let fechaCuentaCompleta = new Date();
      if (fechaEntrega) {
        const [year, month, day] = fechaEntrega.split("-");
        fechaCuentaCompleta = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          12,
          0,
          0,
          0
        );
      }

      const clienteId =
        clienteOptions.find(
          (o) => o.label.trim().toUpperCase() === formData.cliente.trim().toUpperCase()
        )?.id || null;

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
        cliente: clienteId,
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
              <FormControl fullWidth margin="normal" required>
                <Autocomplete
                  options={clienteOptions}
                  value={selectedOption}
                  inputValue={clienteInput}
                  onInputChange={(_, newInput) => setClienteInput(newInput || "")}
                  onChange={(_, newValue) => {
                    // Solo se setea si eligió una opción válida
                    handleInputChange("cliente", newValue ? newValue.label : "");
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  getOptionLabel={(option) => option?.label || ""}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Cliente *"
                      required
                      error={invalidCliente}
                      helperText={
                        invalidCliente ? "Debés seleccionar un cliente de la lista" : undefined
                      }
                      onBlur={() => {
                        // Si lo escrito no coincide con ninguna opción, limpiar
                        if (!matchesOption(clienteInput)) {
                          setClienteInput("");
                          handleInputChange("cliente", "");
                        }
                      }}
                    />
                  )}
                  // Evitar que se creen valores libres
                  freeSolo={false}
                  // Mejor UX: selecciona opción al presionar Enter si hay una resaltada
                  selectOnFocus
                  clearOnBlur={false}
                  handleHomeEndKeys
                />
              </FormControl>
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
                InputLabelProps={{ shrink: true }}
                helperText="Opcional"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monto *"
                value={montoFormateado}
                onChange={(e) => handleMontoChange(e.target.value)}
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
                value={formatNumberWithThousands(subtotalEntrega.toString())}
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
                value={formatNumberWithThousands(totalEntrega.toString())}
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
              <TextField fullWidth label="Usuario" value={formData.usuario} margin="normal" disabled />
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
