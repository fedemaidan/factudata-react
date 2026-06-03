/**
 * Devoluciones / reintegros de material (vertical corralón).
 *
 * Punto de entrada dedicado para registrar una devolución sin partir de una
 * venta puntual: se elige el cliente dentro del drawer. El mismo flujo también
 * se puede iniciar desde el detalle de una venta o de un cliente.
 * Ver docs/corralones/11-propuesta-funcionalidades.md §1.
 */
import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import {
  Alert, Box, Button, CircularProgress, Container, Paper, Stack, Typography,
} from '@mui/material';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { useSucursalContext } from 'src/contexts/sucursal-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import clienteService from 'src/services/clienteService';
import DevolucionDrawer from 'src/components/clientes/DevolucionDrawer';

function PageContent({ empresa }) {
  const empresaId = empresa.id || empresa._id;
  const { sucursalId } = useSucursalContext();

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const cs = await clienteService.getByEmpresa(empresaId).catch(() => []);
      setClientes(Array.isArray(cs) ? cs : []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al cargar clientes.');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack spacing={0.5}>
          <Typography variant="h5" fontWeight={600}>Devoluciones</Typography>
          <Typography variant="body2" color="text.secondary">
            Reintegro de material: repone stock y/o genera saldo a favor del cliente.
          </Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<AssignmentReturnIcon />}
          onClick={() => setDrawerOpen(true)}
        >
          Nueva devolución
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {loading ? (
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Tocá <b>Nueva devolución</b> para registrar un reintegro. También podés iniciarlo desde
            el detalle de una venta o de un cliente.
          </Typography>
        </Paper>
      )}

      <DevolucionDrawer
        open={drawerOpen}
        empresaId={empresaId}
        clientes={clientes}
        sucursalId={sucursalId || null}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => { setDrawerOpen(false); cargar(); }}
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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">Solo disponible para corralones.</Alert>
      </Container>
    );
  }

  return (
    <>
      <Head><title>Devoluciones | Sorby</title></Head>
      {empresa ? (
        <PageContent empresa={empresa} />
      ) : (
        <Container sx={{ py: 5, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Container>
      )}
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
