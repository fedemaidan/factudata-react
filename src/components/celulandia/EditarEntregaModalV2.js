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
  CircularProgress,
} from "@mui/material";
import cuentasPendientesService from "src/services/celulandia/cuentasPendientesService";
import { getUser } from "src/utils/celulandia/currentUser";

const CC_OPTIONS = ["ARS", "USD OFICIAL", "USD BLUE"];
const MONEDAS = ["ARS", "USD"];

const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const formatNumberWithThousands = (value) => {
  const n = Number(value) || 0;
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const getNombreClienteOriginal = (data) => {
  if (!data) return "";
  if (typeof data.cliente === "string") return data.cliente;
  return data?.cliente?.nombre || data?.clienteNombre || data?.proveedorOCliente || "";
};

export const EditarEntregaModalV2 = ({
  open,
  onClose,
  data,
  onSaved,
  clientes = [],
  tipoDeCambio, // default provisto por props (número u objeto)
}) => {
  // === Default TC desde props (soporta número u objeto común) ===
  const tcDefault = useMemo(() => {
    if (typeof tipoDeCambio === "number") return tipoDeCambio > 0 ? tipoDeCambio : 1;
    if (tipoDeCambio && typeof tipoDeCambio === "object") {
      const cand =
        tipoDeCambio.venta ??
        tipoDeCambio.value ??
        tipoDeCambio.tc ??
        tipoDeCambio.oficial?.venta ??
        tipoDeCambio.oficial ??
        tipoDeCambio.blue?.venta ??
        tipoDeCambio.blue ??
        1;
      const n = toNumber(cand);
      return n > 0 ? n : 1;
    }
    return 1;
  }, [tipoDeCambio]);

  const original = useMemo(() => {
    return {
      clienteNombre: getNombreClienteOriginal(data),
      descripcion: data?.descripcion || data?.concepto || "",
      moneda: data?.moneda || data?.monedaDePago || "ARS",
      cc: data?.cc || data?.CC || "ARS",
      montoEnviado: toNumber(data?.montoEnviado),
      descuentoAplicado: typeof data?.descuentoAplicado === "number" ? data.descuentoAplicado : 1,
      subTotal: data?.subTotal || null,
      montoTotal: data?.montoTotal || null,
    };
  }, [data]);

  const [form, setForm] = useState({
    clienteNombre: "",
    descripcion: "",
    moneda: "ARS",
    cc: "ARS",
    montoEnviado: "",
  });

  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState("0");

  // TC editable por el usuario (string para controlar el input)
  const [tcInput, setTcInput] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        clienteNombre: original.clienteNombre,
        descripcion: original.descripcion,
        moneda: original.moneda,
        cc: original.cc,
        montoEnviado: original.montoEnviado === 0 ? "" : String(original.montoEnviado),
      });
      const pct =
        typeof original.descuentoAplicado === "number"
          ? Math.round((1 - original.descuentoAplicado) * 100)
          : 0;
      setDescuentoPorcentaje(String(pct));
      setTcInput(String(tcDefault)); // por defecto, el TC que viene por props
    }
  }, [open, original, tcDefault]);

  const handleChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  // TC numérico efectivo (si input inválido/0, caemos en tcDefault)
  const tc = useMemo(() => {
    const n = toNumber(tcInput);
    return n > 0 ? n : tcDefault;
  }, [tcInput, tcDefault]);

  // ===== Recalcular en cambios de descuento, moneda, cc, montoEnviado o TC =====
  const factorDescuento = useMemo(() => {
    const pct = toNumber(descuentoPorcentaje);
    const f = 1 - pct / 100;
    if (!Number.isFinite(f)) return 1;
    return Math.max(0, Math.min(1, f));
  }, [descuentoPorcentaje]);

  const subtotalEntregaRedondeado = useMemo(() => {
    // base = |montoEnviado|
    return Math.round(Math.abs(toNumber(form.montoEnviado)));
  }, [form.montoEnviado, form.moneda, form.cc]); // deps incluyen moneda/cc por pedido

  const montoConDescuentoRedondeado = useMemo(() => {
    return Math.round(subtotalEntregaRedondeado * factorDescuento);
  }, [subtotalEntregaRedondeado, factorDescuento]);

  // Mapea a {ars, usdOficial, usdBlue} con signo negativo (entrega)
  const calcularTotales = (base, cc) => {
    if (cc === "ARS") {
      return {
        ars: -base,
        usdOficial: -Math.round(base / tc),
        usdBlue: -Math.round(base / tc),
      };
    }
    if (cc === "USD OFICIAL" || cc === "USD BLUE") {
      return {
        ars: -Math.round(base * tc),
        usdOficial: -base,
        usdBlue: -base,
      };
    }
    return { ars: 0, usdOficial: 0, usdBlue: 0 };
  };

  const subTotal = useMemo(
    () => calcularTotales(subtotalEntregaRedondeado, form.cc),
    [subtotalEntregaRedondeado, form.cc, tc, form.moneda]
  );

  const montoTotal = useMemo(
    () => calcularTotales(montoConDescuentoRedondeado, form.cc),
    [montoConDescuentoRedondeado, form.cc, tc, form.moneda]
  );

  const handleSave = async () => {
    const requiredCliente = form.clienteNombre?.trim();
    const requiredMonto = toNumber(form.montoEnviado);

    if (!requiredCliente || !Number.isFinite(requiredMonto)) {
      alert("Completá Cliente y Monto.");
      return;
    }

    const current = {
      clienteNombre: form.clienteNombre.trim(),
      descripcion: (form.descripcion || "").trim(),
      moneda: form.moneda,
      cc: form.cc,
      montoEnviado: requiredMonto,
      descuentoAplicado: factorDescuento,
    };

    const cambios = {};

    if (current.clienteNombre !== original.clienteNombre)
      cambios.proveedorOCliente = current.clienteNombre;
    if (current.descripcion !== original.descripcion) cambios.descripcion = current.descripcion;
    if (current.moneda !== original.moneda) cambios.moneda = current.moneda;
    if (current.cc !== original.cc) cambios.cc = current.cc;
    if (current.montoEnviado !== original.montoEnviado) cambios.montoEnviado = current.montoEnviado;

    const originalFactor =
      typeof original.descuentoAplicado === "number" ? original.descuentoAplicado : 1;
    if (Math.abs(originalFactor - current.descuentoAplicado) > 1e-6) {
      cambios.descuentoAplicado = current.descuentoAplicado;
    }

    // Siempre comparamos y mandamos subTotal/montoTotal si cambiaron (incluye cambios por TC)
    if (JSON.stringify(subTotal) !== JSON.stringify(original.subTotal)) cambios.subTotal = subTotal;
    if (JSON.stringify(montoTotal) !== JSON.stringify(original.montoTotal))
      cambios.montoTotal = montoTotal;

    if (Object.keys(cambios).length === 0) {
      alert("No hay cambios para guardar");
      onClose?.();
      return;
    }

    setIsSaving(true);
    try {
      const result = await cuentasPendientesService.update(data._id, cambios, getUser());
      if (result?.success) {
        onSaved?.(result.data);
        onClose?.();
      } else {
        alert(result?.error || "Error al actualizar la entrega");
      }
    } catch (err) {
      console.error(err);
      alert("Error al actualizar la entrega");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => onClose?.();

  // Sugerencias de clientes (solo nombres)
  const clienteSugerencias = Array.isArray(clientes)
    ? clientes.map((c) => (typeof c === "string" ? c : c?.nombre)).filter(Boolean)
    : [];

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Editar Entrega</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                list="clientes-sugeridos"
                label="Cliente *"
                value={form.clienteNombre}
                onChange={handleChange("clienteNombre")}
                fullWidth
                margin="normal"
                placeholder="Nombre del cliente"
              />
              <datalist id="clientes-sugeridos">
                {clienteSugerencias.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Descripción"
                value={form.descripcion}
                onChange={handleChange("descripcion")}
                fullWidth
                margin="normal"
                placeholder="Detalle / concepto (opcional)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Monto *"
                value={form.montoEnviado}
                onChange={handleChange("montoEnviado")}
                fullWidth
                margin="normal"
                inputProps={{ inputMode: "decimal" }}
                placeholder="Ej: 1500"
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Moneda *</InputLabel>
                <Select value={form.moneda} label="Moneda *" onChange={handleChange("moneda")}>
                  {MONEDAS.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Cuenta Corriente *</InputLabel>
                <Select value={form.cc} label="Cuenta Corriente *" onChange={handleChange("cc")}>
                  {CC_OPTIONS.map((cc) => (
                    <MenuItem key={cc} value={cc}>
                      {cc}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Subtotal / Total / Descuento */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Subtotal (sin descuento)"
                value={formatNumberWithThousands(subtotalEntregaRedondeado)}
                margin="normal"
                disabled
                helperText="Calculado automáticamente"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Total (con descuento)"
                value={formatNumberWithThousands(montoConDescuentoRedondeado)}
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

            {/* Tipo de cambio editable */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tipo de cambio"
                type="text"
                value={tcInput}
                onChange={(e) => setTcInput(e.target.value)}
                margin="normal"
                inputProps={{ inputMode: "decimal" }}
                helperText="Podés modificarlo. Si está vacío/0, se usa el valor por defecto."
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
