import { useCallback, useEffect, useState } from 'react';
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
  IconButton,
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import sucursalService from 'src/services/sucursalService';

const EMPTY_FORM = { nombre: '', direccion: '', telefono: '' };

function SucursalesContent({ empresa }) {
  const empresaId = empresa?.id;
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError('');
    try {
      const data = await sucursalService.getByEmpresa(empresaId, {
        incluirArchivadas: true,
      });
      setSucursales(data || []);
    } catch {
      setError('Error al cargar sucursales');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (s) => {
    setEditingId(s._id || s.id);
    setForm({
      nombre: s.nombre || '',
      direccion: s.direccion || '',
      telefono: s.telefono || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await sucursalService.actualizar(empresaId, editingId, form);
      } else {
        await sucursalService.crear(empresaId, form);
      }
      setDialogOpen(false);
      await fetchData();
    } catch {
      setError('Error al guardar la sucursal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`¿Archivar la sucursal "${s.nombre}"?`)) return;
    try {
      await sucursalService.eliminar(empresaId, s._id || s.id);
      await fetchData();
    } catch {
      setError('Error al eliminar la sucursal');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5" fontWeight={600}>
          Sucursales
        </Typography>
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
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Nueva sucursal
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined">
        {loading && sucursales.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress size={32} />
          </Box>
        ) : sucursales.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No hay sucursales todavía.</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell>Nombre</TableCell>
                <TableCell>Dirección</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sucursales.map((s) => (
                <TableRow key={s._id || s.id} hover sx={{ opacity: s.archivada ? 0.55 : 1 }}>
                  <TableCell>{s.nombre}</TableCell>
                  <TableCell>{s.direccion || '—'}</TableCell>
                  <TableCell>{s.telefono || '—'}</TableCell>
                  <TableCell>
                    {s.archivada ? (
                      <Chip size="small" label="Archivada" />
                    ) : (
                      <Chip size="small" color="success" label="Activa" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(s)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {!s.archivada && (
                      <IconButton size="small" onClick={() => handleDelete(s)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingId ? 'Editar sucursal' : 'Nueva sucursal'}</DialogTitle>
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
              label="Dirección"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
            <TextField
              fullWidth
              label="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.nombre.trim()}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
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
          <title>Sucursales</title>
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
        <title>Sucursales</title>
      </Head>
      <SucursalesContent empresa={empresa} />
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
