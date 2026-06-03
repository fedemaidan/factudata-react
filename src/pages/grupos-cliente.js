import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import grupoClienteService from 'src/services/grupoClienteService';
import clienteService from 'src/services/clienteService';
import { formatCurrencyWithCode } from 'src/utils/formatters';
import GrupoDetalleDrawer from 'src/components/clientes/GrupoDetalleDrawer';
import GrupoFormDrawer from 'src/components/clientes/GrupoFormDrawer';

function GruposClienteContent({ empresa }) {
  const router = useRouter();
  const empresaId = empresa?.id;
  const [grupos, setGrupos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [resumen, setResumen] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detalleId, setDetalleId] = useState(null);
  const [formDrawer, setFormDrawer] = useState({ open: false, grupo: null });

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
      setError('Error al cargar titulares');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Deep-link: ?grupo=<id> abre el drawer de detalle (redirect de /grupo-cliente/[id]).
  useEffect(() => {
    if (router.query?.grupo) {
      setDetalleId(String(router.query.grupo));
      const { grupo, ...rest } = router.query;
      router.replace({ pathname: '/grupos-cliente', query: rest }, undefined, { shallow: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query?.grupo]);

  const stats = useMemo(() => {
    const m = {};
    for (const g of grupos) m[g._id] = { count: 0, saldo: 0 };
    for (const c of clientes) {
      if (!c.grupo_id || !m[c.grupo_id]) continue;
      m[c.grupo_id].count += 1;
      const r = resumen[c._id];
      if (r) m[c.grupo_id].saldo += r.saldo || 0;
    }
    return m;
  }, [grupos, clientes, resumen]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>Titulares (grupos de cliente)</Typography>
          <Typography variant="body2" color="text.secondary">
            Agrupá los clientes que pertenecen al mismo dueño (ej. un constructor con varias SRL/razones sociales).
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
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormDrawer({ open: true, grupo: null })}>
            Nuevo titular
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined">
        {loading && grupos.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress size={32} /></Box>
        ) : grupos.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No hay titulares todavía.</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell>Titular</TableCell>
                <TableCell align="right"># Clientes</TableCell>
                <TableCell align="right">Saldo consolidado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grupos.map((g) => {
                const s = stats[g._id] || { count: 0, saldo: 0 };
                return (
                  <TableRow key={g._id} hover onClick={() => setDetalleId(g._id)} sx={{ cursor: 'pointer' }}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {g.color && <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: g.color }} />}
                        <Typography variant="body2" fontWeight={500}>{g.nombre}</Typography>
                      </Stack>
                      {g.notas && <Typography variant="caption" color="text.secondary">{g.notas}</Typography>}
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <GrupoDetalleDrawer
        open={Boolean(detalleId)}
        grupoId={detalleId}
        empresaId={empresaId}
        onClose={() => setDetalleId(null)}
        onChanged={() => fetchData()}
        onEdit={(g) => { setDetalleId(null); setFormDrawer({ open: true, grupo: g }); }}
      />

      <GrupoFormDrawer
        open={formDrawer.open}
        grupo={formDrawer.grupo}
        empresaId={empresaId}
        onClose={() => setFormDrawer({ open: false, grupo: null })}
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
        <Head><title>Titulares</title></Head>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning">Esta sección está disponible solo para corralones.</Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head><title>Titulares</title></Head>
      {empresa ? (
        <GruposClienteContent empresa={empresa} />
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
