import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  IconButton,
  Paper,
  Select,
  Stack,
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
import AddIcon from '@mui/icons-material/Add';
import BalanceIcon from '@mui/icons-material/Balance';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Papa from 'papaparse';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import proveedorService from 'src/services/proveedorService';
import { ProveedorDrawerProvider, useProveedorDrawer } from 'src/components/ProveedorDrawer';
import AjustarCuentasDialog from 'src/components/proveedores/AjustarCuentasDialog';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'favoritos',  label: 'Favoritos'  },
  { key: 'recientes',  label: 'Recientes'  },
  { key: 'con_deuda',  label: 'Con deuda'  },
  { key: 'todos',      label: 'Todos'      },
  { key: 'archivados', label: 'Archivados' },
];

const renderEstadoCC = (resumen) => {
  if (!resumen) return <Chip size="small" label="—" variant="outlined" />;
  const saldo = resumen.saldo || 0;
  if (resumen.tiene_vencidas) return <Chip size="small" label="Vencida" color="error" />;
  if (saldo > 0.005) return <Chip size="small" label="Con deuda" color="warning" />;
  if (saldo < -0.005) return <Chip size="small" label="A favor" color="info" />;
  return <Chip size="small" label="Al día" color="success" variant="outlined" />;
};

// ─── Componente interno (necesita el contexto del drawer) ──────────────────────

function ProveedoresContent({ empresa, refreshKey }) {
  const { openDrawer } = useProveedorDrawer();
  const router = useRouter();
  const empresaId = empresa?.id;

  const [proveedores, setProveedores] = useState([]);
  const [resumenMap, setResumenMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Tabs y filtros secundarios — default "Todos" para no ocultar proveedores al entrar
  const [tab, setTab] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  // Selección múltiple (sólo activa en tab Con deuda para ajuste de cuentas)
  const [seleccionados, setSeleccionados] = useState(() => new Set());
  const [ajusteDialogOpen, setAjusteDialogOpen] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos' | 'materiales' | 'mano_de_obra'

  // CSV
  const csvInputRef = useRef(null);
  const [importando, setImportando] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  // Dialog nuevo proveedor
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('materiales');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (incluirArchivados = false) => {
    if (!empresaId) return;
    setLoading(true);
    setError('');
    try {
      const [provs, resumen] = await Promise.all([
        proveedorService.getByEmpresaFull(empresaId, { incluirArchivados: true }),
        proveedorService.getResumenFinanciero(empresaId).catch(() => []),
      ]);
      setProveedores(provs);
      const map = {};
      (resumen || []).forEach((r) => { map[r.proveedor_id] = r; });
      setResumenMap(map);
    } catch {
      setError('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (refreshKey > 0) fetchData(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtrado por tab + búsqueda + tipo ─────────────────────────────────────
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return proveedores.filter((p) => {
      const id = p._id || p.id;
      const r = resumenMap[id];
      const archivado = !!p.archivado;
      const enDeuda = (r?.saldo || 0) > 0.005;

      // Filtro por tab
      if (tab === 'favoritos'  && (!p.favorito || archivado)) return false;
      if (tab === 'recientes'  && (archivado || !r?.ultimo_movimiento)) return false;
      if (tab === 'con_deuda'  && (!enDeuda || archivado)) return false;
      if (tab === 'todos'      && archivado) return false;
      if (tab === 'archivados' && !archivado) return false;

      // Filtro tipo
      if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false;

      // Búsqueda
      if (q) {
        const matchNombre = (p.nombre || '').toLowerCase().includes(q);
        const matchCuit = (p.cuit || '').includes(q);
        const matchAlias = (p.alias || []).some((a) => a.toLowerCase().includes(q));
        if (!matchNombre && !matchCuit && !matchAlias) return false;
      }
      return true;
    });
  }, [proveedores, resumenMap, tab, busqueda, filtroTipo]);

  // ── Orden según tab ────────────────────────────────────────────────────────
  const ordenados = useMemo(() => {
    const arr = [...filtrados];
    if (tab === 'recientes') {
      // Por fecha del último movimiento (factura) — el más reciente primero
      arr.sort((a, b) => {
        const ra = resumenMap[a._id || a.id]?.ultimo_movimiento;
        const rb = resumenMap[b._id || b.id]?.ultimo_movimiento;
        const da = ra ? new Date(ra).getTime() : 0;
        const db = rb ? new Date(rb).getTime() : 0;
        return db - da;
      });
    } else if (tab === 'con_deuda') {
      // Por saldo deudor descendente (los con más deuda primero)
      arr.sort((a, b) => {
        const da = resumenMap[a._id || a.id]?.saldo || 0;
        const db = resumenMap[b._id || b.id]?.saldo || 0;
        return db - da;
      });
    } else if (tab === 'todos' || tab === 'favoritos') {
      // Favoritos primero, después alfabético
      arr.sort((a, b) => {
        if (!!a.favorito !== !!b.favorito) return a.favorito ? -1 : 1;
        return (a.nombre || '').localeCompare(b.nombre || '');
      });
    } else {
      arr.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    }
    return arr;
  }, [filtrados, tab, resumenMap]);

  // ── Contadores por tab ─────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { favoritos: 0, recientes: 0, con_deuda: 0, todos: 0, archivados: 0 };
    proveedores.forEach((p) => {
      const id = p._id || p.id;
      const r = resumenMap[id];
      const archivado = !!p.archivado;
      if (archivado) c.archivados += 1;
      else {
        c.todos += 1;
        if (r?.ultimo_movimiento) c.recientes += 1;
        if (p.favorito) c.favoritos += 1;
        if ((r?.saldo || 0) > 0.005) c.con_deuda += 1;
      }
    });
    return c;
  }, [proveedores, resumenMap]);

  // ── Crear ──────────────────────────────────────────────────────────────────
  const handleCrear = async () => {
    if (!nuevoNombre.trim()) { setCreateError('El nombre es obligatorio'); return; }
    setCreating(true);
    setCreateError('');
    try {
      const result = await proveedorService.crear(empresaId, {
        nombre: nuevoNombre.trim(),
        tipo: nuevoTipo,
      });
      setDialogOpen(false);
      setNuevoNombre('');
      setNuevoTipo('materiales');
      await fetchData();
      const id = result.proveedor_id || result._id || result.id;
      if (id) openDrawer(id);
    } catch {
      setCreateError('Error al crear el proveedor');
    } finally {
      setCreating(false);
    }
  };

  // ── CSV Import / Export ────────────────────────────────────────────────────
  const handleImportCSV = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    e.target.value = '';
    setImportando(true);
    setImportMsg('');
    try {
      const texto = await archivo.text();
      const { data: rows } = Papa.parse(texto, { header: true, skipEmptyLines: true });
      const categoriasEmpresa = (empresa?.categorias || []).flatMap((cat) => [
        cat.name,
        ...(cat.subcategorias || []).map((sub) => `${cat.name} - ${sub}`),
      ]);
      const categoriasSet = new Set(categoriasEmpresa);

      const nuevos = rows
        .map((row) => ({
          nombre: row.Nombre?.trim() ?? '',
          cuit: row.CUIT?.trim() ?? '',
          razon_social: row['Razon Social']?.trim() ?? '',
          direccion: row.Direccion?.trim() ?? '',
          alias: row.Alias ? row.Alias.split(',').map((a) => a.trim()).filter(Boolean) : [],
          categorias: row.Categorias
            ? row.Categorias.split(',').map((c) => c.trim()).filter((c) => categoriasSet.has(c))
            : [],
        }))
        .filter((p) => p.nombre);

      if (!nuevos.length) {
        setImportMsg('No se encontraron filas válidas en el archivo.');
        return;
      }
      await proveedorService.importar(empresaId, nuevos);
      await fetchData();
      setImportMsg(`${nuevos.length} proveedor${nuevos.length !== 1 ? 'es' : ''} importado${nuevos.length !== 1 ? 's' : ''}.`);
    } catch {
      setImportMsg('Error al importar el CSV.');
    } finally {
      setImportando(false);
    }
  };

  const handleExportCSV = () => {
    if (!proveedores.length) return;
    const rows = proveedores.map((p) => ({
      Nombre: p.nombre,
      CUIT: p.cuit || '',
      'Razon Social': p.razon_social || '',
      Direccion: p.direccion || '',
      Alias: (p.alias || []).join(', '),
      Categorias: (p.categorias || []).join(', '),
      Tipo: p.tipo || '',
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proveedores_${empresaId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDescargarEjemplo = () => {
    const ejemplo = 'Nombre,CUIT,Razon Social,Direccion,Alias,Categorias\nEjemplo SA,20123456789,Ejemplo SRL,Calle 123,,Materiales';
    const blob = new Blob([ejemplo], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proveedores_ejemplo.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const tabsVisibles = TABS.filter((t) => t.key !== 'archivados' || counts.archivados > 0);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>Proveedores</Typography>
          {!loading && (
            <Typography variant="body2" color="text.secondary">
              {counts.todos} activo{counts.todos !== 1 ? 's' : ''}
              {counts.con_deuda > 0 && ` · ${counts.con_deuda} con deuda`}
              {counts.favoritos > 0 && ` · ${counts.favoritos} favorito${counts.favoritos !== 1 ? 's' : ''}`}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
          <Tooltip title="Actualizar">
            <span>
              <Button variant="outlined" size="small" onClick={() => fetchData()} disabled={loading} sx={{ minWidth: 0, px: 1 }}>
                <RefreshIcon fontSize="small" />
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Exportar CSV">
            <span>
              <Button variant="outlined" size="small" onClick={handleExportCSV} disabled={!proveedores.length} sx={{ minWidth: 0, px: 1 }}>
                <FileDownloadIcon fontSize="small" />
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="outlined" size="small"
            startIcon={<UploadFileIcon fontSize="small" />}
            onClick={() => csvInputRef.current?.click()}
            disabled={importando}
          >
            {importando ? 'Importando…' : 'Importar CSV'}
          </Button>
          <input ref={csvInputRef} type="file" accept=".csv" hidden onChange={handleImportCSV} />
          <Button
            variant="contained" startIcon={<AddIcon />}
            onClick={() => { setNuevoNombre(''); setNuevoTipo('materiales'); setCreateError(''); setDialogOpen(true); }}
          >
            Nuevo proveedor
          </Button>
        </Stack>
      </Stack>

      {/* ── Tabs ── */}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setSeleccionados(new Set()); }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}
        >
          {tabsVisibles.map((t) => (
            <Tab
              key={t.key}
              value={t.key}
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{t.label}</span>
                  <Chip size="small" label={counts[t.key]} sx={{ height: 18, fontSize: 11 }} />
                </Stack>
              }
            />
          ))}
        </Tabs>

        {/* ── Filtros secundarios ── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ p: 1.5 }}>
          <TextField
            size="small"
            placeholder="Buscar por nombre, CUIT o alias…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={filtroTipo} label="Tipo" onChange={(e) => setFiltroTipo(e.target.value)}>
              <MenuItem value="todos">Todos</MenuItem>
              <MenuItem value="materiales">Materiales</MenuItem>
              <MenuItem value="mano_de_obra">Mano de obra</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* ── Mensajes import ── */}
      {importMsg && (
        <Alert
          severity={importMsg.startsWith('Error') || importMsg.startsWith('No se') ? 'error' : 'success'}
          onClose={() => setImportMsg('')}
          sx={{ mb: 2 }}
          action={
            !importMsg.startsWith('Error') && !importMsg.startsWith('No se') ? undefined : (
              <Button size="small" color="inherit" onClick={handleDescargarEjemplo}>
                Descargar ejemplo
              </Button>
            )
          }
        >
          {importMsg}
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Barra de acciones para tab Con deuda ── */}
      {tab === 'con_deuda' && ordenados.length > 0 && (() => {
        const proveedoresConSaldo = ordenados.filter((p) => {
          const r = resumenMap[p._id || p.id];
          return (r?.saldo || 0) > 0.005;
        });
        const seleccionadosArr = proveedoresConSaldo.filter((p) => seleccionados.has(p._id || p.id));
        const todosSeleccionados = proveedoresConSaldo.length > 0
          && seleccionadosArr.length === proveedoresConSaldo.length;
        const algunoSeleccionado = seleccionadosArr.length > 0;

        const totalDeudaSeleccionados = seleccionadosArr.reduce((acc, p) => {
          const r = resumenMap[p._id || p.id];
          return acc + (r?.saldo || 0);
        }, 0);

        const toggleTodos = () => {
          if (todosSeleccionados) {
            setSeleccionados(new Set());
          } else {
            setSeleccionados(new Set(proveedoresConSaldo.map((p) => p._id || p.id)));
          }
        };

        const proveedoresParaAjuste = seleccionadosArr.map((p) => ({
          _id: p._id || p.id,
          nombre: p.nombre,
          saldo: resumenMap[p._id || p.id]?.saldo || 0,
        }));

        return (
          <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={toggleTodos}
                  disabled={proveedoresConSaldo.length === 0}
                >
                  {todosSeleccionados ? 'Deseleccionar todos' : `Seleccionar todos (${proveedoresConSaldo.length})`}
                </Button>
                {algunoSeleccionado && (
                  <Chip
                    size="small"
                    color="warning"
                    label={`${seleccionadosArr.length} seleccionado${seleccionadosArr.length !== 1 ? 's' : ''} · ${formatCurrencyWithCode(totalDeudaSeleccionados)}`}
                  />
                )}
              </Stack>
              <Tooltip title="Genera un Pago 'Ajuste inicial' por cada proveedor seleccionado que cierra su saldo en cero.">
                <span>
                  <Button
                    variant="contained"
                    color="warning"
                    size="small"
                    startIcon={<BalanceIcon fontSize="small" />}
                    onClick={() => setAjusteDialogOpen(true)}
                    disabled={!algunoSeleccionado}
                  >
                    Ajustar cuentas
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Paper>
        );
      })()}

      {/* ── Tabla ── */}
      <Paper variant="outlined">
        {loading && proveedores.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress size={32} />
          </Box>
        ) : ordenados.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {busqueda || filtroTipo !== 'todos'
                ? 'Sin resultados para los filtros aplicados'
                : 'No hay proveedores en esta vista'}
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                {tab === 'con_deuda' && <TableCell padding="checkbox" />}
                <TableCell sx={{ width: 32 }} />
                <TableCell>Nombre</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell align="right">Saldo</TableCell>
                <TableCell align="right">Facturas abiertas</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Último movimiento</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Último pago</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right" sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {ordenados.map((prov) => {
                const id = prov._id || prov.id;
                const r = resumenMap[id];
                return (
                  <TableRow
                    key={id}
                    hover
                    onClick={() => openDrawer(id)}
                    sx={{ cursor: 'pointer', opacity: prov.archivado ? 0.55 : 1 }}
                  >
                    {tab === 'con_deuda' && (
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          size="small"
                          checked={seleccionados.has(id)}
                          disabled={(r?.saldo || 0) <= 0.005}
                          onChange={(e) => {
                            setSeleccionados((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(id);
                              else next.delete(id);
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell sx={{ width: 32, pr: 0 }}>
                      {prov.favorito && <StarIcon fontSize="small" sx={{ color: 'warning.main', display: 'block' }} />}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={prov.favorito ? 600 : 400}>
                        {prov.nombre}
                      </Typography>
                      {prov.alias?.length > 0 && (
                        <Typography variant="caption" color="text.secondary">{prov.alias.join(', ')}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={prov.tipo === 'mano_de_obra' ? 'Mano de obra' : 'Materiales'}
                        size="small"
                        variant="outlined"
                        color={prov.tipo === 'mano_de_obra' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {(() => {
                        const saldo = r?.saldo || 0;
                        if (saldo > 0.005) {
                          return (
                            <Typography variant="body2" fontWeight={600} color={r.tiene_vencidas ? 'error.main' : 'warning.main'}>
                              {formatCurrencyWithCode(saldo)}
                            </Typography>
                          );
                        }
                        if (saldo < -0.005) {
                          return (
                            <Box>
                              <Typography variant="body2" fontWeight={600} color="info.main">
                                {formatCurrencyWithCode(Math.abs(saldo))}
                              </Typography>
                              <Typography variant="caption" color="info.main">a favor</Typography>
                            </Box>
                          );
                        }
                        return <Typography variant="body2" color="text.disabled">—</Typography>;
                      })()}
                    </TableCell>
                    <TableCell align="right">
                      {(r?.cantidad_facturas_abiertas || 0) > 0
                        ? <Chip size="small" label={r.cantidad_facturas_abiertas} variant="outlined" />
                        : <Typography variant="body2" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2" color="text.secondary">
                        {r?.ultimo_movimiento ? formatTimestamp(r.ultimo_movimiento) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2" color="text.secondary">
                        {r?.ultimo_pago ? formatTimestamp(r.ultimo_pago) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{renderEstadoCC(r)}</TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ width: 48 }}>
                      <Tooltip title="Cargar movimiento de caja">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => router.push({
                            pathname: '/movementForm',
                            query: { proveedorNombre: prov.nombre },
                          })}
                        >
                          <PointOfSaleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* ── Dialog: Nuevo proveedor ── */}
      <Dialog open={dialogOpen} onClose={() => !creating && setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nuevo proveedor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus fullWidth label="Nombre"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCrear(); }}
            />
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select value={nuevoTipo} label="Tipo" onChange={(e) => setNuevoTipo(e.target.value)}>
                <MenuItem value="materiales">Materiales</MenuItem>
                <MenuItem value="mano_de_obra">Mano de obra</MenuItem>
              </Select>
            </FormControl>
            {createError && <Alert severity="error">{createError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={creating}>Cancelar</Button>
          <Button variant="contained" onClick={handleCrear} disabled={creating || !nuevoNombre.trim()}>
            {creating ? 'Creando…' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Ajustar cuentas (cerrar saldo histórico) ── */}
      <AjustarCuentasDialog
        open={ajusteDialogOpen}
        onClose={() => setAjusteDialogOpen(false)}
        onSuccess={() => {
          setAjusteDialogOpen(false);
          setSeleccionados(new Set());
          fetchData();
        }}
        empresaId={empresaId}
        proveedores={(proveedores || [])
          .filter((p) => seleccionados.has(p._id || p.id))
          .map((p) => ({
            _id: p._id || p.id,
            nombre: p.nombre,
            saldo: resumenMap[p._id || p.id]?.saldo || 0,
          }))}
      />
    </Container>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const Page = () => {
  const { user } = useAuthContext();
  const [empresa, setEmpresa] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getEmpresaDetailsFromUser(user).then(setEmpresa);
  }, [user]);

  const acciones = user?.empresa?.acciones || user?.empresaData?.acciones || [];
  const tienePermiso = user?.admin
    || acciones.includes('GESTIONAR_PROVEEDORES')
    || acciones.includes('VER_CUENTA_CORRIENTE_PROVEEDORES');

  if (empresa && !tienePermiso) {
    return (
      <DashboardLayout>
        <Head><title>Proveedores</title></Head>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning">No tenés permisos para ver esta sección.</Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Proveedores</title>
      </Head>
      <ProveedorDrawerProvider
        empresaId={empresa?.id}
        categoriasEmpresa={empresa?.categorias || []}
        onUpdate={() => setRefreshKey((k) => k + 1)}
      >
        <ProveedoresContent empresa={empresa} refreshKey={refreshKey} />
      </ProveedorDrawerProvider>
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
