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
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import cuentasPendientesService from "src/services/celulandia/cuentasPendientesService";
import { getUser } from "src/utils/celulandia/currentUser";
import { useMovimientoFormV2, calcularMovimientoV2 } from "src/hooks/useMovimientoFormV2";
import { toNumber, formatNumberWithThousands } from "src/utils/celulandia/separacionMiles";

const EditarEntregaModal = ({ open, onClose, data, onSaved, clientes = [], tipoDeCambio }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);

  // Normalizar opciones de clientes para Autocomplete
  const clienteOptions = useMemo(
    () =>
      (Array.isArray(clientes) ? clientes : []).map((c) =>
        typeof c === "string"
          ? { id: c, label: c }
          : { id: c._id || c.nombre, label: c.nombre, ...c }
      ),
    [clientes]
  );

  // texto escrito en el input del Autocomplete (controlado)
  const [clienteInput, setClienteInput] = useState("");

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setInitialData(null);
    }
  }, [open]);

  useEffect(() => {
    setDescuentoPorcentaje(
      typeof data?.descuentoAplicado === "number"
        ? Math.round((1 - data.descuentoAplicado) * 100).toString()
        : "0"
    );

    if (data && Object.keys(data).length > 0 && open) {
      const processedData = {
        _id: data._id,
        cliente: { nombre: data.cliente?.nombre || data.cliente || data.clienteNombre || "" },
        cuentaDestino: "ENSHOP SRL",
        monedaDePago: data.moneda || data.monedaDePago,
        moneda: data.moneda || data.monedaDePago,
        montoEnviado: Math.abs(data.montoEnviado || 0).toString(),
        CC: data.CC,
        cuentaCorriente: data.CC,
        montoCC: Math.abs(data.montoCC || 0).toString(),
        estado: "CONFIRMADO",
        concepto: data.descripcion || "",
        usuario: getUser(),
        subTotal: data.subTotal,
        montoTotal: data.montoTotal,
      };
      setInitialData(processedData);
      setIsLoading(false);
    }
  }, [data, open]);

  const { formData, handleChange, getCCOptions, clienteSeleccionado, tipoDeCambioManual } =
    useMovimientoFormV2(initialData, { clientes, tipoDeCambio });

  // Sincronizar el input visible con el valor del form
  useEffect(() => {
    const labelActual =
      typeof formData?.cliente === "string" ? formData.cliente : formData?.cliente?.nombre || "";
    setClienteInput(labelActual || "");
  }, [formData?.cliente]);

  const tipoDeCambioGuardado = data?.tipoDeCambio || 1;

  const { tc, subtotalSinDescuentoRedondeado, totalConDescuentoRedondeado } = useMemo(
    () =>
      calcularMovimientoV2({
        montoEnviado: formData.montoEnviado,
        monedaDePago: formData.monedaDePago,
        cuentaCorriente: formData.CC,
        tipoDeCambioManual,
        tipoDeCambio,
        aplicarDescuento: toNumber(descuentoPorcentaje) > 0,
        descuentoPercent: descuentoPorcentaje,
        signo: 1,
      }),
    [
      formData.montoEnviado,
      formData.monedaDePago,
      formData.CC,
      tipoDeCambioManual,
      tipoDeCambio,
      descuentoPorcentaje,
    ]
  );

  const factorDescuento = (() => {
    const pct = toNumber(descuentoPorcentaje);
    return 1 - pct / 100;
  })();

  // Helpers de validación estricta del Autocomplete
  const labelDeForm = useMemo(
    () =>
      typeof formData?.cliente === "string" ? formData.cliente : formData?.cliente?.nombre || "",
    [formData?.cliente]
  );

  const matchesOption = (text) =>
    !!clienteOptions.find(
      (o) => (o.label || "").trim().toUpperCase() === (text || "").trim().toUpperCase()
    );

  const selectedOption =
    clienteOptions.find(
      (o) => (o.label || "").trim().toUpperCase() === (labelDeForm || "").trim().toUpperCase()
    ) || null;

  const invalidCliente = clienteInput !== "" && !matchesOption(clienteInput);

  const handleSave = async () => {
    // Validar cliente elegido de la lista
    if (!labelDeForm || !matchesOption(labelDeForm)) {
      alert("Seleccioná un cliente válido de la lista.");
      return;
    }
    if (!formData.montoEnviado) {
      alert("Completá los campos requeridos");
      return;
    }

    setIsSaving(true);
    try {
      const monto = parseFloat(formData.montoEnviado) || 0;

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
        proveedorOCliente: labelDeForm,
        moneda: formData.monedaDePago,
        cc: formData.CC,
        // ID del cliente desde el hook (coincidirá porque forzamos selección válida)
        cliente: clienteSeleccionado?._id,
      };

      if (didChangeDescuento) {
        datosParaGuardar.descuentoAplicado = factorDescuento;
      }

      if (cambiosAfectanTotales) {
        const {
          subTotal,
          montoTotal,
          tipoDeCambioEfectivo: tcEfectivo,
        } = calcularMovimientoV2({
          montoEnviado: formData.montoEnviado,
          monedaDePago: formData.monedaDePago,
          cuentaCorriente: formData.CC,
          tipoDeCambioManual,
          tipoDeCambio,
          aplicarDescuento: toNumber(descuentoPorcentaje) > 0,
          descuentoPercent: descuentoPorcentaje,
          signo: -1,
        });
        const tipoDeCambioAGuardar =
          tipoDeCambioManual !== null && toNumber(tipoDeCambioManual) > 0
            ? toNumber(tipoDeCambioManual)
            : toNumber(tipoDeCambioGuardado) > 0
            ? toNumber(tipoDeCambioGuardado)
            : toNumber(tcEfectivo);

        datosParaGuardar = {
          ...datosParaGuardar,
          subTotal,
          montoTotal,
          tipoDeCambio: tipoDeCambioAGuardar,
        };
      }

      // Detectar cambios reales vs data original
      const camposModificados = {};
      Object.keys(datosParaGuardar).forEach((key) => {
        if (key === "subTotal" || key === "montoTotal") {
          if (JSON.stringify(datosParaGuardar[key]) !== JSON.stringify(data[key])) {
            camposModificados[key] = datosParaGuardar[key];
          }
        } else if (key === "cliente") {
          const clienteOriginal = data.cliente?._id || data.cliente || null;
          if (clienteOriginal !== datosParaGuardar[key]) {
            camposModificados[key] = datosParaGuardar[key];
          }
        } else if (key === "cc") {
          if (datosParaGuardar[key] !== (data.CC ?? data.cc)) {
            camposModificados[key] = datosParaGuardar[key];
          }
        } else {
          if (datosParaGuardar[key] !== data[key]) {
            camposModificados[key] = datosParaGuardar[key];
          }
        }
      });

      if (Object.keys(camposModificados).length === 0) {
        alert("No hay cambios para guardar");
        onClose();
        return;
      }

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
              <FormControl fullWidth margin="normal" required>
                <Autocomplete
                  options={clienteOptions}
                  value={selectedOption}
                  inputValue={clienteInput}
                  onInputChange={(_, newInput) => setClienteInput(newInput || "")}
                  onChange={(_, newOption) => {
                    const label = newOption?.label || "";
                    setClienteInput(label);
                    handleChange("cliente", label);
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
                        // limpiar si lo escrito no coincide con ninguna opción
                        if (!matchesOption(clienteInput)) {
                          setClienteInput("");
                          handleChange("cliente", "");
                        }
                      }}
                    />
                  )}
                  freeSolo={false}
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
                onChange={(e) => handleChange("concepto", e.target.value)}
                margin="normal"
              />
            </Grid>

            {/* Fila 2: Monto */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monto *"
                value={String(formData.montoEnviado || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                onChange={(e) => handleChange("montoEnviado", e.target.value)}
                margin="normal"
                required
              />
            </Grid>

            {/* Fila 3: Moneda */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Moneda *</InputLabel>
                <Select
                  value={formData.monedaDePago}
                  label="Moneda *"
                  onChange={(e) => handleChange("monedaDePago", e.target.value)}
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
                  onChange={(e) => handleChange("CC", e.target.value)}
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
                label="Subtotal (sin descuento)"
                value={formatNumberWithThousands(subtotalSinDescuentoRedondeado.toString())}
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
                value={formatNumberWithThousands(totalConDescuentoRedondeado.toString())}
                margin="normal"
                disabled
                helperText="Subtotal con descuento aplicado"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Descuento (%)"
                type="text"
                value={descuentoPorcentaje}
                onChange={(e) => setDescuentoPorcentaje(e.target.value)}
                margin="normal"
                inputProps={{ inputMode: "decimal" }}
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
                value={
                  tipoDeCambioManual !== null
                    ? tipoDeCambioManual
                    : toNumber(tipoDeCambioGuardado) > 0
                    ? tipoDeCambioGuardado
                    : tc
                }
                disabled={
                  (formData.monedaDePago === "ARS" && formData.CC === "ARS") ||
                  (formData.monedaDePago === "USD" && formData.CC === "USD BLUE") ||
                  (formData.monedaDePago === "USD" && formData.CC === "USD OFICIAL")
                }
                onChange={(e) => handleChange("tipoDeCambioManual", e.target.value)}
                margin="normal"
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
