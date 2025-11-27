import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { useMovimientoForm } from "src/hooks/useMovimientoForm";
import movimientosService from "src/services/celulandia/movimientosService";
import { getUser } from "src/utils/celulandia/currentUser";
import { toNumber, formatNumberWithThousands } from "src/utils/celulandia/separacionMiles";

const EditarModal = ({ open, onClose, data, onSave, clientes, tipoDeCambio, cajas }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [montoDisplay, setMontoDisplay] = useState("");

  const {
    formData,
    setFormData,
    tipoDeCambioManual,
    clienteSeleccionado,
    getCCOptions,
    getTipoDeCambio,
    handleTipoDeCambioChange,
    handleMontoEnviado,
    handleInputChange,
    handleClienteChange,
  } = useMovimientoForm(data, { clientes, tipoDeCambio, cajas });

  useEffect(() => {
    setMontoDisplay(formatNumberWithThousands(formData.montoEnviado || 0));
  }, [formData.montoEnviado]);

  const tipoDeCambioGuardado = data?.tipoDeCambio || 1;
  useEffect(() => {
    if (open && data) {
      const saved = Number(tipoDeCambioGuardado);
      if (saved > 0) {
        handleTipoDeCambioChange(saved);
      }
    }
  }, [open, data]);

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
      const tipoDeCambioCalculado =
        tipoDeCambioManual !== null
          ? parseFloat(tipoDeCambioManual)
          : toNumber(tipoDeCambioGuardado) > 0
          ? toNumber(tipoDeCambioGuardado)
          : getTipoDeCambio(formData.monedaDePago, formData.CC);

      const datosParaGuardar = {
        clienteId: clienteId || null,
        cliente: clienteData,
        cuentaCorriente: formData.CC,
        moneda: formData.monedaDePago,
        tipoFactura: "transferencia",
        caja: cajaId,
        nombreUsuario: getUser(),
        tipoDeCambio: tipoDeCambioCalculado,
        estado: formData.estado,
        descripcion: (formData.descripcion || "").trim(),
        montoEnviado: parseFloat(formData.montoEnviado) || 0,
        montoCC: parseFloat(formData.montoCC) || 0,
      };

      const camposModificados = {};

      Object.keys(datosParaGuardar).forEach((key) => {
        if (key === "cliente") {
          const nombreNuevo = datosParaGuardar[key].nombre;
          const nombreOriginal = data.cliente?.nombre;

          if (nombreNuevo !== nombreOriginal) {
            // Si cambió el nombre del cliente, enviar solo el nombre
            // El backend se encargará de buscar el cliente
            camposModificados.clienteNombre = nombreNuevo;
          }
        } else if (key === "caja") {
          if (datosParaGuardar[key] !== data.caja?._id) {
            camposModificados[key] = datosParaGuardar[key];
          }
        } else if (key === "clienteId") {
          // No enviar clienteId directamente, se manejará en el backend
          // basado en clienteNombre
        } else if (key === "montoEnviado") {
          // Comparar montos como números
          const montoNuevo = parseFloat(datosParaGuardar[key]) || 0;
          const montoOriginal = parseFloat(data.montoEnviado) || 0;

          if (montoNuevo !== montoOriginal) {
            camposModificados.montoEnviado = montoNuevo;

            // Si cambió el monto, también enviar el tipo de cambio recalculado
            const tipoDeCambioOriginal = data.tipoDeCambio || 1;
            const tipoDeCambioNuevo = datosParaGuardar.tipoDeCambio;

            if (tipoDeCambioNuevo !== tipoDeCambioOriginal) {
              camposModificados.tipoDeCambio = tipoDeCambioNuevo;
            }
          }
        } else if (key === "tipoDeCambio") {
          // Detectar cambios en tipo de cambio independientemente del monto
          const tipoDeCambioOriginal = data.tipoDeCambio || 1;
          const tipoDeCambioNuevo = datosParaGuardar[key];

          if (tipoDeCambioNuevo !== tipoDeCambioOriginal) {
            camposModificados.tipoDeCambio = tipoDeCambioNuevo;
          }
        } else {
          if (datosParaGuardar[key] !== data[key]) {
            camposModificados[key] = datosParaGuardar[key];
          }
        }
      });

      // Solo hacer la llamada si hay campos modificados
      if (Object.keys(camposModificados).length === 0) {
        alert("No hay cambios para guardar");
        onClose();
        return;
      }

      // Si el movimiento tiene complementario, editar ambos con endpoint compuesto
      if (data?.movimientoComplementario) {
        // Toda la lógica de consistencia se maneja en backend
        const result = await movimientosService.updateMovimientoCompuesto({
          id1: data._id,
          data1: camposModificados,
          id2: data.movimientoComplementario,
          data2: {},
          nombreUsuario: getUser(),
        });

        if (result.success) {
          await onSave();
          onClose();
          return;
        } else {
          alert(result.error || "Error al editar movimientos compuestos");
          return;
        }
      }

      const result = await movimientosService.updateMovimiento(
        data._id,
        camposModificados,
        getUser()
      );

      if (result.success) {
        // pedir refetch al padre
        await onSave();
        onClose();
      } else {
        alert(result.error || "Error al actualizar el movimiento");
      }
    } catch (error) {
      console.error("Error al actualizar movimiento:", error);
      alert("Error al actualizar el movimiento. Por favor, intente nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Restaurar datos originales
    if (data) {
      setFormData({
        cliente: data.cliente?.nombre || "",
        cuentaDestino: data.cuentaDestino || "ENSHOP SRL",
        montoEnviado: data.montoEnviado || "",
        monedaDePago: data.moneda || "ARS",
        CC: data.cuentaCorriente || "ARS",
        estado: data.estado || "CONFIRMADO",
        montoCC: data.montoCC || "",
        usuario: getUser(),
      });
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>Editar Comprobante</DialogTitle>
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
                onInputChange={(_, newInputValue) => {
                  handleInputChange("cliente", newInputValue);
                }}
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
                value={montoDisplay}
                onChange={(e) => {
                  const v = e.target.value;
                  setMontoDisplay(v);
                  // Convertir el valor con separadores a número para el form
                  const cleanValue = v.replace(/\./g, "").replace(/,/g, ".");
                  const num = toNumber(cleanValue);
                  handleMontoEnviado(String(num));
                }}
                onBlur={() => {
                  // Re-formatear al perder foco
                  const num = toNumber(montoDisplay.replace(/\./g, "").replace(/,/g, "."));
                  setMontoDisplay(formatNumberWithThousands(num));
                }}
                inputMode="decimal"
                margin="normal"
                required
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
                value={formatNumberWithThousands(formData.montoCC || 0)}
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
                value={
                  tipoDeCambioManual !== null
                    ? tipoDeCambioManual
                    : toNumber(tipoDeCambioGuardado) > 0
                    ? tipoDeCambioGuardado
                    : getTipoDeCambio(formData.monedaDePago, formData.CC)
                }
                disabled={
                  (formData.monedaDePago === "ARS" && formData.CC === "ARS") ||
                  (formData.monedaDePago === "USD" && formData.CC === "USD BLUE") ||
                  (formData.monedaDePago === "USD" && formData.CC === "USD OFICIAL")
                }
                onChange={(e) => handleTipoDeCambioChange(e.target.value)}
                margin="normal"
              />
            </Grid>

            {/* Descripción (opcional) */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Descripción"
                value={formData.descripcion || ""}
                onChange={(e) => handleInputChange("descripcion", e.target.value)}
                margin="normal"
                placeholder="(opcional)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={formData.estado}
                  label="Estado"
                  onChange={(e) => handleInputChange("estado", e.target.value)}
                >
                  <MenuItem value="CONFIRMADO">CONFIRMADO</MenuItem>
                  <MenuItem value="PENDIENTE">PENDIENTE</MenuItem>
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

export default EditarModal;
