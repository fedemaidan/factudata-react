import React, { useMemo, useState } from "react";
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
  CircularProgress,
  Alert,
} from "@mui/material";
import movimientosService from "src/services/celulandia/movimientosService";
import { getUser } from "src/utils/celulandia/currentUser";

const AgregarCompraVentaUsd = ({ open, onClose, onSave, cajas = [] }) => {
  const [operacion, setOperacion] = useState("COMPRA");
  const [tipoCambio, setTipoCambio] = useState("");
  const [cantidadUsd, setCantidadUsd] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const cajaEfectivo = useMemo(
    () => (Array.isArray(cajas) ? cajas.find((c) => c.nombre === "EFECTIVO") : null),
    [cajas]
  );

  const usdNumber = parseFloat(cantidadUsd) || 0;
  const tipoCambioNumber = parseFloat(tipoCambio) || 0;
  const totalPesos = usdNumber > 0 && tipoCambioNumber > 0 ? usdNumber * tipoCambioNumber : 0;

  const resetForm = () => {
    setOperacion("COMPRA");
    setTipoCambio("");
    setCantidadUsd("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const buildMovimientos = (usd, tc, conceptoBase, categoria) => {
    const descripcionFinal = conceptoBase;
    const esCompra = operacion === "COMPRA";

    const movimientoUSD = {
      movimiento: {
        type: esCompra ? "INGRESO" : "EGRESO",
        cliente: { nombre: conceptoBase },
        cuentaCorriente: "USD BLUE",
        moneda: "USD",
        tipoFactura: "efectivo",
        caja: cajaEfectivo?._id,
        nombreUsuario: getUser(),
        tipoDeCambio: 1,
        estado: "CONFIRMADO",
        empresaId: "celulandia",
        concepto: descripcionFinal,
        categoria,
      },
      montoEnviado: esCompra ? usd : -usd,
    };

    const movimientoARS = {
      movimiento: {
        type: esCompra ? "EGRESO" : "INGRESO",
        cliente: { nombre: conceptoBase },
        cuentaCorriente: "ARS",
        moneda: "ARS",
        tipoFactura: "efectivo",
        caja: cajaEfectivo?._id,
        nombreUsuario: getUser(),
        tipoDeCambio: tc,
        estado: "CONFIRMADO",
        empresaId: "celulandia",
        concepto: descripcionFinal,
        categoria,
      },
      montoEnviado: esCompra ? -usd * tc : usd * tc,
    };

    return esCompra
      ? { movimiento1: movimientoUSD, movimiento2: movimientoARS }
      : { movimiento1: movimientoARS, movimiento2: movimientoUSD };
  };

  const handleSave = async () => {
    if (!cajaEfectivo?._id) {
      alert("No se encontró la caja EFECTIVO");
      return;
    }
    if (!cantidadUsd || !tipoCambio) {
      alert("Complete cantidad de USD y tipo de cambio");
      return;
    }

    const usd = parseFloat(cantidadUsd);
    const tc = parseFloat(tipoCambio);

    if (!Number.isFinite(usd) || usd <= 0 || !Number.isFinite(tc) || tc <= 0) {
      alert("Ingrese valores numéricos válidos (mayores a 0)");
      return;
    }

    setIsSaving(true);
    try {
      const esCompra = operacion === "COMPRA";
      const conceptoBase = esCompra ? "Compra de dólares" : "Venta de dólares";
      const categoria = esCompra ? "compra dolares" : "venta dolares";

      const payload = buildMovimientos(usd, tc, conceptoBase, categoria);
      const result = await movimientosService.createMovimientoCompuesto(payload);

      if (!result?.success) {
        throw new Error(result?.error || "Error al crear movimientos compuestos");
      }

      onSave(result.data?.movimiento1, result.data?.movimiento2);
      handleClose();
    } catch (error) {
      console.error("Error al crear compra/venta USD:", error);
      alert(`Error al crear la operación: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Compra/Venta de dólares
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          {!cajaEfectivo && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No se encontró la caja EFECTIVO. No se podrá guardar la operación.
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Operación *</InputLabel>
                <Select
                  value={operacion}
                  label="Operación *"
                  onChange={(e) => setOperacion(e.target.value)}
                  required
                >
                  <MenuItem value="COMPRA">Compra de USD</MenuItem>
                  <MenuItem value="VENTA">Venta de USD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Cantidad de USD *"
                value={cantidadUsd}
                onChange={(e) => setCantidadUsd(e.target.value)}
                margin="normal"
                inputProps={{ min: 0, step: "0.01" }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Tipo de cambio (ARS por USD) *"
                value={tipoCambio}
                onChange={(e) => setTipoCambio(e.target.value)}
                margin="normal"
                inputProps={{ min: 0, step: "0.01" }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Total en pesos: {totalPesos ? totalPesos.toLocaleString("es-AR") : "-"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Caja utilizada: {cajaEfectivo ? cajaEfectivo.nombre : "No disponible"} (EFECTIVO)
              </Typography>
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
          disabled={isSaving || !cajaEfectivo}
          startIcon={isSaving ? <CircularProgress size={16} /> : null}
        >
          {isSaving ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgregarCompraVentaUsd;
