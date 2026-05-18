import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SaveIcon from '@mui/icons-material/Save';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import proveedorService from 'src/services/proveedorService';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';

// ─── Context ──────────────────────────────────────────────────────────────────

const ProveedorDrawerContext = createContext({
  openDrawer: () => {},
  closeDrawer: () => {},
});

export const useProveedorDrawer = () => useContext(ProveedorDrawerContext);

// ─── Constantes ───────────────────────────────────────────────────────────────

const TAB_DATOS = 0;
const TAB_CUENTA = 1;
const TAB_PRETENDIDOS = 2;

const estadoChipColor = (estado) => {
  if (estado === 'Pagado') return 'success';
  if (estado === 'Pendiente') return 'warning';
  if (estado === 'Parcialmente Pagado') return 'info';
  return 'default';
};

// ─── Tab: Datos ───────────────────────────────────────────────────────────────

function TabDatos({ proveedor, empresaId, categoriasEmpresa, onSaved, onArchived }) {
  const provId = proveedor?._id || proveedor?.id;

  const [form, setForm] = useState({
    nombre: '', razon_social: '', cuit: '', direccion: '',
    tipo: 'materiales', tiene_cuenta_corriente: true, alias: [], categorias: [],
  });
  const [aliasInput, setAliasInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchivar, setConfirmArchivar] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!proveedor) return;
    setForm({
      nombre: proveedor.nombre || '',
      razon_social: proveedor.razon_social || '',
      cuit: proveedor.cuit || '',
      direccion: proveedor.direccion || '',
      tipo: proveedor.tipo || 'materiales',
      tiene_cuenta_corriente: proveedor.tiene_cuenta_corriente !== false,
      alias: proveedor.alias || [],
      categorias: proveedor.categorias || [],
    });
  }, [proveedor]);

  const handleSave = async () => {
    if (!form.nombre.trim()) { setErrorMsg('El nombre es obligatorio'); return; }
    setSaving(true);
    setErrorMsg('');
    try {
      await proveedorService.actualizar(empresaId, provId, {
        nombre: form.nombre.trim(),
        razon_social: form.razon_social.trim(),
        cuit: form.cuit.trim(),
        direccion: form.direccion.trim(),
        tipo: form.tipo,
        tiene_cuenta_corriente: form.tiene_cuenta_corriente,
        alias: form.alias,
        categorias: form.categorias,
      });
      onSaved?.();
    } catch {
      setErrorMsg('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const estaArchivado = proveedor?.archivado === true;

  const handleToggleArchivado = async () => {
    setArchiving(true);
    try {
      await proveedorService.actualizar(empresaId, provId, { archivado: !estaArchivado });
      setConfirmArchivar(false);
      onArchived?.();
    } catch {
      setErrorMsg(estaArchivado ? 'Error al desarchivar' : 'Error al archivar');
    } finally {
      setArchiving(false);
    }
  };

  const removeAlias = (a) => setForm(f => ({ ...f, alias: f.alias.filter(x => x !== a) }));
  const addAlias = () => {
    const v = aliasInput.trim();
    if (!v) return;
    setForm(f => ({ ...f, alias: [...new Set([...f.alias, v])] }));
    setAliasInput('');
  };

  const categoriasOptions = (categoriasEmpresa || []).flatMap(cat => [
    cat.name,
    ...(cat.subcategorias || []).map(sub => `${cat.name} - ${sub}`),
  ]);

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <TextField
          fullWidth label="Nombre" value={form.nombre}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
        />
        <TextField
          fullWidth label="CUIT" value={form.cuit}
          onChange={e => setForm(f => ({ ...f, cuit: e.target.value }))}
        />
        <TextField
          fullWidth label="Razón Social" value={form.razon_social}
          onChange={e => setForm(f => ({ ...f, razon_social: e.target.value }))}
        />
        <TextField
          fullWidth label="Dirección" value={form.direccion}
          onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
        />

        <FormControl fullWidth>
          <InputLabel>Tipo</InputLabel>
          <Select
            value={form.tipo} label="Tipo"
            onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
          >
            <MenuItem value="materiales">Materiales</MenuItem>
            <MenuItem value="mano_de_obra">Mano de obra</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={form.tiene_cuenta_corriente}
              onChange={e => setForm(f => ({ ...f, tiene_cuenta_corriente: e.target.checked }))}
            />
          }
          label="Gestionar cuenta corriente"
        />

        {/* Alias */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            Alias
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.5} mb={0.5}>
            {form.alias.map((a, i) => (
              <Chip key={i} label={a} size="small" onDelete={() => removeAlias(a)} />
            ))}
          </Stack>
          <TextField
            fullWidth size="small"
            placeholder="Escribí y presioná Enter"
            value={aliasInput}
            onChange={e => setAliasInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAlias(); } }}
          />
        </Box>

        {/* Categorías */}
        <Autocomplete
          multiple
          options={categoriasOptions}
          value={form.categorias}
          onChange={(_, v) => setForm(f => ({ ...f, categorias: v }))}
          renderTags={(value, getTagProps) =>
            value.map((opt, i) => (
              <Chip key={i} size="small" label={opt} {...getTagProps({ index: i })} />
            ))
          }
          renderInput={params => <TextField {...params} label="Categorías" />}
        />

        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

        <Stack direction="row" justifyContent="space-between">
          <Button
            variant={estaArchivado ? 'contained' : 'outlined'}
            color={estaArchivado ? 'success' : 'error'}
            size="small"
            onClick={() => setConfirmArchivar(true)}
          >
            {estaArchivado ? 'Desarchivar' : 'Archivar'}
          </Button>
          <Button
            variant="contained" startIcon={<SaveIcon />}
            onClick={handleSave} disabled={saving}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </Stack>
      </Stack>

      {/* Confirm archivar / desarchivar */}
      <Dialog open={confirmArchivar} onClose={() => setConfirmArchivar(false)}>
        <DialogTitle>{estaArchivado ? 'Desarchivar proveedor' : 'Archivar proveedor'}</DialogTitle>
        <DialogContent>
          <Typography>
            {estaArchivado
              ? `¿Desarchivar "${proveedor?.nombre}"? Volverá a aparecer en las listas.`
              : `¿Archivar "${proveedor?.nombre}"? No aparecerá en las listas pero sus datos se conservan.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmArchivar(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color={estaArchivado ? 'success' : 'error'}
            onClick={handleToggleArchivado}
            disabled={archiving}
          >
            {archiving
              ? (estaArchivado ? 'Desarchivando…' : 'Archivando…')
              : (estaArchivado ? 'Desarchivar' : 'Archivar')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Tab: Cuenta corriente ────────────────────────────────────────────────────

function TabCuentaCorriente({ movimientos, presupuesto, loading, proveedorNombre }) {
  const router = useRouter();

  const irACCC = () => {
    const params = proveedorNombre
      ? `?proveedor=${encodeURIComponent(proveedorNombre)}`
      : '';
    router.push(`/cuenta-corriente-proveedores${params}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!movimientos?.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Stack spacing={1.5}>
          <Typography color="text.secondary" variant="body2">Sin movimientos registrados</Typography>
          <Button size="small" variant="outlined" startIcon={<OpenInNewIcon fontSize="small" />} onClick={irACCC} sx={{ alignSelf: 'flex-start' }}>
            Ver cuenta corriente completa
          </Button>
        </Stack>
      </Box>
    );
  }

  const total = movimientos.reduce((s, m) => s + (m.total || 0), 0);
  const pagado = movimientos.reduce((s, m) => s + (m.monto_pagado || 0), 0);
  const saldo = total - pagado;

  return (
    <Box>
      {/* Resumen + link */}
      <Stack direction="row" alignItems="center" sx={{ px: 2, pt: 2, pb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5} sx={{ flex: 1 }}>
          <Chip label={`Total: ${formatCurrencyWithCode(total)}`} size="small" />
          <Chip label={`Pagado: ${formatCurrencyWithCode(pagado)}`} color="success" size="small" />
          {saldo > 0.005 && (
            <Chip label={`Saldo: ${formatCurrencyWithCode(saldo)}`} color="error" size="small" />
          )}
        </Stack>
        <Tooltip title="Abrir cuenta corriente completa">
          <IconButton size="small" onClick={irACCC}>
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {presupuesto && (
        <>
          <Divider />
          <Stack direction="row" spacing={1} sx={{ px: 2, py: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`Presup: ${formatCurrencyWithCode(presupuesto.monto, presupuesto.moneda)}`}
              size="small" variant="outlined"
            />
            {presupuesto.ejecutado != null && (
              <Chip
                label={`Ejec: ${formatCurrencyWithCode(presupuesto.ejecutado, presupuesto.moneda)}`}
                size="small" variant="outlined"
                color={presupuesto.ejecutado > presupuesto.monto ? 'error' : 'default'}
              />
            )}
          </Stack>
        </>
      )}

      <Divider />

      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Detalle</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...movimientos].reverse().map((m) => (
              <TableRow key={m._id || m.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {m.fecha_factura
                    ? formatTimestamp(m.fecha_factura, 'DIA/MES/ANO')
                    : '—'}
                </TableCell>
                <TableCell
                  sx={{
                    maxWidth: 160,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Tooltip title={m.detalle || m.observacion || m.categoria || ''}>
                    <span>{m.detalle || m.observacion || m.categoria || '—'}</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  {formatCurrencyWithCode(m.total, m.moneda)}
                </TableCell>
                <TableCell>
                  {m.estado
                    ? <Chip label={m.estado} size="small" color={estadoChipColor(m.estado)} />
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}

// ─── Tab: Pretendidos ─────────────────────────────────────────────────────────

function TabPretendidos({ pretendidos, loading }) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!pretendidos?.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary" variant="body2">Sin pretendidos registrados</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Fecha</TableCell>
            <TableCell>Descripción</TableCell>
            <TableCell align="right">Pretendido</TableCell>
            <TableCell align="right">Aprobado</TableCell>
            <TableCell>Estado</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...pretendidos].reverse().map((p) => (
            <TableRow key={p._id || p.id} hover>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {p.semana
                  ? new Date(p.semana).toLocaleDateString('es-AR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                    })
                  : '—'}
              </TableCell>
              <TableCell
                sx={{
                  maxWidth: 160,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.descripcion || '—'}
              </TableCell>
              <TableCell align="right">
                {formatCurrencyWithCode(p.monto_pretendido)}
              </TableCell>
              <TableCell align="right">
                {p.monto_aprobado != null ? formatCurrencyWithCode(p.monto_aprobado) : '—'}
              </TableCell>
              <TableCell>
                <Chip
                  label={p.estado}
                  size="small"
                  color={p.estado === 'cerrado' ? 'success' : 'warning'}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

// ─── ProveedorDrawer ──────────────────────────────────────────────────────────

function ProveedorDrawer({ open, onClose, proveedorId, empresaId, categoriasEmpresa, onUpdate }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [tab, setTab] = useState(TAB_DATOS);
  const [data, setData] = useState(null); // { proveedor, movimientos, presupuesto, pretendidos }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [togglingFav, setTogglingFav] = useState(false);

  const fetchData = useCallback(async () => {
    if (!proveedorId || !empresaId) return;
    setLoading(true);
    setError('');
    try {
      const result = await proveedorService.getCuentaCorriente(empresaId, proveedorId);
      setData(result);
    } catch {
      setError('Error al cargar el proveedor');
    } finally {
      setLoading(false);
    }
  }, [proveedorId, empresaId]);

  useEffect(() => {
    if (open) {
      setTab(TAB_DATOS);
      fetchData();
    } else {
      // Limpiar al cerrar (con delay para evitar flash)
      const t = setTimeout(() => setData(null), 300);
      return () => clearTimeout(t);
    }
  }, [open, fetchData]);

  const handleToggleFavorito = async () => {
    if (!data?.proveedor || togglingFav) return;
    const newVal = !data.proveedor.favorito;
    setTogglingFav(true);
    try {
      const id = data.proveedor._id || data.proveedor.id;
      await proveedorService.actualizar(empresaId, id, { favorito: newVal });
      setData(d => ({ ...d, proveedor: { ...d.proveedor, favorito: newVal } }));
      onUpdate?.();
    } finally {
      setTogglingFav(false);
    }
  };

  const proveedor = data?.proveedor;
  const hasPretendidos = proveedor?.tipo === 'mano_de_obra';

  const drawerSx = isMobile
    ? {
        '& .MuiDrawer-paper': {
          width: '100%',
          height: '90vh',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          flexDirection: 'column',
        },
      }
    : {
        '& .MuiDrawer-paper': {
          width: 480,
          display: 'flex',
          flexDirection: 'column',
        },
      };

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      sx={drawerSx}
    >
      {/* ── Header ── */}
      <Box sx={{ px: 2, pt: isMobile ? 2 : 1.5, pb: 0, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        {/* Handle para mobile */}
        {isMobile && (
          <Box sx={{ width: 40, height: 4, bgcolor: 'action.disabled', borderRadius: 2, mx: 'auto', mb: 1.5 }} />
        )}

        <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 0.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {!proveedor ? (
              <Box sx={{ height: 28, bgcolor: 'action.hover', borderRadius: 1, width: '55%' }} />
            ) : (
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" gap={0.5}>
                <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {proveedor.nombre}
                </Typography>
                <Chip
                  label={proveedor.tipo === 'mano_de_obra' ? 'Mano de obra' : 'Materiales'}
                  size="small"
                  variant="outlined"
                />
                {proveedor.archivado && (
                  <Chip label="Archivado" size="small" color="default" />
                )}
              </Stack>
            )}
          </Box>

          <Stack direction="row" spacing={0}>
            <Tooltip title={proveedor?.favorito ? 'Quitar favorito' : 'Marcar como favorito'}>
              <span>
                <IconButton size="small" onClick={handleToggleFavorito} disabled={togglingFav || !proveedor}>
                  {proveedor?.favorito
                    ? <StarIcon fontSize="small" sx={{ color: 'warning.main' }} />
                    : <StarBorderIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 36 }}
        >
          <Tab label="Datos" value={TAB_DATOS} sx={{ minHeight: 36, py: 0, px: 1.5 }} />
          <Tab label="Cuenta corriente" value={TAB_CUENTA} sx={{ minHeight: 36, py: 0, px: 1.5 }} />
          {hasPretendidos && (
            <Tab label="Pretendidos" value={TAB_PRETENDIDOS} sx={{ minHeight: 36, py: 0, px: 1.5 }} />
          )}
        </Tabs>
      </Box>

      {/* ── Loading bar ── */}
      {loading && <LinearProgress sx={{ flexShrink: 0 }} />}

      {/* ── Error ── */}
      {error && (
        <Alert severity="error" sx={{ m: 2, flexShrink: 0 }}>
          {error}
        </Alert>
      )}

      {/* ── Contenido ── */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {tab === TAB_DATOS && proveedor && (
          <TabDatos
            proveedor={proveedor}
            empresaId={empresaId}
            categoriasEmpresa={categoriasEmpresa}
            onSaved={() => { fetchData(); onUpdate?.(); }}
            onArchived={() => { onClose(); onUpdate?.(); }}
          />
        )}
        {tab === TAB_CUENTA && (
          <TabCuentaCorriente
            movimientos={data?.movimientos}
            presupuesto={data?.presupuesto}
            loading={loading && !data}
            proveedorNombre={proveedor?.nombre}
          />
        )}
        {tab === TAB_PRETENDIDOS && (
          <TabPretendidos
            pretendidos={data?.pretendidos}
            loading={loading && !data}
          />
        )}
      </Box>
    </Drawer>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProveedorDrawerProvider({ children, empresaId, categoriasEmpresa, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [proveedorId, setProveedorId] = useState(null);

  const openDrawer = useCallback((id) => {
    setProveedorId(id);
    setOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <ProveedorDrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      {children}
      <ProveedorDrawer
        open={open}
        onClose={closeDrawer}
        proveedorId={proveedorId}
        empresaId={empresaId}
        categoriasEmpresa={categoriasEmpresa}
        onUpdate={onUpdate}
      />
    </ProveedorDrawerContext.Provider>
  );
}

export default ProveedorDrawer;
