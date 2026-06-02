import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import NextLink from 'next/link';
import {
  Alert,
  Autocomplete,
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
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ImportarClientes from 'src/components/clientes/ImportarClientes';
import ClienteDetalleDrawer from 'src/components/clientes/ClienteDetalleDrawer';
import ClienteFormDrawer from 'src/components/clientes/ClienteFormDrawer';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useRouter } from 'next/router';
import { useAuthContext } from 'src/contexts/auth-context';
import { useSucursalContext } from 'src/contexts/sucursal-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import clienteService from 'src/services/clienteService';
import grupoClienteService from 'src/services/grupoClienteService';
import { formatCurrencyWithCode } from 'src/utils/formatters';
import MenuItem from '@mui/material/MenuItem';

const renderEstadoCC = (resumen) => {
  if (!resumen) return <Chip size="small" label="—" variant="outlined" />;
  const saldo = resumen.saldo || 0;
  if (resumen.tiene_vencidas) return <Chip size="small" label="Vencida" color="error" />;
  if (saldo > 0.005) return <Chip size="small" label="Debe" color="warning" />;
  if (saldo < -0.005) return <Chip size="small" label="A favor" color="info" />;
  return <Chip size="small" label="Al día" color="success" variant="outlined" />;
};

function ClientesContent({ empresa }) {
  const router = useRouter();
  const empresaId = empresa?.id;
  const { sucursalId } = useSucursalContext();

  const esCorralon = empresa?.vertical === 'corralon';
  const [clientes, setClientes] = useState([]);
  const [resumenMap, setResumenMap] = useState({});
  const [grupos, setGrupos] = useState([]);
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [importOpen, setImportOpen] = useState(false);
  // Alta/edición de cliente: ClienteFormDrawer (ver formDrawer state abajo).
  // Multiselección + bulk asignar a grupo
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState('existente'); // 'existente' | 'nuevo'
  const [bulkGrupo, setBulkGrupo] = useState(null);      // grupo seleccionado (existente)
  const [bulkNuevoNombre, setBulkNuevoNombre] = useState(''); // nombre grupo nuevo
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState('');

  const [linkSnack, setLinkSnack] = useState('');
  const [detalleId, setDetalleId] = useState(null);
  const [formDrawer, setFormDrawer] = useState({ open: false, cliente: null });

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError('');
    try {
      const [list, resumen, gruposList] = await Promise.all([
        clienteService.getByEmpresaFull(empresaId, { incluirArchivados: true }),
        clienteService.getResumenFinanciero(empresaId).catch(() => []),
        esCorralon ? grupoClienteService.getByEmpresa(empresaId).catch(() => []) : Promise.resolve([]),
      ]);
      setClientes(list || []);
      const map = {};
      (resumen || []).forEach((r) => {
        map[r.cliente_id] = r;
      });
      setResumenMap(map);
      setGrupos(gruposList || []);
    } catch {
      setError('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [empresaId, esCorralon]);

  const grupoById = useMemo(() => {
    const m = {};
    for (const g of grupos) m[g._id] = g;
    return m;
  }, [grupos]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Deep-link: ?cliente=<id> abre el drawer de detalle (redirect de /cliente/[id]).
  useEffect(() => {
    if (router.query?.cliente) {
      setDetalleId(String(router.query.cliente));
      const { cliente, ...rest } = router.query;
      router.replace({ pathname: '/clientes', query: rest }, undefined, { shallow: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query?.cliente]);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return (clientes || []).filter((c) => {
      if (c.archivado) return false;
      if (sucursalId && c.sucursal_id && c.sucursal_id !== sucursalId) return false;
      if (filtroGrupo) {
        if (filtroGrupo === '__sin_grupo__') {
          if (c.grupo_id) return false;
        } else if (filtroGrupo === '__ocasionales__') {
          if (!c.ocasional) return false;
        } else if (c.grupo_id !== filtroGrupo) {
          return false;
        }
      }
      if (!q) return true;
      const matchNombre = (c.nombre || '').toLowerCase().includes(q);
      const matchCuit = (c.cuit || '').includes(q);
      return matchNombre || matchCuit;
    });
  }, [clientes, busqueda, sucursalId, filtroGrupo]);

  // ─── Multiselección ──────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const isSelected = (id) => selectedIds.includes(id);
  const allFiltradosSelected = filtrados.length > 0
    && filtrados.every((c) => selectedIds.includes(c._id || c.id));
  const someFiltradosSelected = filtrados.some((c) => selectedIds.includes(c._id || c.id));
  const toggleSelectAll = () => {
    if (allFiltradosSelected) {
      const ids = new Set(filtrados.map((c) => c._id || c.id));
      setSelectedIds((prev) => prev.filter((x) => !ids.has(x)));
    } else {
      const nuevos = filtrados.map((c) => c._id || c.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...nuevos])));
    }
  };

  const openBulkAsignar = () => {
    setBulkOpen(true);
    setBulkMode('existente');
    setBulkGrupo(null);
    setBulkNuevoNombre('');
    setBulkError('');
  };

  const handleBulkAsignar = async () => {
    setBulkError('');
    if (bulkMode === 'existente' && !bulkGrupo) { setBulkError('Elegí un grupo'); return; }
    if (bulkMode === 'nuevo' && !bulkNuevoNombre.trim()) { setBulkError('Ingresá el nombre del grupo'); return; }
    setBulkSaving(true);
    try {
      let grupoId = bulkGrupo?._id;
      if (bulkMode === 'nuevo') {
        const nuevo = await grupoClienteService.crear(empresaId, { nombre: bulkNuevoNombre.trim() });
        grupoId = nuevo?._id || nuevo?.id;
      }
      if (!grupoId) throw new Error('No se pudo obtener el grupo destino');
      // Update cliente por cliente. Para v1 alcanza; bulk endpoint se puede sumar después.
      for (const id of selectedIds) {
        try { await clienteService.actualizar(empresaId, id, { grupo_id: grupoId }); }
        catch (e) { console.warn('No se pudo asignar', id, e); }
      }
      setBulkOpen(false);
      setSelectedIds([]);
      await fetchData();
    } catch (err) {
      setBulkError(err?.response?.data?.error || err?.message || 'Error al asignar al grupo');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleBulkQuitar = async () => {
    if (!selectedIds.length) return;
    setBulkSaving(true);
    try {
      for (const id of selectedIds) {
        try { await clienteService.actualizar(empresaId, id, { grupo_id: null }); } catch (_) {}
      }
      setBulkOpen(false);
      setSelectedIds([]);
      await fetchData();
    } finally {
      setBulkSaving(false);
    }
  };

  // Editar y nuevo van por el drawer (ClienteFormDrawer).
  const openEditDialog = (c) => setFormDrawer({ open: true, cliente: c });

  const handleGenerarLink = async (c) => {
    try {
      const { url, token } = await clienteService.generarTokenPublico(
        empresaId,
        c._id || c.id
      );
      // Si el backend no devolvió url completa (o vino relativa), la armamos con el origin.
      let finalUrl = url;
      if (!finalUrl || finalUrl.startsWith('/')) {
        const path = finalUrl?.startsWith('/') ? finalUrl : `/consulta-saldo/${token}`;
        finalUrl = `${window.location.origin}${path}`;
      }
      try {
        await navigator.clipboard.writeText(finalUrl);
        setLinkSnack(`Link copiado: ${finalUrl}`);
      } catch {
        setLinkSnack(`Link: ${finalUrl}`);
      }
    } catch {
      setError('Error al generar el link público');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Clientes
          </Typography>
          {!loading && (
            <Typography variant="body2" color="text.secondary">
              {filtrados.length} activo{filtrados.length !== 1 ? 's' : ''}
              {sucursalId && ' · filtrado por sucursal'}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Actualizar">
            <span>
              <Button
                variant="outlined"
                size="small"
                onClick={fetchData}
                disabled={loading}
                sx={{ minWidth: 0, px: 1 }}
              >
                <RefreshIcon fontSize="small" />
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => setImportOpen(true)}
          >
            Importar Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setFormDrawer({ open: true, cliente: null })}
          >
            Nuevo cliente
          </Button>
        </Stack>
      </Stack>

      <ImportarClientes
        open={importOpen}
        onClose={() => setImportOpen(false)}
        empresaId={empresaId}
        onDone={() => fetchData()}
      />

      {/* Toolbar bulk: solo aparece cuando hay clientes seleccionados (vertical corralón) */}
      {esCorralon && selectedIds.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            mb: 2, p: 1.5, display: 'flex', alignItems: 'center', gap: 2,
            bgcolor: 'primary.lighter', borderColor: 'primary.light',
          }}
        >
          <Typography variant="body2" sx={{ flexGrow: 1 }}>
            <strong>{selectedIds.length}</strong> cliente{selectedIds.length !== 1 ? 's' : ''} seleccionado{selectedIds.length !== 1 ? 's' : ''}
          </Typography>
          <Button size="small" onClick={() => setSelectedIds([])}>Limpiar</Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<GroupsIcon />}
            onClick={openBulkAsignar}
          >
            Asignar a grupo
          </Button>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ mb: 2, p: 1.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            fullWidth
            placeholder="Buscar por nombre o CUIT…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {esCorralon && grupos.length > 0 && (
            <TextField
              size="small"
              select
              label="Grupo"
              value={filtroGrupo}
              onChange={(e) => setFiltroGrupo(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="__sin_grupo__">Sin titular</MenuItem>
              <MenuItem value="__ocasionales__">Ocasionales</MenuItem>
              {grupos.map((g) => (
                <MenuItem key={g._id} value={g._id}>{g.nombre}</MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined">
        {loading && clientes.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress size={32} />
          </Box>
        ) : filtrados.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {busqueda ? 'Sin resultados' : 'No hay clientes todavía.'}
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                {esCorralon && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={someFiltradosSelected && !allFiltradosSelected}
                      checked={allFiltradosSelected}
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                )}
                <TableCell>Nombre</TableCell>
                <TableCell>CUIT</TableCell>
                {esCorralon && <TableCell>Grupo</TableCell>}
                <TableCell align="right">Saldo CC</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtrados.map((c) => {
                const id = c._id || c.id;
                const r = resumenMap[id];
                return (
                  <TableRow
                    key={id}
                    hover
                    selected={isSelected(id)}
                    onClick={() => setDetalleId(id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {esCorralon && (
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected(id)}
                          onChange={() => toggleSelect(id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography component="span" variant="body2" fontWeight={500}>
                        {c.nombre}
                      </Typography>
                      {c.ocasional && (
                        <Chip size="small" label="Ocasional" variant="outlined" color="warning" sx={{ ml: 1, height: 18, fontSize: 10 }} />
                      )}
                    </TableCell>
                    <TableCell>{c.cuit || '—'}</TableCell>
                    {esCorralon && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {c.grupo_id && grupoById[c.grupo_id] ? (
                          <NextLink href={`/grupo-cliente/${c.grupo_id}`} passHref legacyBehavior>
                            <a style={{ textDecoration: 'none' }}>
                              <Chip
                                size="small"
                                label={grupoById[c.grupo_id].nombre}
                                sx={{
                                  bgcolor: grupoById[c.grupo_id].color || undefined,
                                  color: grupoById[c.grupo_id].color ? '#fff' : undefined,
                                  cursor: 'pointer',
                                }}
                              />
                            </a>
                          </NextLink>
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                    )}
                    <TableCell align="right">
                      {r ? formatCurrencyWithCode(r.saldo || 0) : '—'}
                    </TableCell>
                    <TableCell>{renderEstadoCC(r)}</TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Generar link público de consulta">
                        <IconButton size="small" onClick={() => handleGenerarLink(c)}>
                          <LinkIcon fontSize="small" />
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


      {/* Modal: asignar bulk a grupo */}
      <Dialog
        open={bulkOpen}
        onClose={() => !bulkSaving && setBulkOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Asignar {selectedIds.length} cliente{selectedIds.length !== 1 ? 's' : ''} a grupo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant={bulkMode === 'existente' ? 'contained' : 'outlined'}
                onClick={() => setBulkMode('existente')}
              >Grupo existente</Button>
              <Button
                size="small"
                variant={bulkMode === 'nuevo' ? 'contained' : 'outlined'}
                onClick={() => setBulkMode('nuevo')}
              >Crear nuevo</Button>
            </Stack>

            {bulkMode === 'existente' ? (
              <Autocomplete
                options={grupos}
                getOptionLabel={(g) => g?.nombre || ''}
                value={bulkGrupo}
                onChange={(_, v) => setBulkGrupo(v)}
                renderInput={(p) => <TextField {...p} label="Grupo destino" autoFocus />}
                isOptionEqualToValue={(a, b) => (a?._id || a?.id) === (b?._id || b?.id)}
              />
            ) : (
              <TextField
                autoFocus
                label="Nombre del nuevo grupo"
                value={bulkNuevoNombre}
                onChange={(e) => setBulkNuevoNombre(e.target.value)}
                fullWidth
              />
            )}

            {bulkError && <Alert severity="error">{bulkError}</Alert>}

            <Typography variant="caption" color="text.secondary">
              Si alguno de los clientes ya pertenecía a otro grupo, su grupo va a ser reemplazado.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
          <Button
            color="error"
            size="small"
            onClick={handleBulkQuitar}
            disabled={bulkSaving}
          >
            Quitar del grupo
          </Button>
          <Box>
            <Button onClick={() => setBulkOpen(false)} disabled={bulkSaving}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleBulkAsignar}
              disabled={bulkSaving || (bulkMode === 'existente' ? !bulkGrupo : !bulkNuevoNombre.trim())}
            >
              {bulkSaving ? 'Asignando…' : 'Asignar'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!linkSnack}
        autoHideDuration={6000}
        onClose={() => setLinkSnack('')}
        message={linkSnack}
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={() => {
              const url = linkSnack.replace(/^Link( copiado)?:\s*/, '');
              navigator.clipboard?.writeText(url);
            }}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        }
      />

      <ClienteDetalleDrawer
        open={Boolean(detalleId)}
        clienteId={detalleId}
        empresaId={empresaId}
        esCorralon={esCorralon}
        onClose={() => setDetalleId(null)}
        onChanged={() => fetchData()}
        onEdit={(c) => { setDetalleId(null); openEditDialog(c); }}
      />

      <ClienteFormDrawer
        open={formDrawer.open}
        cliente={formDrawer.cliente}
        empresaId={empresaId}
        grupos={grupos}
        onClose={() => setFormDrawer({ open: false, cliente: null })}
        onSaved={() => fetchData()}
      />
    </Container>
  );
}

const Page = () => {
  const { user } = useAuthContext();
  const [empresa, setEmpresa] = useState(null);

  useEffect(() => {
    getEmpresaDetailsFromUser(user).then(setEmpresa);
  }, [user]);

  if (empresa && empresa.vertical !== 'corralon') {
    return (
      <DashboardLayout>
        <Head>
          <title>Clientes</title>
        </Head>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning">
            Esta sección está disponible solo para corralones.
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Clientes</title>
      </Head>
      <ClientesContent empresa={empresa} />
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
