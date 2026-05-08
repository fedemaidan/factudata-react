import React from 'react';
import {
  Box,
  Chip,
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
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { formatValue } from 'src/tools/reportEngine';

const MonthlyBudgetControlBlock = ({ data, displayCurrency, onDrillDown }) => {
  if (!data) return null;

  const {
    obra_nombre: obraNombre,
    fecha_inicio: fechaInicio,
    presupuesto_label: presupuestoLabel,
    presupuesto_total: presupuestoTotal = 0,
    categories = [],
    rows = [],
    campo_monto: campoMonto = 'total',
    totals,
  } = data;
  const amountLabel = campoMonto === 'subtotal' ? 'Subtotal neto' : 'Total';

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-AR');
  };

  const handleMonthClick = (row) => {
    if (!onDrillDown || !row?._movimientos?.length) return;
    onDrillDown(row._movimientos, `Control presupuestario - ${row.mesLabel}`);
  };

  const handleCategoryClick = (row, category) => {
    const movs = row?._movimientos_by_category?.[category] || [];
    if (!onDrillDown || movs.length === 0) return;
    onDrillDown(movs, `${category} - ${row.mesLabel}`);
  };

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{
          mb: 2,
          p: { xs: 1.5, md: 2 },
          borderRadius: 1.5,
          bgcolor: 'background.paper',
          boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
        >
          <Stack spacing={0.75}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <TrendingDownIcon sx={{ color: 'error.main', fontSize: 24 }} />
              <Typography variant="h6" fontWeight={700}>
                Control presupuestario
              </Typography>
              <Chip label="Egresos" color="error" size="small" variant="outlined" />
              <Chip label={amountLabel} size="small" variant="outlined" />
            </Stack>
            {obraNombre && (
              <Typography variant="body2" color="text.secondary">
                Obra: {obraNombre}
              </Typography>
            )}
            {fechaInicio && (
              <Typography variant="body2" color="text.secondary">
                Inicio: {formatDate(fechaInicio)}
              </Typography>
            )}
          </Stack>

          <Box
            sx={{
              minWidth: { xs: 'auto', md: 260 },
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: 'grey.50',
              border: 1,
              borderColor: 'divider',
              textAlign: { xs: 'left', md: 'right' },
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {presupuestoLabel}
            </Typography>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.25 }}>
              {formatValue(presupuestoTotal, 'currency', displayCurrency)}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 620 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell
                rowSpan={2}
                sx={{ fontWeight: 700, backgroundColor: 'grey.100', whiteSpace: 'nowrap' }}
              >
                Mes
              </TableCell>
              <TableCell
                align="center"
                colSpan={categories.length}
                sx={{ fontWeight: 700, backgroundColor: 'grey.200' }}
              >
                Gastos asociados
              </TableCell>
              <TableCell
                rowSpan={2}
                align="right"
                sx={{ fontWeight: 700, backgroundColor: 'grey.100', whiteSpace: 'nowrap' }}
              >
                {amountLabel} mes
              </TableCell>
              <TableCell
                rowSpan={2}
                align="right"
                sx={{ fontWeight: 700, backgroundColor: 'grey.100', whiteSpace: 'nowrap' }}
              >
                Acumulado
              </TableCell>
              <TableCell
                rowSpan={2}
                align="right"
                sx={{ fontWeight: 700, backgroundColor: 'grey.100', whiteSpace: 'nowrap' }}
              >
                % avance
              </TableCell>
              <TableCell
                rowSpan={2}
                align="right"
                sx={{ fontWeight: 700, backgroundColor: 'grey.100', whiteSpace: 'nowrap' }}
              >
                Gasto CAC
              </TableCell>
            </TableRow>
            <TableRow>
              {categories.map((category) => (
                <TableCell
                  key={category}
                  align="right"
                  sx={{ fontWeight: 700, backgroundColor: 'grey.100', whiteSpace: 'nowrap' }}
                >
                  {category}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.mes} hover>
                <TableCell
                  onClick={() => handleMonthClick(row)}
                  sx={{
                    fontWeight: 500,
                    cursor: row._movimientos?.length ? 'pointer' : 'default',
                    textDecoration: row._movimientos?.length ? 'underline' : 'none',
                    textUnderlineOffset: '2px',
                  }}
                >
                  {row.mesLabel}
                </TableCell>
                {categories.map((category) => {
                  const value = Number(row.categorias?.[category] || 0);
                  const movs = row._movimientos_by_category?.[category] || [];
                  return (
                    <TableCell
                      key={`${row.mes}_${category}`}
                      align="right"
                      onClick={() => handleCategoryClick(row, category)}
                      sx={{
                        whiteSpace: 'nowrap',
                        cursor: movs.length ? 'pointer' : 'default',
                        textDecoration: movs.length ? 'underline' : 'none',
                        textUnderlineOffset: '2px',
                      }}
                    >
                      {formatValue(value, 'currency', displayCurrency)}
                    </TableCell>
                  );
                })}
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {formatValue(row.total, 'currency', displayCurrency)}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {formatValue(row.acumulado, 'currency', displayCurrency)}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {formatValue(row.porcentaje_avance, 'percentage')}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {formatValue(row.total_cac, 'currency', 'CAC')}
                </TableCell>
              </TableRow>
            ))}

            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={categories.length + 5} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    No hay datos para el control presupuestario
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {totals && (
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 700, borderTop: 2, borderColor: 'divider' }}>
                  {totals.label || 'Total'}
                </TableCell>
                {categories.map((category) => (
                  <TableCell
                    key={`total_${category}`}
                    align="right"
                    sx={{ fontWeight: 700, borderTop: 2, borderColor: 'divider', whiteSpace: 'nowrap' }}
                  >
                    {formatValue(totals.categorias?.[category] || 0, 'currency', displayCurrency)}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 700, borderTop: 2, borderColor: 'divider', whiteSpace: 'nowrap' }}>
                  {formatValue(totals.total, 'currency', displayCurrency)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, borderTop: 2, borderColor: 'divider', whiteSpace: 'nowrap' }}>
                  {formatValue(totals.acumulado, 'currency', displayCurrency)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, borderTop: 2, borderColor: 'divider', whiteSpace: 'nowrap' }}>
                  {formatValue(totals.porcentaje_avance, 'percentage')}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, borderTop: 2, borderColor: 'divider', whiteSpace: 'nowrap' }}>
                  {formatValue(totals.total_cac, 'currency', 'CAC')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MonthlyBudgetControlBlock;
