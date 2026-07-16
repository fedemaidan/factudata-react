import React from 'react';
import {
  Box,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatValue } from 'src/tools/reportEngine';

const CARD_COLORS = {
  presupuestado: '#16a5d8',
  ejecutado: '#18b978',
  saldo: '#fb8c00',
  presupuestos: '#7c4dff',
};

function formatDate(value) {
  if (!value) return '-';
  const date = value?.toDate
    ? value.toDate()
    : value?.seconds
      ? new Date(value.seconds * 1000)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-AR');
}

function statusColor(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('complet') || normalized.includes('final')) return 'success';
  if (normalized.includes('ejec') || normalized.includes('activo')) return 'success';
  if (normalized.includes('pend')) return 'warning';
  return 'default';
}

function MetricCard({ label, value, color, helper }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        minHeight: 112,
        borderRadius: 1,
        borderLeft: `4px solid ${color}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} sx={{ color, mt: 0.75 }}>
        {value}
      </Typography>
      {helper && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
          {helper}
        </Typography>
      )}
    </Paper>
  );
}

const SupplierBudgetsBlock = ({ data, displayCurrency, onDrillDown }) => {
  if (!data) return null;

  const currency = data.displayCurrency || displayCurrency;
  const rows = data.rows || [];
  const totals = data.totals || {};
  const resumenObras = data.resumenObras || [];

  const handleRowClick = (row) => {
    if (onDrillDown && row._movimientos?.length > 0) {
      onDrillDown(row._movimientos, `${row.proveedor} · ${row.presupuesto}`);
    }
  };

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Total presupuestado"
            value={formatValue(totals.presupuestado || 0, 'currency', currency)}
            color={CARD_COLORS.presupuestado}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Total ejecutado"
            value={formatValue(totals.ejecutado || 0, 'currency', currency)}
            color={CARD_COLORS.ejecutado}
            helper={formatValue(totals.porcentaje || 0, 'percentage') + ' del total'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Saldo total"
            value={formatValue(totals.saldo || 0, 'currency', currency)}
            color={CARD_COLORS.saldo}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Presupuestos"
            value={formatValue(totals.presupuestos || 0, 'number')}
            color={CARD_COLORS.presupuestos}
            helper={`${resumenObras.length || 0} obras`}
          />
        </Grid>
      </Grid>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Obra</TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Presupuesto</TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Fecha creación</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Presupuestado</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Ejecutado</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Saldo</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>% Ejecutado</TableCell>
              <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow
                key={row.id || idx}
                hover
                onClick={() => handleRowClick(row)}
                sx={{ cursor: row._movimientos?.length > 0 ? 'pointer' : 'default' }}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{row.obra}</Typography>
                  {row.proveedor && (
                    <Typography variant="caption" color="text.secondary">{row.proveedor}</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{row.presupuesto}</Typography>
                  {row.codigo && (
                    <Typography variant="caption" color="text.secondary">{row.codigo}</Typography>
                  )}
                </TableCell>
                <TableCell>{formatDate(row.fecha_creacion)}</TableCell>
                <TableCell align="right">{formatValue(row.presupuestado, 'currency', currency)}</TableCell>
                <TableCell align="right">{formatValue(row.ejecutado, 'currency', currency)}</TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600} color={row.saldo < 0 ? 'error.main' : 'success.main'}>
                    {formatValue(row.saldo, 'currency', currency)}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 130 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(Math.max((row.porcentaje || 0) * 100, 0), 100)}
                      sx={{ width: 56, height: 5, borderRadius: 1 }}
                    />
                    <Typography variant="body2">{formatValue(row.porcentaje || 0, 'percentage')}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={row.estado || '-'} color={statusColor(row.estado)} variant="outlined" size="small" />
                </TableCell>
              </TableRow>
            ))}

            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    No hay presupuestos vinculados a proveedores para los filtros seleccionados.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {data.mostrarResumenObras !== false && resumenObras.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Resumen por obras
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Obra</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Presupuestos</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Presupuestado</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Ejecutado</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>Saldo</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>% Ejecutado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resumenObras.map((row) => (
                  <TableRow key={row.obra}>
                    <TableCell>{row.obra}</TableCell>
                    <TableCell align="right">{formatValue(row.presupuestos, 'number')}</TableCell>
                    <TableCell align="right">{formatValue(row.presupuestado, 'currency', currency)}</TableCell>
                    <TableCell align="right">{formatValue(row.ejecutado, 'currency', currency)}</TableCell>
                    <TableCell align="right">{formatValue(row.saldo, 'currency', currency)}</TableCell>
                    <TableCell align="right">{formatValue(row.porcentaje, 'percentage')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default SupplierBudgetsBlock;
