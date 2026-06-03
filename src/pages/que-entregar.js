import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Alert, Box, Chip, Container, Divider, Paper, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Typography, CircularProgress,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import Inventory2Icon from '@mui/icons-material/Inventory2';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { useAuthContext } from 'src/contexts/auth-context';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import { useSucursalContext } from '../contexts/sucursal-context';
import compromisosService from '../services/compromisosService';

function fmtFechaSemana(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(`${iso}T12:00:00`);
    const fin = new Date(d);
    fin.setDate(fin.getDate() + 6);
    const f = (x) => x.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    return `Semana del ${f(d)} al ${f(fin)}`;
  } catch (_) {
    return iso;
  }
}

function QueEntregar() {
  const { user } = useAuthContext();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { sucursalId } = useSucursalContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ con_fecha: [], a_demanda: [] });

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: 'Qué entregar', icon: <EventAvailableIcon fontSize="small" /> },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const cargar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const empresa = await getEmpresaDetailsFromUser(user);
      if (!empresa?.id) throw new Error('No pude resolver la empresa.');
      const result = await compromisosService.porMaterial(empresa.id, {
        ...(sucursalId ? { sucursal_id: sucursalId } : {}),
      });
      setData({
        con_fecha: Array.isArray(result?.con_fecha) ? result.con_fecha : [],
        a_demanda: Array.isArray(result?.a_demanda) ? result.a_demanda : [],
      });
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al cargar compromisos.');
    } finally {
      setLoading(false);
    }
  }, [user, sucursalId]);

  useEffect(() => { cargar(); }, [cargar]);

  const sinDatos = useMemo(
    () => !loading && data.con_fecha.length === 0 && data.a_demanda.length === 0,
    [loading, data]
  );

  return (
    <>
      <Head><title>Qué entregar | Sorby</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          <Stack spacing={1} sx={{ mb: 3 }}>
            <Typography variant="h4">Qué entregar</Typography>
            <Typography variant="body2" color="text.secondary">
              Material comprometido agrupado por semana (pedidos contra entrega) y a demanda (acopios sin fecha).
            </Typography>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}

          {sinDatos && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No hay material comprometido para mostrar.</Typography>
            </Paper>
          )}

          {!loading && data.con_fecha.length > 0 && (
            <Stack spacing={3} sx={{ mb: 4 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <EventAvailableIcon color="primary" />
                <Typography variant="h6">Con fecha (pedidos contra entrega)</Typography>
              </Stack>
              {data.con_fecha.map((bloque) => (
                <Paper key={bloque.semana || 'sin-semana'} sx={{ p: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Chip size="small" color="primary" label={fmtFechaSemana(bloque.semana)} />
                  </Stack>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Material</TableCell>
                        <TableCell align="right">Cantidad comprometida</TableCell>
                        <TableCell align="right">Pedidos</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(bloque.materiales || []).map((m) => (
                        <TableRow key={`${bloque.semana}-${m.material_id || m.nombre}`}>
                          <TableCell>{m.nombre || 'sin nombre'}</TableCell>
                          <TableCell align="right">
                            {m.cantidad_comprometida}{m.unidad ? ` ${m.unidad}` : ''}
                          </TableCell>
                          <TableCell align="right">{Array.isArray(m.solicitudes) ? m.solicitudes.length : (m.solicitudes ?? '—')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              ))}
            </Stack>
          )}

          {!loading && data.a_demanda.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Inventory2Icon color="action" />
                  <Typography variant="h6">A demanda (acopios sin fecha)</Typography>
                </Stack>
                <Paper sx={{ p: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Material</TableCell>
                        <TableCell align="right">Cantidad acopiada</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.a_demanda.map((m) => (
                        <TableRow key={m.material_id || m.nombre}>
                          <TableCell>{m.nombre || 'sin nombre'}</TableCell>
                          <TableCell align="right">
                            {m.cantidad_acopiada}{m.unidad ? ` ${m.unidad}` : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </Stack>
            </>
          )}
        </Container>
      </Box>
    </>
  );
}

QueEntregar.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default QueEntregar;
