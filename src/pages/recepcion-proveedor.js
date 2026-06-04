/**
 * Recepción de material no acordado de proveedor (vertical corralón).
 *
 * Lista los acopios y, para el elegido, abre el drawer que clasifica las líneas
 * del remito en matcheadas / no acordadas y permite aceptarlas o rechazarlas.
 * Ver docs/corralones/11-propuesta-funcionalidades.md §3.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Alert, Box, CircularProgress, Container, Paper, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { useSucursalContext } from 'src/contexts/sucursal-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import acopioService from 'src/services/acopioService';
import RecepcionNoAcordadoDrawer from 'src/components/acopio/RecepcionNoAcordadoDrawer';

function PageContent({ empresa }) {
  const empresaId = empresa.id || empresa._id;
  const empresaNombre = empresa.nombre || empresa.razon_social || '';
  const { sucursalId } = useSucursalContext();

  const [acopios, setAcopios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');
  const [acopioSel, setAcopioSel] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await acopioService.listarAcopios(empresaId);
      setAcopios(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al cargar acopios.');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return acopios.filter((a) => {
      const esProveedor = (a.contraparte_rol || 'proveedor') === 'proveedor';
      if (!esProveedor) return false;
      if (!q) return true;
      return [a.proveedor, a.descripcion, a.proyecto_nombre]
        .some((s) => String(s || '').toLowerCase().includes(q));
    });
  }, [acopios, filtro]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>Recepción de proveedor</Typography>
        <Typography variant="body2" color="text.secondary">
          Elegí un acopio para clasificar las líneas de un remito y resolver el material no acordado.
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <TextField
          size="small" fullWidth label="Buscar por proveedor, descripción u obra"
          value={filtro} onChange={(e) => setFiltro(e.target.value)}
        />
      </Paper>

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
        ) : filtrados.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No hay acopios de proveedor para mostrar.</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell>Proveedor</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Obra</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtrados.map((a) => (
                <TableRow
                  key={a.id || a._id}
                  hover
                  onClick={() => setAcopioSel(a)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{a.proveedor || '—'}</TableCell>
                  <TableCell>{a.descripcion || '—'}</TableCell>
                  <TableCell>{a.proyecto_nombre || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <RecepcionNoAcordadoDrawer
        open={Boolean(acopioSel)}
        empresaId={empresaId}
        empresaNombre={empresaNombre}
        acopioId={acopioSel?.id || acopioSel?._id || null}
        sucursalId={acopioSel?.sucursal_id || sucursalId || null}
        onClose={() => setAcopioSel(null)}
        onResolved={() => { setAcopioSel(null); cargar(); }}
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
      <Head><title>Recepción de proveedor | Sorby</title></Head>
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
