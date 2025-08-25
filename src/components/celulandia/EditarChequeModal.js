import React, { useEffect, useMemo, useState } from "react";
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

const toDateInputValue = (dateLike) => {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const EditarChequeModal = ({ open, onClose, data, onSave, clientes, tipoDeCambio, cajas }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [fechaCobro, setFechaCobro] = useState("");

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
    setFechaCobro(toDateInputValue(data?.fechaCobro));
  }, [data?._id]);

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

      const datosParaGuardar = {
        clienteId: clienteId || null,
        cliente: clienteData,
        cuentaCorriente: formData.CC,
        moneda: formData.monedaDePago,
        tipoFactura: "cheque",
        caja: cajaId,
        nombreUsuario: getUser(),
        tipoDeCambio: tipoDeCambioCalculado,
        estado: formData.estado,
        montoEnviado: parseFloat(formData.montoEnviado) || 0,
        montoCC: parseFloat(formData.montoCC) || 0,
        fechaCobro: fechaCobro ? new Date(`${fechaCobro}T00:00:00`) : null,
      };

      const camposModificados = {};
      Object.keys(datosParaGuardar).forEach((key) => {
        if (key === "cliente") {
          if (datosParaGuardar[key].nombre !== data.cliente?.nombre) {
            camposModificados[key] = datosParaGuardar[key];
          }
        } else if (key === "caja") {
          if (datosParaGuardar[key] !== data.caja?._id) {
            camposModificados[key] = datosParaGuardar[key];
          }
        } else if (key === "clienteId") {
          if (datosParaGuardar[key] !== data.cliente?._id) {
            camposModificados[key] = datosParaGuardar[key];
          }
        } else if (key === "fechaCobro") {
          const original = data.fechaCobro ? toDateInputValue(data.fechaCobro) : "";
          if ((fechaCobro || "") !== original) {
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

      const result = await movimientosService.updateMovimiento(
        data._id,
        camposModificados,
        getUser()
      );

      if (result.success) {
        onSave();
        onClose();
      } else {
        alert(result.error || "Error al actualizar el movimiento");
      }
    } catch (error) {
      console.error("Error al actualizar cheque:", error);
      alert("Error al actualizar el cheque. Por favor, intente nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
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
      setFechaCobro(toDateInputValue(data.fechaCobro));
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>Editar Cheque</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Grid container spacing={2}>
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
                type="number"
                value={formData.montoEnviado}
                onChange={(e) => handleMontoEnviado(e.target.value)}
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
                type="number"
                value={formData.montoCC}
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
              <FormControl fullWidth margin="normal">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={formData.estado}
                  label="Estado"
                  onChange={(e) => handleInputChange("estado", e.target.value)}
                >
                  <MenuItem value="CONFIRMADO">CONFIRMADO</MenuItem>
                  <MenuItem value="PENDIENTE">PENDIENTE</MenuItem>
                  <MenuItem value="COBRADO">COBRADO</MenuItem>
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

export default EditarChequeModal;
