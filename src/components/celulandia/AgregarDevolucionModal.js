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
  Link,
} from "@mui/material";
import { Autocomplete } from "@mui/material";
import cuentasPendientesService from "src/services/celulandia/cuentasPendientesService";
import { getUser } from "src/utils/celulandia/currentUser";
import { useMovimientoForm } from "src/hooks/useMovimientoForm";

const formatNumberWithThousands = (value) => {
  if (!value || value === 0) return "0";
  return value.toString().replace(/\B((?=(\d{3})+(?!\d)))/g, ".");
};

const formatFechaLarga = (yyyyMmDd) => {
  try {
    if (!yyyyMmDd) return "";
    const [y, m, d] = yyyyMmDd.split("-").map(Number);
    const fecha = new Date(y, (m || 1) - 1, d || 1);
    return new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(fecha);
  } catch {
    return "";
  }
};

const AgregarDevolucionModal = ({ open, onClose, onSaved, clientes = [], tipoDeCambio }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [mostrarDescripcion, setMostrarDescripcion] = useState(false);

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

  // Cálculo de totales (sin descuento; factor siempre 1)
  const subtotalEntrega = Math.round(parseFloat(formData.montoCC) || 0);
  const totalEntrega = subtotalEntrega;

  // Mantener el input del Autocomplete sincronizado con el formData.cliente
  useEffect(() => {
    setClienteInput(formData.cliente || "");
  }, [formData.cliente]);

  useEffect(() => {
    if ((formData.concepto || "").trim() !== "") {
      setMostrarDescripcion(true);
    }
  }, [formData.concepto]);

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
      let fechaCuentaCompleta = new Date();
      if (fechaEntrega) {
        const [year, month, day] = fechaEntrega.split("-");
        const ahora = new Date();

        const fechaArgentina = new Date(
          ahora.toLocaleString("en-US", {
            timeZone: "America/Argentina/Buenos_Aires",
          })
        );

        fechaCuentaCompleta = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          fechaArgentina.getHours(),
          fechaArgentina.getMinutes(),
          fechaArgentina.getSeconds(),
          fechaArgentina.getMilliseconds()
        );
      }

      const clienteId =
        clienteOptions.find(
          (o) => o.label.trim().toUpperCase() === formData.cliente.trim().toUpperCase()
        )?.id || null;

      // Payload crudo: el backend resuelve el TC (salvo manual) y calcula
      // subTotal/montoTotal con su propia cotización. Devoluciones: signo +1, sin descuento.
      const esManual = tipoDeCambioManual !== null;
      const payload = {
        montoEnviado: Math.abs(parseFloat(formData.montoEnviado) || 0),
        moneda: formData.monedaDePago,
        cc: formData.CC,
        descuentoAplicado: 1,
        signo: 1,
        tipoDeCambioManual: esManual,
        ...(esManual ? { tipoDeCambio: tipoDeCambioManual } : {}),
        descripcion: formData.concepto,
        proveedorOCliente: formData.cliente,
        fechaCuenta: fechaCuentaCompleta,
        empresaId: "celulandia",
        cliente: clienteId,
        usuario: getUser(),
      };

      const result = await cuentasPendientesService.create(payload);
      if (result.success) {
        onSaved && onSaved(result.data);
        resetForm();
        onClose();
      } else {
        alert(result.error || "Error al crear la devolución");
      }
    } catch (err) {
      console.error(err);
      alert("Error al crear la devolución");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFechaEntrega("");
    setMostrarDescripcion(false);
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Nueva Devolución</DialogTitle>
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
                  onChange={handleClienteChange}
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
                        if (!matchesOption(clienteInput)) {
                          setClienteInput("");
                          handleInputChange("cliente", "");
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
              {mostrarDescripcion ? (
                <TextField
                  fullWidth
                  label="Descripción"
                  value={formData.concepto || ""}
                  onChange={(e) => handleInputChange("concepto", e.target.value)}
                  margin="normal"
                />
              ) : (
                <Box sx={{ mt: 3 }}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => setMostrarDescripcion(true)}
                  >
                    Agregar descripción
                  </Link>
                </Box>
              )}
            </Grid>

            {/* Fila 2: Fecha - Monto */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de Devolución"
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                margin="normal"
                InputLabelProps={{ shrink: true }}
                helperText={fechaEntrega ? formatFechaLarga(fechaEntrega) : "Opcional"}
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

            {/* Fila 4: Subtotal - Total */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Subtotal"
                value={formatNumberWithThousands(subtotalEntrega.toString())}
                margin="normal"
                disabled
                helperText="Calculado automáticamente"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Total"
                value={formatNumberWithThousands(totalEntrega.toString())}
                margin="normal"
                disabled
                helperText="Sin descuento"
              />
            </Grid>

            {/* Fila 5: Usuario - Tipo de Cambio */}
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

export default AgregarDevolucionModal;


