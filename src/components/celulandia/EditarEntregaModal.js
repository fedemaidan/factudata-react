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
import { useMovimientoForm } from "src/hooks/useMovimientoForm";

const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const clean = String(v).replace(",", ".").trim();
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
};

const EditarEntregaModal = ({ open, onClose, data, onSaved, clientes = [], tipoDeCambio }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);
  const [fechaEntrega, setFechaEntrega] = useState("");

  // Resetear loading cuando se abre el modal
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setInitialData(null);
      setFechaEntrega("");
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
        montoEnviado: Math.abs(data.montoEnviado || 0).toString(),
        CC: data.CC || "ARS",
        cuentaCorriente: data.CC || "ARS",
        montoCC: Math.abs(data.montoCC || 0).toString(),
        estado: "CONFIRMADO",
        concepto: data.descripcion || "",
        usuario: getUser(),
      };

      setDescuentoPorcentaje(
        typeof data.descuentoAplicado === "number"
          ? ((1 - data.descuentoAplicado) * 100).toString()
          : "0"
      );

      if (data.fecha) {
        const fecha = new Date(data.fecha);
        setFechaEntrega(fecha.toISOString().split("T")[0]);
      }

      setInitialData(processedData);
      setIsLoading(false);
    }
  }, [data, open]);

  const {
    formData,
    getCCOptions,
    getTipoDeCambio,
    tipoDeCambioManual,
    handleTipoDeCambioChange,
    handleMontoEnviado,
    handleInputChange,
    handleClienteChange,
  } = useMovimientoForm(initialData, { clientes, tipoDeCambio });

  // Cálculos reactivos SIN redondear antes de tiempo (y soportando coma decimal)
  const { factorDescuento, subtotalEntregaRedondeado, montoCCConDescuentoRedondeado } =
    useMemo(() => {
      const subtotalSinRedondear = toNumber(formData.montoCC);
      const pct = toNumber(descuentoPorcentaje);
      const factor = 1 - pct / 100;
      const totalConDescSinRedondear = subtotalSinRedondear * factor;

      return {
        factorDescuento: factor,
        subtotalEntregaRedondeado: Math.round(subtotalSinRedondear),
        montoCCConDescuentoRedondeado: Math.round(totalConDescSinRedondear),
      };
    }, [formData.montoCC, descuentoPorcentaje]);

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

      // Agregar fecha de entrega si se modificó
      if (fechaEntrega) {
        let fechaEntregaDate = new Date();
        if (data.fecha && new Date(data.fecha).toISOString().split("T")[0] !== fechaEntrega) {
          const [year, month, day] = fechaEntrega.split("-");
          fechaEntregaDate = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            12,
            0,
            0,
            0
          );
          datosParaGuardar.fechaCuenta = fechaEntregaDate;
        } else if (!data.fecha && fechaEntrega) {
          const [year, month, day] = fechaEntrega.split("-");
          fechaEntregaDate = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            12,
            0,
            0,
            0
          );
          datosParaGuardar.fechaCuenta = fechaEntregaDate;
        }
      }

      if (didChangeDescuento) {
        datosParaGuardar.descuentoAplicado = factorDescuento;
      }

      // Recalcular totales si corresponde (usando las versiones redondeadas de pantalla)
      if (cambiosAfectanTotales) {
        const tcOficial = tipoDeCambio?.oficial?.venta || tipoDeCambio?.oficial || 1;
        const tcBlue = tipoDeCambio?.blue?.venta || tipoDeCambio?.blue || 1;

        // Subtotal (sin descuento)
        let subTotal = { ars: 0, usdOficial: 0, usdBlue: 0 };
        if (formData.CC === "ARS") {
          subTotal = {
            ars: -subtotalEntregaRedondeado,
            usdOficial: -Math.round(subtotalEntregaRedondeado / tcOficial),
            usdBlue: -Math.round(subtotalEntregaRedondeado / tcBlue),
          };
        } else if (formData.CC === "USD OFICIAL") {
          subTotal = {
            ars: -Math.round(subtotalEntregaRedondeado * tcOficial),
            usdOficial: -subtotalEntregaRedondeado,
            usdBlue: -subtotalEntregaRedondeado,
          };
        } else if (formData.CC === "USD BLUE") {
          subTotal = {
            ars: -Math.round(subtotalEntregaRedondeado * tcBlue),
            usdOficial: -subtotalEntregaRedondeado,
            usdBlue: -subtotalEntregaRedondeado,
          };
        }

        // Total con descuento aplicado
        let montoTotal = { ars: 0, usdOficial: 0, usdBlue: 0 };
        if (formData.CC === "ARS") {
          montoTotal = {
            ars: -montoCCConDescuentoRedondeado,
            usdOficial: -Math.round(montoCCConDescuentoRedondeado / tcOficial),
            usdBlue: -Math.round(montoCCConDescuentoRedondeado / tcBlue),
          };
        } else if (formData.CC === "USD OFICIAL") {
          montoTotal = {
            ars: -Math.round(montoCCConDescuentoRedondeado * tcOficial),
            usdOficial: -montoCCConDescuentoRedondeado,
            usdBlue: -montoCCConDescuentoRedondeado,
          };
        } else if (formData.CC === "USD BLUE") {
          montoTotal = {
            ars: -Math.round(montoCCConDescuentoRedondeado * tcBlue),
            usdOficial: -montoCCConDescuentoRedondeado,
            usdBlue: -montoCCConDescuentoRedondeado,
          };
        }

        datosParaGuardar = { ...datosParaGuardar, subTotal, montoTotal };
      }

      // Detectar cambios reales contra `data`
      const camposModificados = {};
      Object.keys(datosParaGuardar).forEach((key) => {
        if (key === "subTotal" || key === "montoTotal") {
          if (JSON.stringify(datosParaGuardar[key]) !== JSON.stringify(data[key])) {
            camposModificados[key] = datosParaGuardar[key];
          }
        } else if (key === "fechaCuenta") {
          const fechaOriginal = data.fecha
            ? new Date(data.fecha).toISOString().split("T")[0]
            : null;
          const fechaNueva = datosParaGuardar[key]
            ? new Date(datosParaGuardar[key]).toISOString().split("T")[0]
            : null;
          if (fechaOriginal !== fechaNueva) {
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

            {/* Fila 3: Moneda */}
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Subtotal (sin descuento)"
                type="number"
                value={subtotalEntregaRedondeado}
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
                value={montoCCConDescuentoRedondeado}
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
                helperText="Acepta coma o punto como separador decimal"
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
