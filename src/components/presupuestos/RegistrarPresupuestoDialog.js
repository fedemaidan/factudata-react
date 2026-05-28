/**
 * RegistrarPresupuestoDialog — crea un nuevo Presupuesto para un proveedor dado.
 * Dialog simple con campos esenciales: monto, moneda, proyecto, fecha,
 * etapa/categoría opcionales.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import PresupuestoService from 'src/services/presupuestoService';
import { getProyectosByEmpresaId } from 'src/services/proyectosService';

// Key para recordar el último $/m² usado (por moneda) en localStorage.
const LS_PRECIO_M2_KEY = 'sorby:presupuesto:lastPrecioM2';

const readLastPrecioM2 = (moneda) => {
  try {
    const raw = localStorage.getItem(LS_PRECIO_M2_KEY);
    if (!raw) return '';
    const data = JSON.parse(raw);
    const v = data?.[moneda];
    return v != null ? String(v) : '';
  } catch {
    return '';
  }
};

const saveLastPrecioM2 = (moneda, valor) => {
  try {
    const raw = localStorage.getItem(LS_PRECIO_M2_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[moneda] = valor;
    localStorage.setItem(LS_PRECIO_M2_KEY, JSON.stringify(data));
  } catch {
    // noop
  }
};

const MONEDAS = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
  { value: 'CAC', label: 'CAC' },
];

const TIPOS = [
  { value: 'egreso',  label: 'Egreso (gasto a proveedor)' },
  { value: 'ingreso', label: 'Ingreso (cobro al proveedor)' },
];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function RegistrarPresupuestoDialog({
  open,
  onClose,
  onSuccess,
  empresaId,
  proveedor, // objeto Proveedor completo
  categoriasEmpresa = [],
}) {
  const [proyectos, setProyectos] = useState([]);
  const [loadingProyectos, setLoadingProyectos] = useState(false);

  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState('ARS');
  const [tipo, setTipo] = useState('egreso');
  const [proyectoSel, setProyectoSel] = useState(null);
  const [etapa, setEtapa] = useState('');
  const [categoria, setCategoria] = useState('');
  const [fecha, setFecha] = useState(todayISO());

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Categorías disponibles (planas)
  const opcionesCategorias = useMemo(() => {
    return (categoriasEmpresa || []).flatMap((cat) => [
      cat.name,
      ...(cat.subcategorias || []).map((s) => `${cat.name} - ${s}`),
    ]);
  }, [categoriasEmpresa]);

  // Reset al abrir
  useEffect(() => {
    if (!open) return;
    setMonto('');
    setMoneda('ARS');
    setTipo('egreso');
    setProyectoSel(null);
    setEtapa('');
    setCategoria('');
    setFecha(todayISO());
    setError(null);
  }, [open]);

  // Cargar proyectos
  useEffect(() => {
    if (!open || !empresaId) return;
    setLoadingProyectos(true);
    getProyectosByEmpresaId(empresaId)
      .then(setProyectos)
      .catch(() => setProyectos([]))
      .finally(() => setLoadingProyectos(false));
  }, [open, empresaId]);

  // ── Calculadora de m² (sólo mano de obra) ─────────────────────────────────
  const esManoDeObra = proveedor?.tipo === 'mano_de_obra';
  const calcAnchorRef = useRef(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcM2, setCalcM2] = useState('');
  const [calcPrecio, setCalcPrecio] = useState('');

  // Cuando se abre la calculadora, prefill $/m² con el último usado para esa moneda
  useEffect(() => {
    if (!calcOpen) return;
    setCalcPrecio((prev) => prev || readLastPrecioM2(moneda));
  }, [calcOpen, moneda]);

  const calcM2Num = parseFloat(String(calcM2).replace(',', '.'));
  const calcPrecioNum = parseFloat(String(calcPrecio).replace(',', '.'));
  const calcTotal = (Number.isFinite(calcM2Num) && Number.isFinite(calcPrecioNum))
    ? calcM2Num * calcPrecioNum
    : null;
  const calcAplicable = calcTotal !== null && calcTotal > 0;

  const handleAplicarCalc = () => {
    if (!calcAplicable) return;
    // Redondeo a 2 decimales para evitar arrastres tipo 99.99999
    setMonto(String(Math.round(calcTotal * 100) / 100));
    saveLastPrecioM2(moneda, calcPrecioNum);
    setCalcOpen(false);
  };

  if (!proveedor) return null;

  const montoNum = parseFloat(String(monto).replace(',', '.'));
  const montoValido = Number.isFinite(montoNum) && montoNum > 0;

  const handleGuardar = async () => {
    if (!montoValido) {
      setError('El monto debe ser un número mayor a 0');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const provId = proveedor._id || proveedor.id;
      // Convertir el campo `categoria` plano (legacy) al formato nuevo `clasificaciones[]`.
      // Si la categoría tiene formato "Cat - Sub", la dividimos.
      const clasificaciones = (() => {
        if (!categoria) return [];
        const parts = String(categoria).split(' - ');
        const cat = parts[0]?.trim();
        const sub = parts[1]?.trim();
        if (!cat) return [];
        return [{ categoria: cat, subcategorias: sub ? [sub] : [] }];
      })();

      const payload = {
        empresa_id: empresaId,
        // Formato nuevo: array de proveedores
        proveedores: [{ id: provId, nombre: proveedor.nombre }],
        monto: montoNum,
        moneda,
        tipo,
        proyecto_id: proyectoSel?.id || proyectoSel?._id || null,
        etapa: etapa.trim() || null,
        clasificaciones,
        fecha_presupuesto: fecha,
      };
      await PresupuestoService.crearPresupuesto(payload);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('Error al crear presupuesto:', err);
      setError(err.response?.data?.error || 'No se pudo crear el presupuesto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Nuevo presupuesto — <Typography component="span" fontWeight={700}>{proveedor.nombre}</Typography>
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack spacing={2}>
          {/* Monto + Moneda */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Monto"
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                endAdornment: esManoDeObra ? (
                  <InputAdornment position="end">
                    <Tooltip title="Calcular por m²">
                      <IconButton
                        ref={calcAnchorRef}
                        size="small"
                        onClick={() => setCalcOpen(true)}
                        sx={{ opacity: 0.4, '&:hover': { opacity: 1 } }}
                      >
                        <CalculateOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ) : undefined,
              }}
              fullWidth
              autoFocus
              required
            />

            {/* Calculadora de m² — sutil, sólo para mano de obra */}
            <Popover
              open={calcOpen}
              anchorEl={calcAnchorRef.current}
              onClose={() => setCalcOpen(false)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { p: 1.5, width: 280 } } }}
            >
              <Stack spacing={1.25}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Calcular monto por m²
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    label="m²"
                    type="number"
                    size="small"
                    value={calcM2}
                    onChange={(e) => setCalcM2(e.target.value)}
                    autoFocus
                    fullWidth
                  />
                  <Typography color="text.secondary">×</Typography>
                  <TextField
                    label={`${moneda}/m²`}
                    type="number"
                    size="small"
                    value={calcPrecio}
                    onChange={(e) => setCalcPrecio(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                    fullWidth
                  />
                </Stack>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {calcAplicable
                      ? `= $${calcTotal.toLocaleString('es-AR', { maximumFractionDigits: 2 })} ${moneda}`
                      : '—'}
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleAplicarCalc}
                    disabled={!calcAplicable}
                  >
                    Aplicar
                  </Button>
                </Box>
              </Stack>
            </Popover>
            <TextField
              select
              label="Moneda"
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              {MONEDAS.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </TextField>
          </Stack>

          {/* Tipo */}
          <TextField
            select
            label="Tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            fullWidth
          >
            {TIPOS.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </TextField>

          {/* Proyecto */}
          <Autocomplete
            options={proyectos}
            value={proyectoSel}
            onChange={(_, v) => setProyectoSel(v)}
            getOptionLabel={(p) => p?.nombre || ''}
            isOptionEqualToValue={(a, b) => (a.id || a._id) === (b.id || b._id)}
            loading={loadingProyectos}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Proyecto (opcional)"
                placeholder={loadingProyectos ? 'Cargando…' : 'Sin proyecto específico'}
              />
            )}
          />

          {/* Etapa + Fecha */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Etapa (opcional)"
              value={etapa}
              onChange={(e) => setEtapa(e.target.value)}
              fullWidth
              placeholder="Ej: Estructura, Fundaciones…"
            />
            <TextField
              label="Fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />
          </Stack>

          {/* Categoría */}
          <Autocomplete
            options={opcionesCategorias}
            value={categoria}
            onChange={(_, v) => setCategoria(v || '')}
            freeSolo
            renderInput={(params) => (
              <TextField {...params} label="Categoría (opcional)" placeholder="Sin categoría" />
            )}
          />
        </Stack>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            El presupuesto se asocia automáticamente a este proveedor. Para más opciones (CAC, indexación, adicionales), editalo desde la sección Control de presupuestos.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleGuardar}
          disabled={saving || !montoValido}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          {saving ? 'Guardando…' : 'Crear presupuesto'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
