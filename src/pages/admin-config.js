import { useEffect, useState } from 'react';
import Head from 'next/head';
import {
  Box, Container, Stack, Typography, Card, TextField, Button, Snackbar, Alert, InputAdornment,
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import adminSuscripcionService from 'src/services/adminSuscripcionService';

const AdminConfig = () => {
  const [pct, setPct] = useState('');
  const [saldadoHasta, setSaldadoHasta] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    adminSuscripcionService.getConfig()
      .then((c) => {
        setPct(c?.comision_mp_general != null ? String(Math.round(c.comision_mp_general * 10000) / 100) : '');
        setSaldadoHasta(c?.cobros_saldados_hasta || '');
      })
      .catch(() => setSnackbar({ open: true, message: 'Error al cargar la configuración', severity: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const guardar = async () => {
    try {
      setSaving(true);
      const payload = { cobros_saldados_hasta: saldadoHasta || null };
      if (pct !== '') payload.comision_mp_general = Number(pct) / 100;
      await adminSuscripcionService.setConfig(payload);
      setSnackbar({ open: true, message: 'Configuración guardada', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: e?.response?.data?.error || 'Error al guardar', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head><title>Configuración · Sorby Admin</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="sm">
          <Stack spacing={3}>
            <Typography variant="h4">Configuración</Typography>
            <Card variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <div>
                  <Typography variant="subtitle1">Comisión de Mercado Pago</Typography>
                  <Typography variant="body2" color="text.secondary">
                    % por defecto para los clientes que pagan por MP y no tienen una comisión propia.
                    El override individual se configura en la ficha de cada cliente.
                  </Typography>
                </div>
                <TextField
                  label="Comisión general (%)" type="number" size="small" sx={{ maxWidth: 220 }}
                  value={pct} disabled={loading}
                  onChange={(e) => setPct(e.target.value)}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                />
              </Stack>
            </Card>

            <Card variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <div>
                  <Typography variant="subtitle1">Backlog migrado — dar por pagado</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Marca como <strong>pagados</strong> todos los períodos hasta el mes elegido (inclusive),
                    <strong> sin generar ningún movimiento de caja</strong>. Aplica a todos los clientes por igual
                    y viene activado por default (2026-05) para saldar la deuda migrada. Cambialo si querés
                    correr el corte; si lo vaciás, vuelve al default.
                  </Typography>
                </div>
                <TextField
                  label="Pagado hasta (inclusive)" type="month" size="small" sx={{ maxWidth: 220 }}
                  InputLabelProps={{ shrink: true }}
                  value={saldadoHasta} disabled={loading}
                  onChange={(e) => setSaldadoHasta(e.target.value)}
                />
              </Stack>
            </Card>

            <Box>
              <Button variant="contained" onClick={guardar} disabled={saving || loading}>
                Guardar
              </Button>
            </Box>
          </Stack>
        </Container>
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

AdminConfig.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default AdminConfig;
