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
  CircularProgress,
} from "@mui/material";
import { useMovimientoForm } from "src/hooks/useMovimientoForm";
import movimientosService from "src/services/celulandia/movimientosService";
import { getUser } from "src/utils/celulandia/currentUser";

const initialAporteData = {
  cliente: { nombre: "APORTE CAPITAL" },
  cuentaDestino: "",
  moneda: "ARS",
  cuentaCorriente: "ARS",
  estado: "CONFIRMADO",
  categoria: "",
};

const AgregarAporteModal = ({ open, onClose, onSave, cajas = [], categorias = [] }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [aportante, setAportante] = useState("EZE");
  const [cajaDestino, setCajaDestino] = useState("");

  const { formData, montoFormateado, handleMontoChange, handleInputChange, resetForm } =
    useMovimientoForm(initialAporteData, null);

  const handleSave = async () => {
    if (!aportante || !cajaDestino || !formData.montoEnviado) {
      alert("Por favor complete todos los campos requeridos");
      return;
    }

    setIsSaving(true);

    try {
      const aportanteCaja = cajas.find((c) => c.nombre === aportante);
      if (!aportanteCaja) {
        throw new Error("No se encontró la caja del aportante");
      }

      // EGRESO (aportante) + INGRESO (destino) compuesto
      const movimiento1 = {
        movimiento: {
          type: "EGRESO",
          cliente: { nombre: "APORTE CAPITAL" },
          cuentaCorriente: "ARS",
          moneda: formData.monedaDePago,
          tipoFactura: "transferencia",
          caja: aportanteCaja._id,
          nombreUsuario: getUser(),
          tipoDeCambio: 1,
          estado: "CONFIRMADO",
          empresaId: "celulandia",
          concepto: (formData.concepto || "").trim(),
          categoria: formData.categoria || null,
        },
        montoEnviado: -1 * formData.montoEnviado,
      };
      const movimiento2 = {
        movimiento: {
          type: "INGRESO",
          cliente: { nombre: `APORTE ${aportante}` },
          cuentaCorriente: "ARS",
          moneda: formData.monedaDePago,
          tipoFactura: "transferencia",
          caja: cajaDestino,
          nombreUsuario: getUser(),
          tipoDeCambio: 1,
          estado: "CONFIRMADO",
          empresaId: "celulandia",
          concepto: `Aporte de capital desde ${aportante}`,
          categoria: formData.categoria || null,
        },
        montoEnviado: formData.montoEnviado,
      };

      const result = await movimientosService.createMovimientoCompuesto({
        movimiento1,
        movimiento2,
      });
      if (!result?.success) {
        throw new Error(result?.error || "Error al crear movimientos compuestos");
      }

      onSave(result.data?.movimiento1, result.data?.movimiento2);
      handleClose();
    } catch (error) {
      console.error("Error al crear aporte:", error);
      alert(`Error al crear el aporte: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    resetForm();
    setAportante("EZE");
    setCajaDestino("");
    onClose();
  };

  const cajasDestino = Array.isArray(cajas)
    ? cajas.filter((c) => c.nombre !== "EZE" && c.nombre !== "NICO")
    : [];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Aporte de capital
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Aportante *</InputLabel>
                <Select
                  value={aportante}
                  label="Aportante *"
                  onChange={(e) => setAportante(e.target.value)}
                  required
                >
                  <MenuItem value="EZE">EZE</MenuItem>
                  <MenuItem value="NICO">NICO</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Caja destino *</InputLabel>
                <Select
                  value={cajaDestino}
                  label="Caja destino *"
                  onChange={(e) => setCajaDestino(e.target.value)}
                  required
                >
                  {cajasDestino.map((caja) => (
                    <MenuItem key={caja._id} value={caja._id}>
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
                value={montoFormateado}
                onChange={(e) => handleMontoChange(e.target.value)}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Moneda *</InputLabel>
                <Select
                  value={formData.monedaDePago}
                  label="Moneda *"
                  onChange={(e) => handleInputChange("monedaDePago", e.target.value)}
                  required
                >
                  <MenuItem value="ARS">ARS</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={formData.categoria}
                  label="Categoria"
                  onChange={(e) => handleInputChange("categoria", e.target.value)}
                >
                  {categorias.map((categoria) => (
                    <MenuItem key={categoria.id} value={categoria.id}>
                      {categoria.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                value={formData.concepto || ""}
                onChange={(e) => handleInputChange("concepto", e.target.value)}
                margin="normal"
                placeholder="Ej: Aporte para capital de trabajo"
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

export default AgregarAporteModal;


