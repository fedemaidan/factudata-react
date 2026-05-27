import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import NextLink from 'next/link';
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
  Paper,
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
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import grupoClienteService from 'src/services/grupoClienteService';
import clienteService from 'src/services/clienteService';
import { formatCurrencyWithCode } from 'src/utils/formatters';

const COLOR_PRESETS = [
  '#1976d2', '#388e3c', '#f57c00', '#7b1fa2',
  '#c2185b', '#0097a7', '#5d4037', '#455a64',
];

function GrupoFormDialog({ open, onClose, onSubmit, initial }) {
  const [form, setForm] = useState({ nombre: '', notas: '', color: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        nombre: initial?.nombre || '',
        notas: initial?.notas || '',
        color: initial?.color || null,
      });
      setError('');
    }
  }, [open, initial]);

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(form);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>{initial ? 'Editar grupo' : 'Nuevo grupo de cliente'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Notas"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />
          <Box>
            <Typography variant="caption" color="text.secondary">Color</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
              {COLOR_PRESETS.map((c) => (
                <Box
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  sx={{
                    width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                    border: form.color === c ? '3px solid #000' : '1px solid #ccc',
                  }}
                />
              ))}
              <Box
                onClick={() => setForm({ ...form, color: null })}
                sx={{
                  width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                  border: form.color === null ? '3px solid #000' : '1px dashed #999',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12,
                }}
              >×</Box>
            </Stack>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !form.nombre.trim()}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function GruposClienteContent({ empresa }) {
  const empresaId = empresa?.id;
  const [grupos, setGrupos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [resumen, setResumen] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError('');
    try {
      const [g, c, r] = await Promise.all([
        grupoClienteService.getByEmpresa(empresaId),
        clienteService.getByEmpresaFull(empresaId).catch(() => []),
        clienteService.getResumenFinanciero(empresaId).catch(() => []),
      ]);
      setGrupos(g || []);
      setClientes(c || []);
      const map = {};
      (r || []).forEach((x) => { map[x.cliente_id] = x; });
      setResumen(map);
    } catch {
      setError('Error al cargar grupos');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
    const m = {};
    for (const g of grupos) {
      m[g._id] = { count: 0, saldo: 0 };
    }
    for (const c of clientes) {
      if (!c.grupo_id || !m[c.grupo_id]) continue;
      m[c.grupo_id].count += 1;
      const r = resumen[c._id];
      if (r) m[c.grupo_id].saldo += r.saldo || 0;
    }
    return m;
  }, [grupos, clientes, resumen]);

  const handleArchivar = async (g) => {
    if (!window.confirm(`¿Archivar el grupo "${g.nombre}"? Los clientes se desvincularán pero no se eliminan.`)) return;
    try {
      await grupoClienteService.archivar(empresaId, g._id);
      await fetchData();
    } catch {
      setError('Error al archivar');
    }
  };

  const handleSubmit = async (form) => {
    if (editing) {
      await grupoClienteService.actualizar(empresaId, editing._id, form);
    } else {
      await grupoClienteService.crear(empresaId, form);
    }
    await fetchData();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>Grupos de cliente</Typography>
          <Typography variant="body2" color="text.secondary">
            Agrupá clientes que pertenecen al mismo dueño (ej. un constructor con varias SRL).
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Actualizar">
            <span>
              <Button variant="outlined" size="small" onClick={fetchData} disabled={loading} sx={{ minWidth: 0, px: 1 }}>
                <RefreshIcon fontSize="small" />
              </Button>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setDialogOpen(true); }}>
            Nuevo grupo
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined">
        {loading && grupos.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress size={32} />
          </Box>
        ) : grupos.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No hay grupos todavía.</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell>Grupo</TableCell>
                <TableCell align="right"># Clientes</TableCell>
                <TableCell align="right">Saldo total CC</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grupos.map((g) => {
                const s = stats[g._id] || { count: 0, saldo: 0 };
                return (
                  <TableRow key={g._id} hover>
                    <TableCell>
                      <NextLink href={`/grupo-cliente/${g._id}`} passHref legacyBehavior>
                        <a style={{ color: 'inherit', textDecoration: 'none' }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {g.color && (
                              <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: g.color }} />
                            )}
                            <Typography variant="body2" fontWeight={500}>{g.nombre}</Typography>
                          </Stack>
                          {g.notas && (
                            <Typography variant="caption" color="text.secondary">{g.notas}</Typography>
                          )}
                        </a>
                      </NextLink>
                    </TableCell>
                    <TableCell align="right">
                      <Chip size="small" label={s.count} variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={s.saldo > 0.005 ? 'warning.main' : s.saldo < -0.005 ? 'info.main' : 'text.primary'}
                      >
                        {formatCurrencyWithCode(s.saldo)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <Button size="small" onClick={() => { setEditing(g); setDialogOpen(true); }} sx={{ minWidth: 0, px: 1 }}>
                          <EditIcon fontSize="small" />
                        </Button>
                      </Tooltip>
                      <Tooltip title="Archivar">
                        <Button size="small" color="error" onClick={() => handleArchivar(g)} sx={{ minWidth: 0, px: 1 }}>
                          <ArchiveIcon fontSize="small" />
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <GrupoFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        initial={editing}
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
        <Head><title>Grupos de cliente</title></Head>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning">Esta sección está disponible solo para corralones.</Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head><title>Grupos de cliente</title></Head>
      <GruposClienteContent empresa={empresa} />
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
