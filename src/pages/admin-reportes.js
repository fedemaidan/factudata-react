import { useEffect, useState } from 'react';
import Head from 'next/head';
import {
  Box,
  Container,
  Stack,
  Typography,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  Snackbar,
  Alert,
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import adminSuscripcionService from 'src/services/adminSuscripcionService';

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('es-AR'));

const Metric = ({ label, value, color }) => (
  <Card variant="outlined" sx={{ p: 2 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="h5" sx={{ color: color || 'text.primary' }}>{value}</Typography>
  </Card>
);

const AdminReportes = () => {
  const [clientes, setClientes] = useState(null);
  const [socios, setSocios] = useState(null);
  const [facturacion, setFacturacion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [c, s, f] = await Promise.all([
          adminSuscripcionService.reporteClientes(),
          adminSuscripcionService.reporteSocios(),
          adminSuscripcionService.reporteFacturacionMp(),
        ]);
        setClientes(c);
        setSocios(s);
        setFacturacion(f);
      } catch (e) {
        setSnackbar({ open: true, message: 'Error al cargar reportes', severity: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <Head><title>Reportes · Sorby Admin</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Reportes</Typography>

            {loading && <Skeleton variant="rounded" height={140} />}

            {/* Clientes activos / altas / bajas */}
            {clientes && (
              <Card variant="outlined">
                <CardHeader title="Clientes activos, altas y bajas" />
                <Divider />
                <CardContent>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6} sm={3}><Metric label="Total" value={fmt(clientes.kpis.total)} /></Grid>
                    <Grid item xs={6} sm={3}><Metric label="Activos" value={fmt(clientes.kpis.activos)} color="success.main" /></Grid>
                    <Grid item xs={6} sm={3}><Metric label="Bajas" value={fmt(clientes.kpis.bajas)} color="error.main" /></Grid>
                    <Grid item xs={6} sm={3}><Metric label="Ingreso mensual eq." value={`$${fmt(clientes.kpis.ingreso_mensual_equivalente)}`} /></Grid>
                  </Grid>

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Distribución por plan</Typography>
                  <Table size="small" sx={{ mb: 3 }}>
                    <TableHead><TableRow><TableCell>Plan</TableCell><TableCell align="right">Cantidad</TableCell><TableCell align="right">Ingreso mensual eq.</TableCell></TableRow></TableHead>
                    <TableBody>
                      {clientes.distribucion_por_tier.map((t) => (
                        <TableRow key={t.plan}>
                          <TableCell>{t.plan}</TableCell>
                          <TableCell align="right">{fmt(t.cantidad)}</TableCell>
                          <TableCell align="right">${fmt(t.ingreso_mensual_eq)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Altas y bajas por mes</Typography>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>Mes</TableCell><TableCell align="right">Altas</TableCell><TableCell align="right">Bajas</TableCell></TableRow></TableHead>
                    <TableBody>
                      {clientes.serie_altas_bajas.slice(-12).map((m) => (
                        <TableRow key={m.mes}>
                          <TableCell>{m.mes}</TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>{m.altas || '—'}</TableCell>
                          <TableCell align="right" sx={{ color: 'error.main' }}>{m.bajas || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Conciliación entre socios */}
            {socios && (
              <Card variant="outlined">
                <CardHeader
                  title="¿Quién pagó menos? — conciliación entre socios"
                  subheader={socios.diferencia?.mayor
                    ? `Diferencia de neto: $${fmt(socios.diferencia.delta)} — acumuló más ${socios.diferencia.mayor === 'facu' ? 'Facu' : 'Fede'}`
                    : null}
                />
                <Divider />
                <CardContent>
                  {socios.error ? (
                    <Alert severity="warning">{socios.error}</Alert>
                  ) : (
                    <Table size="small">
                      <TableHead><TableRow><TableCell>Caja</TableCell><TableCell align="right">Ingresos</TableCell><TableCell align="right">Egresos</TableCell><TableCell align="right">Neto</TableCell></TableRow></TableHead>
                      <TableBody>
                        {socios.cajas.map((c) => (
                          <TableRow key={c.caja}>
                            <TableCell>{c.nombre}</TableCell>
                            <TableCell align="right" sx={{ color: 'success.main' }}>${fmt(c.ingresos)}</TableCell>
                            <TableCell align="right" sx={{ color: 'error.main' }}>${fmt(c.egresos)}</TableCell>
                            <TableCell align="right">${fmt(c.neto)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Facturación vs MP */}
            {facturacion && (
              <Card variant="outlined">
                <CardHeader
                  title="Facturación vs Mercado Pago"
                  subheader="Por mes y socio. La atribución de MP por socio es aproximada (a refinar)."
                />
                <Divider />
                <CardContent>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Mes</TableCell>
                        <TableCell align="right">Fact. Facu</TableCell>
                        <TableCell align="right">Fact. Fede</TableCell>
                        <TableCell align="right">Fact. total</TableCell>
                        <TableCell align="right">MP total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {facturacion.map((m) => (
                        <TableRow key={m.mes}>
                          <TableCell>{m.mes}</TableCell>
                          <TableCell align="right">${fmt(m.facturado_facu)}</TableCell>
                          <TableCell align="right">${fmt(m.facturado_fede)}</TableCell>
                          <TableCell align="right">${fmt(m.facturado_total)}</TableCell>
                          <TableCell align="right">${fmt(m.mp_total)}</TableCell>
                        </TableRow>
                      ))}
                      {facturacion.length === 0 && (
                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                          <Typography color="text.secondary">Sin datos todavía.</Typography>
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Container>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

AdminReportes.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default AdminReportes;
