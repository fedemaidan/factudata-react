// Mis Reservas: vista consolidada del PARTICIPANTE (total + desglose por obra).
// Muestra las reservas donde el usuario participa — propias o compartidas —,
// incluyendo las que quedaron en negativo (con el monto a cubrir).
// Vista de paridad con "todas las cajas chicas" para la migración de caja chica trazable.
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Container, Typography, Stack, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Snackbar, Alert, Button, CircularProgress,
  Card, CardContent, ToggleButton, ToggleButtonGroup, Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HomeIcon from '@mui/icons-material/Home';
import LockIcon from '@mui/icons-material/Lock';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuthContext } from 'src/contexts/auth-context';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import reservaObraService from 'src/services/reservaObraService';

const formatCurrency = (amount, moneda = 'ARS') => {
  if (!amount) return moneda === 'USD' ? 'US$ 0' : '$ 0';
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
  });
};

const MisReservasPage = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  const { setBreadcrumbs } = useBreadcrumbs();

  const [reservas, setReservas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [selectedMoneda, setSelectedMoneda] = useState('ARS');

  const fetchMisReservas = useCallback(async () => {
    const empresaId = user?.empresa?.id || user?.empresaData?.id || user?.empresa_id;
    if (!empresaId) return;
    setIsLoading(true);
    try {
      const data = await reservaObraService.mias(empresaId);
      setReservas(data?.reservas || []);
    } catch (err) {
      console.error('Error cargando mis reservas:', err);
      setAlert({ open: true, message: 'Error al cargar tus reservas', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchMisReservas();
  }, [user, fetchMisReservas]);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: 'Mis reservas', icon: <LockIcon fontSize="small" /> },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  // Ordenadas por obra para leer el desglose "A en obra 1, B en obra 2".
  const reservasOrdenadas = useMemo(() => (
    [...reservas].sort((a, b) => (a.proyecto_nombre || '').localeCompare(b.proyecto_nombre || '')
      || (a.nombre || '').localeCompare(b.nombre || ''))
  ), [reservas]);

  const totales = useMemo(() => {
    const t = {
      ARS: { asignado: 0, gastado: 0, reservado: 0 },
      USD: { asignado: 0, gastado: 0, reservado: 0 },
    };
    reservas.forEach((r) => {
      ['ARS', 'USD'].forEach((mon) => {
        const s = r.saldos?.[mon] || {};
        t[mon].asignado += (s.asignado || 0) + (s.ajuste || 0);
        t[mon].gastado += s.gastado || 0;
        t[mon].reservado += s.reservado || 0;
      });
    });
    return t;
  }, [reservas]);

  const hayUsd = totales.USD.asignado !== 0 || totales.USD.gastado !== 0 || totales.USD.reservado !== 0;
  const t = totales[selectedMoneda];

  const handleCloseAlert = () => setAlert({ ...alert, open: false });

  return (
    <>
      <Head>
        <title>Mis Reservas</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Container maxWidth="lg">
          <Stack spacing={2.5}>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Typography variant="body2" color="text.secondary">
                La plata reservada para vos en cada obra. Los gastos que cargás por WhatsApp descuentan de acá.
              </Typography>
              <Box display="flex" gap={1} alignItems="center">
                {hayUsd && (
                  <ToggleButtonGroup
                    value={selectedMoneda}
                    exclusive
                    size="small"
                    onChange={(e, val) => val && setSelectedMoneda(val)}
                  >
                    <ToggleButton value="ARS">ARS</ToggleButton>
                    <ToggleButton value="USD">USD</ToggleButton>
                  </ToggleButtonGroup>
                )}
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchMisReservas}>
                  Refrescar
                </Button>
              </Box>
            </Box>

            {/* Total disponible en mis reservas */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Total disponible en mis reservas ({selectedMoneda})
                </Typography>
                <Typography variant="h4" color={t.reservado >= 0 ? 'text.primary' : 'error.main'}>
                  {formatCurrency(t.reservado, selectedMoneda)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Asignado {formatCurrency(t.asignado, selectedMoneda)} · Gastado {formatCurrency(t.gastado, selectedMoneda)}
                </Typography>
              </CardContent>
            </Card>

            {isLoading ? (
              <Box display="flex" justifyContent="center" py={5}>
                <CircularProgress />
              </Box>
            ) : reservasOrdenadas.length === 0 ? (
              <Paper sx={{ p: 5, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Todavía no participás en ninguna reserva
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cuando te asignen plata reservada en una obra, la vas a ver acá.
                </Typography>
              </Paper>
            ) : (
              <Paper>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Reserva</TableCell>
                      <TableCell>Obra</TableCell>
                      <TableCell align="right">Asignado</TableCell>
                      <TableCell align="right">Gastado</TableCell>
                      <TableCell align="right">Disponible</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reservasOrdenadas.map((r) => {
                      const s = r.saldos?.[selectedMoneda] || {};
                      const disponible = s.reservado || 0;
                      const esCompartida = (r.participantes || []).filter((p) => p.rol !== 'lector').length > 1;
                      return (
                        <TableRow key={r._id || r.id} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" fontWeight={600}>
                                {r.nombre || 'Reserva de Obra'}
                              </Typography>
                              {esCompartida && <Chip label="grupo" size="small" variant="outlined" />}
                            </Stack>
                          </TableCell>
                          <TableCell>{r.proyecto_nombre || '—'}</TableCell>
                          <TableCell align="right">{formatCurrency((s.asignado || 0) + (s.ajuste || 0), selectedMoneda)}</TableCell>
                          <TableCell align="right">{formatCurrency(s.gastado || 0, selectedMoneda)}</TableCell>
                          <TableCell align="right">
                            {disponible < 0 ? (
                              <Tooltip title={`En negativo: se gastó más de lo reservado. Falta cubrir ${formatCurrency(Math.abs(disponible), selectedMoneda)} (se cubre transfiriendo entre las cajas de proyecto).`}>
                                <Chip
                                  icon={<WarningAmberIcon />}
                                  label={formatCurrency(disponible, selectedMoneda)}
                                  size="small"
                                  color="error"
                                  sx={{ fontWeight: 700 }}
                                />
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" fontWeight={600}>
                                {formatCurrency(disponible, selectedMoneda)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() => router.push(`/reservaObra?id=${r._id || r.id}`)}
                            >
                              Ver detalle
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={2} sx={{ fontWeight: 700 }}>TOTAL</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(t.asignado, selectedMoneda)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(t.gastado, selectedMoneda)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: t.reservado < 0 ? 'error.main' : 'inherit' }}>
                        {formatCurrency(t.reservado, selectedMoneda)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Stack>
        </Container>

        <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
          <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
            {alert.message}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
};

MisReservasPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default MisReservasPage;
