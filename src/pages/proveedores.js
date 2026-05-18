import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Papa from 'papaparse';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import proveedorService from 'src/services/proveedorService';
import { ProveedorDrawerProvider, useProveedorDrawer } from 'src/components/ProveedorDrawer';

// ─── Componente interno (necesita el contexto del drawer) ──────────────────────

function ProveedoresContent({ empresa, refreshKey }) {
  const { openDrawer } = useProveedorDrawer();
  const empresaId = empresa?.id;

  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos' | 'materiales' | 'mano_de_obra'
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [verArchivados, setVerArchivados] = useState(false);

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

  const fetchProveedores = useCallback(async (incluirArchivados = false) => {
    if (!empresaId) return;
    setLoading(true);
    setError('');
    try {
      const data = await proveedorService.getByEmpresaFull(empresaId, { incluirArchivados });
      setProveedores(data);
    } catch {
      setError('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { fetchProveedores(verArchivados); }, [fetchProveedores, verArchivados]);
  // Refetch cuando el drawer guarda/archiva un proveedor
  useEffect(() => { if (refreshKey > 0) fetchProveedores(verArchivados); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return proveedores.filter(p => {
      if (soloFavoritos && !p.favorito) return false;
      if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false;
      if (q) {
        const matchNombre = (p.nombre || '').toLowerCase().includes(q);
        const matchCuit = (p.cuit || '').includes(q);
        const matchAlias = (p.alias || []).some(a => a.toLowerCase().includes(q));
        if (!matchNombre && !matchCuit && !matchAlias) return false;
      }
      return true;
    });
  }, [proveedores, busqueda, filtroTipo, soloFavoritos]);

  // Favoritos primero → activos → archivados al final
  const ordenados = useMemo(() => {
    const favs    = filtrados.filter(p =>  p.favorito && !p.archivado);
    const activos = filtrados.filter(p => !p.favorito && !p.archivado);
    const archivados = filtrados.filter(p => p.archivado);
    return [...favs, ...activos, ...archivados];
  }, [filtrados]);

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
      await fetchProveedores(verArchivados);
      // Abrir el drawer del proveedor recién creado
      const id = result.proveedor_id || result._id || result.id;
      if (id) openDrawer(id);
    } catch {
      setCreateError('Error al crear el proveedor');
    } finally {
      setCreating(false);
    }
  };

  // ── CSV Import ──────────────────────────────────────────────────────────────

  const handleImportCSV = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    e.target.value = '';
    setImportando(true);
    setImportMsg('');
    try {
      const texto = await archivo.text();
      const { data: rows } = Papa.parse(texto, { header: true, skipEmptyLines: true });
      const categoriasEmpresa = (empresa?.categorias || []).flatMap(cat => [
        cat.name,
        ...(cat.subcategorias || []).map(sub => `${cat.name} - ${sub}`),
      ]);
      const categoriasSet = new Set(categoriasEmpresa);

      const nuevos = rows
        .map(row => ({
          nombre: row.Nombre?.trim() ?? '',
          cuit: row.CUIT?.trim() ?? '',
          razon_social: row['Razon Social']?.trim() ?? '',
          direccion: row.Direccion?.trim() ?? '',
          alias: row.Alias ? row.Alias.split(',').map(a => a.trim()).filter(Boolean) : [],
          categorias: row.Categorias
            ? row.Categorias.split(',').map(c => c.trim()).filter(c => categoriasSet.has(c))
            : [],
        }))
        .filter(p => p.nombre);

      if (!nuevos.length) {
        setImportMsg('No se encontraron filas válidas en el archivo.');
        return;
      }
      await proveedorService.importar(empresaId, nuevos);
      await fetchProveedores();
      setImportMsg(`${nuevos.length} proveedor${nuevos.length !== 1 ? 'es' : ''} importado${nuevos.length !== 1 ? 's' : ''}.`);
    } catch {
      setImportMsg('Error al importar el CSV.');
    } finally {
      setImportando(false);
    }
  };

  const handleExportCSV = () => {
    if (!proveedores.length) return;
    const rows = proveedores.map(p => ({
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

  const totalMateriales = proveedores.filter(p => p.tipo === 'materiales' && !p.archivado).length;
  const totalManoObra = proveedores.filter(p => p.tipo === 'mano_de_obra' && !p.archivado).length;
  const totalFavoritos = proveedores.filter(p => p.favorito && !p.archivado).length;
  const totalArchivados = proveedores.filter(p => p.archivado).length;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>Proveedores</Typography>
          {!loading && (
            <Typography variant="body2" color="text.secondary">
              {proveedores.filter(p => !p.archivado).length} proveedor{proveedores.filter(p => !p.archivado).length !== 1 ? 'es' : ''}
              {totalFavoritos > 0 && ` · ${totalFavoritos} favorito${totalFavoritos !== 1 ? 's' : ''}`}
              {totalArchivados > 0 && ` · ${totalArchivados} archivado${totalArchivados !== 1 ? 's' : ''}`}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
          <Tooltip title="Actualizar">
            <span>
              <Button
                variant="outlined" size="small"
                onClick={() => fetchProveedores(verArchivados)} disabled={loading}
                sx={{ minWidth: 0, px: 1 }}
              >
                <RefreshIcon fontSize="small" />
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Exportar CSV">
            <span>
              <Button
                variant="outlined" size="small"
                onClick={handleExportCSV} disabled={!proveedores.length}
                sx={{ minWidth: 0, px: 1 }}
              >
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
          <input
            ref={csvInputRef} type="file" accept=".csv"
            hidden onChange={handleImportCSV}
          />
          <Button
            variant="contained" startIcon={<AddIcon />}
            onClick={() => { setNuevoNombre(''); setNuevoTipo('materiales'); setCreateError(''); setDialogOpen(true); }}
          >
            Nuevo proveedor
          </Button>
        </Stack>
      </Stack>

      {/* ── Filtros ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar por nombre, CUIT o alias…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
          sx={{ flex: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Tipo</InputLabel>
          <Select value={filtroTipo} label="Tipo" onChange={e => setFiltroTipo(e.target.value)}>
            <MenuItem value="todos">Todos ({proveedores.length})</MenuItem>
            <MenuItem value="materiales">Materiales ({totalMateriales})</MenuItem>
            <MenuItem value="mano_de_obra">Mano de obra ({totalManoObra})</MenuItem>
          </Select>
        </FormControl>
        <Chip
          icon={soloFavoritos ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
          label={`Favoritos${totalFavoritos > 0 ? ` (${totalFavoritos})` : ''}`}
          onClick={() => setSoloFavoritos(v => !v)}
          color={soloFavoritos ? 'warning' : 'default'}
          variant={soloFavoritos ? 'filled' : 'outlined'}
          sx={{ height: 40, cursor: 'pointer' }}
        />
        <Chip
          label={`Archivados${totalArchivados > 0 ? ` (${totalArchivados})` : ''}`}
          onClick={() => { setVerArchivados(v => !v); setSoloFavoritos(false); }}
          color={verArchivados ? 'default' : 'default'}
          variant={verArchivados ? 'filled' : 'outlined'}
          sx={{ height: 40, cursor: 'pointer', opacity: totalArchivados === 0 && !verArchivados ? 0.4 : 1 }}
        />
      </Stack>

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

      {/* ── Error ── */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Tabla ── */}
      <Paper variant="outlined">
        {loading && proveedores.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress size={32} />
          </Box>
        ) : ordenados.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {busqueda || filtroTipo !== 'todos' || soloFavoritos
                ? 'Sin resultados para los filtros seleccionados'
                : 'No hay proveedores cargados'}
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell sx={{ width: 32 }} />
                <TableCell>Nombre</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>CUIT</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Razón Social</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Cta. cte.</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Categorías</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ordenados.map((prov, idx) => {
                const id = prov._id || prov.id;
                const prevProv = ordenados[idx - 1];
                // Divisor después de favoritos, y antes del primer archivado
                const showDividerFav = idx > 0 && !prov.favorito && !prov.archivado && prevProv?.favorito === true;
                const showDividerArch = idx > 0 && prov.archivado && !prevProv?.archivado;
                return (
                  <>
                    {showDividerFav && (
                      <TableRow key={`div-fav-${id}`}>
                        <TableCell colSpan={7} sx={{ p: 0 }}><Divider /></TableCell>
                      </TableRow>
                    )}
                    {showDividerArch && (
                      <TableRow key={`div-arch-${id}`}>
                        <TableCell colSpan={7} sx={{ p: 0, pt: 0.5 }}>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 0.5, bgcolor: 'action.hover' }}>
                            <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Archivados
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow
                      key={id}
                      hover
                      onClick={() => openDrawer(id)}
                      sx={{ cursor: 'pointer', opacity: prov.archivado ? 0.5 : 1 }}
                    >
                      {/* Favorito */}
                      <TableCell sx={{ width: 32, pr: 0 }}>
                        {prov.favorito && (
                          <StarIcon fontSize="small" sx={{ color: 'warning.main', display: 'block' }} />
                        )}
                      </TableCell>

                      {/* Nombre */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={prov.favorito ? 600 : 400}>
                          {prov.nombre}
                        </Typography>
                        {prov.alias?.length > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {prov.alias.join(', ')}
                          </Typography>
                        )}
                      </TableCell>

                      {/* CUIT */}
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Typography variant="body2" color="text.secondary">
                          {prov.cuit || '—'}
                        </Typography>
                      </TableCell>

                      {/* Razón Social */}
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="body2" color="text.secondary">
                          {prov.razon_social || '—'}
                        </Typography>
                      </TableCell>

                      {/* Tipo */}
                      <TableCell>
                        <Chip
                          label={prov.tipo === 'mano_de_obra' ? 'Mano de obra' : 'Materiales'}
                          size="small"
                          variant="outlined"
                          color={prov.tipo === 'mano_de_obra' ? 'primary' : 'default'}
                        />
                      </TableCell>

                      {/* Cuenta corriente */}
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        {prov.tiene_cuenta_corriente !== false ? (
                          <Chip label="Activa" size="small" color="success" variant="outlined" />
                        ) : (
                          <Chip label="Sin cta." size="small" variant="outlined" />
                        )}
                      </TableCell>

                      {/* Categorías */}
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                          {(prov.categorias || []).slice(0, 2).map((c, i) => (
                            <Chip key={i} label={c} size="small" />
                          ))}
                          {(prov.categorias || []).length > 2 && (
                            <Chip label={`+${prov.categorias.length - 2}`} size="small" variant="outlined" />
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* ── Dialog: Nuevo proveedor ── */}
      <Dialog
        open={dialogOpen}
        onClose={() => !creating && setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Nuevo proveedor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              label="Nombre"
              value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCrear(); }}
            />
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={nuevoTipo}
                label="Tipo"
                onChange={e => setNuevoTipo(e.target.value)}
              >
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
