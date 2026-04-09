import React from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatValue } from 'src/tools/reportEngine';

const BalanceBetweenPartnersBlock = ({ data, displayCurrency, onDrillDown }) => {
  if (!data) return null;

  const {
    socios = [],
    saldoNetoTotal = 0,
    sociosCount = 0,
    aporteIdeal = 0,
    transfers = [],
    isBalanced = false,
    showSummaryCards = true,
    selectedPhonesCount = 0,
  } = data;

  const summaryCards = [
    {
      title: 'Saldo neto total',
      value: formatValue(saldoNetoTotal, 'currency', displayCurrency),
      color: '#0F3D8C',
      bg: 'rgba(15,61,140,0.10)',
    },
    {
      title: 'Cantidad de socios',
      value: formatValue(sociosCount, 'number'),
      color: '#1D5FD0',
      bg: 'rgba(29,95,208,0.10)',
    },
    {
      title: 'Saldo ideal por socio',
      value: formatValue(aporteIdeal, 'currency', displayCurrency),
      color: '#1E4FA8',
      bg: 'rgba(30,79,168,0.10)',
    },
    {
      title: 'Estado',
      value: isBalanced ? 'Balanceado' : 'Con diferencias',
      color: isBalanced ? '#1B7A33' : '#B3261E',
      bg: isBalanced ? 'rgba(27,122,51,0.12)' : 'rgba(179,38,30,0.10)',
    },
  ];

  const maxDiferencia = socios.reduce((acc, s) => {
    const abs = Math.abs(Number(s?.diferencia || 0));
    return abs > acc ? abs : acc;
  }, 0);

  return (
    <Stack spacing={2}>
      {showSummaryCards && (
        <Grid container spacing={1.5}>
          {summaryCards.map((card) => (
            <Grid item xs={12} md={3} key={card.title}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  borderColor: card.color,
                  background: `linear-gradient(180deg, ${card.bg} 0%, rgba(255,255,255,0.88) 100%)`,
                }}
              >
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.3 }}>
                    {card.title}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={800} color={card.color}>
                    {card.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {selectedPhonesCount > 0 && (
        <Alert severity="info" variant="outlined" sx={{ borderStyle: 'dashed' }}>
          Se aplico filtro de socios por telefono ({selectedPhonesCount} seleccionados).
        </Alert>
      )}

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          borderColor: 'rgba(30,64,175,0.18)',
          boxShadow: '0 6px 18px rgba(15,23,42,0.08)',
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, backgroundColor: '#EAF2FF', color: '#102A56' }}>Socio</TableCell>
              <TableCell sx={{ fontWeight: 800, backgroundColor: '#EAF2FF', color: '#102A56' }}>Telefono</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, backgroundColor: '#EAF2FF', color: '#102A56' }}>Saldo</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, backgroundColor: '#EAF2FF', color: '#102A56' }}>Saldo ideal</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, backgroundColor: '#EAF2FF', color: '#102A56' }}>Diferencia vs ideal</TableCell>
              <TableCell sx={{ fontWeight: 800, backgroundColor: '#EAF2FF', color: '#102A56' }}>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {socios.map((socio) => {
              const diff = Number(socio.diferencia || 0);
              const diffRatio = maxDiferencia > 0 ? Math.min((Math.abs(diff) / maxDiferencia) * 100, 100) : 0;
              const color =
                Math.abs(diff) <= 0.01
                  ? 'default'
                  : diff > 0
                    ? 'error'
                    : 'success';

              return (
                <TableRow
                  key={`${socio.telefono}_${socio.socio}`}
                  hover
                  onClick={() => {
                    if (onDrillDown && socio._movimientos?.length > 0) {
                      onDrillDown(socio._movimientos, `Movimientos de ${socio.socio}`);
                    }
                  }}
                  sx={{
                    cursor: socio._movimientos?.length > 0 ? 'pointer' : 'default',
                    backgroundColor: (theme) => (theme.palette.mode === 'light' ? '#FFFFFF' : 'transparent'),
                    '&:nth-of-type(even)': {
                      backgroundColor: 'rgba(15,23,42,0.03)',
                    },
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {socio.socio}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {socio.telefono}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700}>
                      {formatValue(socio.saldo, 'currency', displayCurrency)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{formatValue(socio.aporteIdeal, 'currency', displayCurrency)}</TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      color={Math.abs(diff) <= 0.01 ? 'text.primary' : diff > 0 ? 'error.dark' : 'success.dark'}
                    >
                      {formatValue(diff, 'currency', displayCurrency)}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={diffRatio}
                      color={Math.abs(diff) <= 0.01 ? 'primary' : diff > 0 ? 'error' : 'success'}
                      sx={{
                        mt: 0.4,
                        height: 5,
                        borderRadius: 999,
                        backgroundColor: 'rgba(148,163,184,0.2)',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={socio.estado} size="small" color={color} variant="outlined" />
                  </TableCell>
                </TableRow>
              );
            })}
            {socios.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" py={2}>
                    No hay movimientos para calcular el balance entre socios.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {isBalanced ? (
        <Alert severity="success">Balanceado: todos los socios aportaron lo mismo.</Alert>
      ) : (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: '1px solid rgba(211,47,47,0.22)',
            background: 'linear-gradient(180deg, rgba(255,235,238,0.8), rgba(255,255,255,0.9))',
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Resumen de deudas
          </Typography>
          <Stack spacing={0.75}>
            {transfers.map((t, idx) => (
              <Paper
                key={`${t.fromPhone}_${t.toPhone}_${idx}`}
                variant="outlined"
                sx={{ px: 1.25, py: 0.85, borderColor: 'rgba(211,47,47,0.22)', backgroundColor: 'rgba(255,255,255,0.92)' }}
              >
                <Typography variant="body2">
                  <Box component="span" sx={{ fontWeight: 700 }}>{t.fromName}</Box>
                  {' debe '}
                  <Box component="span" sx={{ fontWeight: 800, color: 'error.dark' }}>
                    {formatValue(t.amount, 'currency', displayCurrency)}
                  </Box>
                  {' a '}
                  <Box component="span" sx={{ fontWeight: 700 }}>{t.toName}</Box>
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
};

export default BalanceBetweenPartnersBlock;
