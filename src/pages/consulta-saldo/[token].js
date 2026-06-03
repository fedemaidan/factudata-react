import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
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
  Typography,
} from '@mui/material';
import consultaPublicaService from 'src/services/consultaPublicaService';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';

/**
 * Página pública (sin auth) para que un cliente consulte su saldo desde el
 * celular. Diseño mobile-first, sólo lectura.
 */

const Page = () => {
  const router = useRouter();
  const { token } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    consultaPublicaService
      .obtenerSaldo(token)
      .then((res) => setData(res))
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 404) setError('El link no es válido o fue revocado.');
        else setError('No pudimos obtener tu información. Probá de nuevo en un rato.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const cliente = data?.cliente || {};
  const cc = data?.cuenta_corriente || {};
  const movimientos = cc.movimientos || data?.movimientos || [];
  const acopios = data?.acopios || [];
  const cobros = data?.cobros_recientes || [];
  const saldo = cc.saldo_total ?? cc.saldo ?? data?.saldo ?? 0;

  // Extracto unificado (deudas + pagos por fecha), igual que la CC del cliente.
  const extracto = [
    ...movimientos.map((m, i) => ({
      key: `m-${m._id || i}`, tipo: 'deuda',
      fecha: m.fecha, titulo: m.descripcion || m.concepto || 'Deuda',
      monto: Number(m.total ?? m.monto) || 0, pendiente: Number(m.pendiente) || 0,
    })),
    ...cobros.map((c, i) => ({
      key: `c-${c._id || i}`, tipo: 'cobro',
      fecha: c.fecha || c.fecha_cobro, titulo: `Pago${c.metodo ? ` — ${c.metodo}` : ''}`,
      monto: Number(c.monto ?? c.monto_bruto) || 0,
    })),
  ].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

  return (
    <>
      <Head>
        <title>Mi cuenta</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: { xs: 2, sm: 4 } }}>
        <Container maxWidth="sm">
          <Stack spacing={2}>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Cuenta corriente
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {cliente.nombre || 'Cliente'}
              </Typography>
              {cliente.cuit && (
                <Typography variant="body2" color="text.secondary">
                  CUIT {cliente.cuit}
                </Typography>
              )}
            </Box>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Saldo actual
              </Typography>
              <Typography
                variant="h4"
                fontWeight={700}
                color={saldo > 0.005 ? 'warning.main' : saldo < -0.005 ? 'info.main' : 'success.main'}
              >
                {formatCurrencyWithCode(saldo)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {saldo > 0.005
                  ? 'Tenés saldo pendiente de pago.'
                  : saldo < -0.005
                  ? 'Tenés saldo a favor.'
                  : 'Estás al día.'}
              </Typography>
            </Paper>

            {acopios.length > 0 && (
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                  Tus acopios
                </Typography>
                <Paper variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'background.neutral' }}>
                        <TableCell>Material</TableCell>
                        <TableCell align="right">Saldo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {acopios.map((a) => (
                        <TableRow key={a._id || a.id}>
                          <TableCell>
                            {a.descripcion || a.material || `Acopio ${a.numero || ''}`}
                            {a.estado && (
                              <Chip
                                size="small"
                                label={a.estado}
                                sx={{ ml: 1, height: 18, fontSize: 11 }}
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrencyWithCode(a.saldo_disponible ?? a.saldo ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </Box>
            )}

            {extracto.length > 0 && (
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                  Cuenta corriente
                </Typography>
                <Paper variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'background.neutral' }}>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Detalle</TableCell>
                        <TableCell align="right">Monto</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {extracto.slice(0, 40).map((r) => {
                        const esCobro = r.tipo === 'cobro';
                        return (
                          <TableRow key={r.key}>
                            <TableCell>{r.fecha ? formatTimestamp(r.fecha) : '—'}</TableCell>
                            <TableCell>
                              <Typography variant="body2" color={esCobro ? 'info.main' : 'text.primary'}>
                                {r.titulo}
                              </Typography>
                              {!esCobro && r.pendiente > 0.005 && (
                                <Typography variant="caption" color="warning.main" display="block">
                                  Pendiente {formatCurrencyWithCode(r.pendiente)}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color={esCobro ? 'info.main' : 'text.primary'}>
                                {esCobro ? '− ' : ''}{formatCurrencyWithCode(r.monto)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Paper>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 2 }}>
              Información solo de lectura
            </Typography>
          </Stack>
        </Container>
      </Box>
    </>
  );
};

// IMPORTANTE: no usa DashboardLayout — es una página pública sin auth.
Page.getLayout = (page) => page;

export default Page;
