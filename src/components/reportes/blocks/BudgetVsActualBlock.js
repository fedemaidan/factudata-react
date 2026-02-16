import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Box, LinearProgress, Chip,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatValue } from 'src/tools/reportEngine';

const COLUMN_LABELS = {
  presupuestado: 'Presupuestado',
  ejecutado: 'Ejecutado',
  disponible: 'Disponible',
  porcentaje: '% Ejecución',
  barra: 'Progreso',
};

const BudgetVsActualBlock = ({ data, displayCurrency }) => {
  if (!data) return null;

  const { columnas, rows, totals } = data;

  const renderCell = (row, col) => {
    switch (col) {
      case 'presupuestado':
      case 'ejecutado':
        return formatValue(row[col], 'currency', displayCurrency);
      case 'disponible':
        return (
          <Typography
            variant="body2"
            sx={{ color: row.disponible < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}
          >
            {formatValue(row.disponible, 'currency', displayCurrency)}
          </Typography>
        );
      case 'porcentaje':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2">
              {formatValue(row.porcentaje, 'percentage')}
            </Typography>
            {row.sobreejecucion && (
              <WarningAmberIcon fontSize="small" color="error" />
            )}
          </Box>
        );
      case 'barra':
        return (
          <Box sx={{ width: 120 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(row.porcentaje * 100, 100)}
              color={row.sobreejecucion ? 'error' : row.porcentaje > 0.8 ? 'warning' : 'primary'}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        );
      default:
        return row[col] ?? '-';
    }
  };

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>
              Categoría
            </TableCell>
            {columnas.map((col) => (
              <TableCell
                key={col}
                align="right"
                sx={{ fontWeight: 700, backgroundColor: 'grey.100', whiteSpace: 'nowrap' }}
              >
                {COLUMN_LABELS[col] || col}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow
              key={idx}
              hover
              sx={row.sobreejecucion ? { backgroundColor: 'error.lighter' } : {}}
            >
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {row.categoria}
                  </Typography>
                  {row.sobreejecucion && (
                    <Chip label="Sobreejecutado" size="small" color="error" variant="outlined" />
                  )}
                </Box>
              </TableCell>
              {columnas.map((col) => (
                <TableCell key={col} align="right">
                  {renderCell(row, col)}
                </TableCell>
              ))}
            </TableRow>
          ))}

          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columnas.length + 1} align="center">
                <Typography variant="body2" color="text.secondary" py={3}>
                  No hay datos de presupuesto para mostrar
                </Typography>
              </TableCell>
            </TableRow>
          )}

          {/* Fila totales */}
          {totals && (
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700, borderTop: 2, borderColor: 'divider' }}>
                {totals.categoria}
              </TableCell>
              {columnas.map((col) => (
                <TableCell
                  key={col}
                  align="right"
                  sx={{ fontWeight: 700, borderTop: 2, borderColor: 'divider' }}
                >
                  {col === 'barra' ? null : renderCell(totals, col)}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BudgetVsActualBlock;
