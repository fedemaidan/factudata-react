import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import {
  Alert,
  Autocomplete,
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
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import grupoClienteService from 'src/services/grupoClienteService';
import clienteService from 'src/services/clienteService';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';

function AgregarClienteDialog({ open, onClose, onAdd, clientesSinGrupo }) {
  const [sel, setSel] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setSel(null); }, [open]);

  const handleAdd = async () => {
    if (!sel) return;
    setSaving(true);
    try {
      await onAdd(sel);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>Agregar cliente al grupo</DialogTitle>
      <DialogContent>
        <Autocomplete
          sx={{ mt: 1 }}
          options={clientesSinGrupo}
          getOptionLabel={(o) => o.nombre || ''}
          value={sel}
          onChange={(_, v) => setSel(v)}
          renderInput={(params) => <TextField {...params} label="Cliente" autoFocus />}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={handleAdd} disabled={!sel || saving}>
          {saving ? 'Agregando…' : 'Agregar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function GrupoDetalle({ empresa, grupoId }) {
  const router = useRouter();
  const empresaId = empresa?.id;
  const [data, setData] = useState(null);
  const [todosClientes, setTodosClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!empresaId || !grupoId) return;
    setLoading(true);
    setError('');
    try {
      const [cc, all] = await Promise.all([
        grupoClienteService.getCuentaCorrienteAgregada(empresaId, grupoId),
        clienteService.getByEmpresaFull(empresaId).catch(() => []),
      ]);
      setData(cc);
      setTodosClientes(all || []);
    } catch {
      setError('Error al cargar el grupo');
    } finally {
      setLoading(false);
    }
  }, [empresaId, grupoId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const clientesSinGrupo = useMemo(
    () => (todosClientes || []).filter((c) => !c.grupo_id && !c.archivado),
    [todosClientes]
  );

  const handleAdd = async (cliente) => {
    await clienteService.actualizar(empresaId, cliente._id, { grupo_id: grupoId });
    await fetchData();
  };

  const handleQuitar = async (cliente) => {
    if (!window.confirm(`¿Quitar "${cliente.nombre}" de este grupo?`)) return;
    await clienteService.actualizar(empresaId, cliente._id, { grupo_id: null });
    await fetchData();
  };

  if (loading && !data) {
    return (
      <Container sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return <Container sx={{ py: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }

  const grupo = data?.grupo || {};
  const items = data?.items || [];
  const total = data?.total || 0;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => router.push('/grupos-cliente')}>
            Grupos
          </Button>
          {grupo.color && <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: grupo.color }} />}
          <Typography variant="h5" fontWeight={600}>{grupo.nombre || 'Grupo'}</Typography>
        </Stack>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setAddOpen(true)}>
          Agregar cliente al grupo
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={4} flexWrap="wrap">
          <Box>
            <Typography variant="caption" color="text.secondary">Clientes</Typography>
            <Typography variant="h6">{items.length}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Saldo consolidado</Typography>
            <Typography
              variant="h6"
              color={total > 0.005 ? 'warning.main' : total < -0.005 ? 'info.main' : 'text.primary'}
            >
              {formatCurrencyWithCode(total)}
            </Typography>
          </Box>
          {grupo.notas && (
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">Notas</Typography>
              <Typography variant="body2">{grupo.notas}</Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        Clientes del grupo
      </Typography>
      <Paper variant="outlined">
        {items.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              Todavía no hay clientes en este grupo.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell>Cliente</TableCell>
                <TableCell>CUIT</TableCell>
                <TableCell align="right">Saldo</TableCell>
                <TableCell>Última actividad</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((it) => {
                const c = it.cliente;
                const id = c._id || c.id;
                return (
                  <TableRow key={id} hover>
                    <TableCell>
                      <NextLink href={`/cliente/${id}`} passHref legacyBehavior>
                        <a style={{ color: 'inherit', textDecoration: 'none' }}>
                          <Typography variant="body2" fontWeight={500}>{c.nombre}</Typography>
                        </a>
                      </NextLink>
                      {it.tiene_vencidas && (
                        <Chip size="small" label="Vencida" color="error" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>{c.cuit || '—'}</TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        color={it.saldo > 0.005 ? 'warning.main' : it.saldo < -0.005 ? 'info.main' : 'text.primary'}
                      >
                        {formatCurrencyWithCode(it.saldo)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {it.ultima_actividad ? formatTimestamp(it.ultima_actividad) : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" color="error" onClick={() => handleQuitar(c)}>
                        Quitar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <AgregarClienteDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
        clientesSinGrupo={clientesSinGrupo}
      />
    </Container>
  );
}

const Page = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuthContext();
  const [empresa, setEmpresa] = useState(null);

  useEffect(() => {
    getEmpresaDetailsFromUser(user).then(setEmpresa);
  }, [user]);

  return (
    <>
      <Head><title>Grupo de cliente</title></Head>
      {empresa && id ? (
        <GrupoDetalle empresa={empresa} grupoId={id} />
      ) : (
        <Container sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      )}
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
