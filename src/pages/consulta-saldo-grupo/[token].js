import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
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
 * Página pública (sin auth) de saldo CONSOLIDADO de un titular (grupo).
 * Muestra el saldo total y el extracto de todos sus clientes/obras, con una
 * columna que indica de qué cliente es cada movimiento.
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
      .obtenerSaldoGrupo(token)
      .then(setData)
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 404) setError('El link no es válido o fue revocado.');
        else setError('No pudimos obtener la información. Probá de nuevo en un rato.');
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

  const titular = data?.titular || {};
  const saldo = data?.saldo_total ?? 0;
  const movimientos = data?.movimientos || [];
  const cobros = data?.cobros || [];

  const extracto = [
    ...movimientos.map((m, i) => ({
      key: `m-${i}`, tipo: 'deuda', fecha: m.fecha, cliente: m.cliente,
      titulo: m.descripcion || 'Deuda', monto: Number(m.total) || 0, pendiente: Number(m.pendiente) || 0,
    })),
    ...cobros.map((c, i) => ({
      key: `c-${i}`, tipo: 'cobro', fecha: c.fecha, cliente: c.cliente,
      titulo: `Pago${c.metodo ? ` — ${c.metodo}` : ''}`, monto: Number(c.monto) || 0,
    })),
  ].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

  return (
    <>
      <Head>
        <title>Cuenta corriente</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: { xs: 2, sm: 4 } }}>
        <Container maxWidth="sm">
          <Stack spacing={2}>
            <Box>
              <Typography variant="overline" color="text.secondary">Cuenta corriente consolidada</Typography>
              <Typography variant="h5" fontWeight={700}>{titular.nombre || 'Titular'}</Typography>
            </Box>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Saldo total</Typography>
              <Typography variant="h4" fontWeight={700}
                color={saldo > 0.005 ? 'warning.main' : saldo < -0.005 ? 'info.main' : 'success.main'}>
                {formatCurrencyWithCode(saldo)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {saldo > 0.005 ? 'Saldo pendiente de pago.' : saldo < -0.005 ? 'Saldo a favor.' : 'Al día.'}
              </Typography>
            </Paper>

            {extracto.length > 0 && (
              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Movimientos</Typography>
                <Paper variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'background.neutral' }}>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Cliente</TableCell>
                        <TableCell>Detalle</TableCell>
                        <TableCell align="right">Monto</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {extracto.slice(0, 50).map((r) => {
                        const esCobro = r.tipo === 'cobro';
                        return (
                          <TableRow key={r.key}>
                            <TableCell>{r.fecha ? formatTimestamp(r.fecha) : '—'}</TableCell>
                            <TableCell>{r.cliente || '—'}</TableCell>
                            <TableCell>
                              <Typography variant="body2" color={esCobro ? 'info.main' : 'text.primary'}>{r.titulo}</Typography>
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

export default Page;
