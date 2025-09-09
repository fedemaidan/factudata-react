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
        cliente: { nombre: data.cliente || data.clienteNombre || "" },
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

  const {
    formData,
    handleChange,
    getCCOptions,
    clienteSeleccionado,
    tipoDeCambioManual,
    calculos,
  } = useMovimientoFormV2(initialData, { clientes, tipoDeCambio });

  const tipoDeCambioGuardado = data?.tipoDeCambio || 1;

  // Cálculo para pantalla con descuento según input
  const { tc, subtotalSinDescuentoRedondeado, totalConDescuentoRedondeado } = calcularMovimientoV2({
    montoEnviado: formData.montoEnviado,
    monedaDePago: formData.monedaDePago,
    cuentaCorriente: formData.CC,
    tipoDeCambioManual,
    tipoDeCambio,
    aplicarDescuento: toNumber(descuentoPorcentaje) > 0,
    descuentoPercent: descuentoPorcentaje,
    signo: 1,
  });
  const factorDescuento = (() => {
    const pct = toNumber(descuentoPorcentaje);
    return 1 - pct / 100;
  })();

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
        cliente: clienteSeleccionado?._id,
      };

      if (didChangeDescuento) {
        datosParaGuardar.descuentoAplicado = factorDescuento;
      }

      // Recalcular totales si corresponde (usando cálculo único centralizado)
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

      // Detectar cambios reales contra `data`
      const camposModificados = {};
      Object.keys(datosParaGuardar).forEach((key) => {
        if (key === "subTotal" || key === "montoTotal") {
          if (JSON.stringify(datosParaGuardar[key]) !== JSON.stringify(data[key])) {
            camposModificados[key] = datosParaGuardar[key];
          }
        } else if (key === "cliente") {
          // Comparar el ID del cliente actual con el nuevo
          const clienteOriginal = data.cliente?._id || data.cliente || null;
          if (clienteOriginal !== datosParaGuardar[key]) {
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
                onChange={(_, value) => handleChange("cliente", value)}
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
                helperText=""
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
