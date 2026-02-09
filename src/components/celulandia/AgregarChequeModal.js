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
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import { useMovimientoForm } from "src/hooks/useMovimientoForm";
import movimientosService from "src/services/celulandia/movimientosService";
import { getUser } from "src/utils/celulandia/currentUser";

const AgregarChequeModal = ({ open, onClose, onSave, clientes, tipoDeCambio, cajas }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [fechaCobro, setFechaCobro] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const {
    formData,
    setFormData,
    tipoDeCambioManual,
    clienteSeleccionado,
    montoFormateado,
    getCCOptions,
    getTipoDeCambio,
    handleTipoDeCambioChange,
    handleMontoEnviado,
    handleMontoChange,
    handleInputChange,
    handleClienteChange,
    resetForm,
  } = useMovimientoForm({ cuentaDestino: "ECHEQ" }, { clientes, tipoDeCambio, cajas });

  const handleSave = async () => {
    if (!formData.cliente || !formData.montoEnviado || !formData.cuentaDestino) {
      alert("Por favor complete todos los campos requeridos");
      return;
    }

    setIsSaving(true);
    try {
      let clienteData;
      let clienteId;

      if (clienteSeleccionado) {
        clienteData = {
          nombre: clienteSeleccionado.nombre,
          ccActivas: clienteSeleccionado.ccActivas,
          descuento: clienteSeleccionado.descuento,
        };
        clienteId = clienteSeleccionado._id;
      } else {
        clienteData = {
          nombre: formData.cliente,
        };
        clienteId = null;
      }

      const cajaId = cajas.find((caja) => caja.nombre === formData.cuentaDestino)?._id;
      const tipoDeCambioCalculado = getTipoDeCambio(formData.monedaDePago, formData.CC);

      const result = await movimientosService.createMovimiento({
        movimiento: {
          type: "INGRESO",
          clienteId: clienteId || null,
          cliente: clienteData,
          cuentaCorriente: formData.CC,
          moneda: formData.monedaDePago,
          tipoFactura: "cheque",
          caja: cajaId,
          nombreUsuario: getUser(),
          tipoDeCambio: tipoDeCambioCalculado,
          estado: "CONFIRMADO",
          concepto: descripcion || null,
          fechaCobro: fechaCobro ? new Date(`${fechaCobro}T00:00:00`) : null,
          camposBusqueda: `${formData.cliente} ${formData.cuentaDestino} ${formData.CC} ${
            formData.monedaDePago
          } ${formData.montoEnviado} CONFIRMADO ${getUser()} ${tipoDeCambioCalculado}`,
        },
        montoEnviado: formData.montoEnviado,
      });

      if (result.success) {
        onSave(result.data);
        handleClose();
      } else {
        alert(result.error || "Error al crear el cheque");
      }
    } catch (error) {
      console.error("Error al crear cheque:", error);
      alert("Error al crear el cheque. Por favor, intente nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    resetForm();
    setFechaCobro("");
    setDescripcion("");
    // Volver a dejar por defecto la cuenta destino en ECHEQ después de resetear
    setFormData((prev) => ({ ...prev, cuentaDestino: "ECHEQ" }));
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Nuevo Cheque
          </Typography>
        </Box>
      </DialogTitle>
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
                onChange={handleClienteChange}
                onInputChange={(_, newInputValue) => handleInputChange("cliente", newInputValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Cliente *" margin="normal" required fullWidth />
                )}
                ListboxProps={{
                  style: { maxHeight: 200, overflow: "auto" },
                }}
                filterOptions={(options, { inputValue }) => {
                  const filtered = options.filter((option) =>
                    option.nombre.toLowerCase().includes(inputValue.toLowerCase())
                  );
                  return filtered.slice(0, 50);
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Cuenta Destino *</InputLabel>
                <Select
                  value={formData.cuentaDestino}
                  label="Cuenta Destino *"
                  onChange={(e) => handleInputChange("cuentaDestino", e.target.value)}
                  required
                >
                  {cajas
                    ?.filter((caja) => ["CHEQUE", "ECHEQ"].includes(caja.nombre))
                    .map((caja) => (
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
                label="Descripción"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                margin="normal"
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
                inputMode="numeric"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Moneda de Pago *</InputLabel>
                <Select
                  value={formData.monedaDePago}
                  label="Moneda de Pago *"
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
                label="Monto CC"
                type="text"
                value={
                  formData.montoCC !== "" &&
                  formData.montoCC !== null &&
                  formData.montoCC !== undefined
                    ? Math.round(Number(formData.montoCC) || 0).toLocaleString("es-AR")
                    : ""
                }
                disabled={true}
                margin="normal"
                helperText="Calculado automáticamente"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Cuenta Corriente *</InputLabel>
                <Select
                  value={formData.CC}
                  label="Cuenta Corriente *"
                  onChange={(e) => handleInputChange("CC", e.target.value)}
                  required
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
                    : tipoDeCambio.ultimaActualizacion
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de Cobro"
                type="date"
                value={fechaCobro}
                onChange={(e) => setFechaCobro(e.target.value)}
                margin="normal"
                InputLabelProps={{ shrink: true }}
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

export default AgregarChequeModal;
