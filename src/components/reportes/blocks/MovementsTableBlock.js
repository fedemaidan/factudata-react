import React, { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, TablePagination, Chip, Box,
} from '@mui/material';
import { formatValue } from 'src/tools/reportEngine';

const COLUMN_LABELS = {
  fecha_factura: 'Fecha',
  tipo: 'Tipo',
  categoria: 'Categoría',
  proveedor_nombre: 'Proveedor',
  proyecto_nombre: 'Proyecto',
  monto_display: 'Monto',
  subtotal_display: 'Subtotal',
  ingreso_display: 'Ingreso',
  egreso_display: 'Egreso',
  moneda: 'Moneda',
  medioPago: 'Medio de pago',
  notas: 'Notas',
  etapa: 'Etapa',
  estado: 'Estado',
  usuario_nombre: 'Usuario',
};

/** Resuelve label de columna, incluyendo columnas multi-moneda dinámicas */
const getColumnLabel = (col) => {
  if (COLUMN_LABELS[col]) return COLUMN_LABELS[col];
  const match = col.match(/^(monto_display|subtotal_display|ingreso_display|egreso_display)__(.+)$/);
  if (match) {
    const baseMap = {
      monto_display: 'Monto',
      subtotal_display: 'Subtotal',
      ingreso_display: 'Ingreso',
      egreso_display: 'Egreso',
    };
    return `${baseMap[match[1]] || match[1]} (${match[2]})`;
  }
  return col;
};

const formatDate = (d) => {
  if (!d) return '-';
  const date = d?.toDate ? d.toDate() : d?.seconds ? new Date(d.seconds * 1000) : new Date(d);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const MovementsTableBlock = ({ data, displayCurrency }) => {
  const [page, setPage] = useState(0);

  if (!data) return null;

  const { columnas, rows, pageSize, totalRows } = data;
  const rowsPerPage = pageSize || 25;

  const visibleRows = useMemo(
    () => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [rows, page, rowsPerPage],
  );

  const renderCell = (row, col) => {
    // Columnas multi-moneda dinámicas (monto_display__ARS, ingreso_display__USD, etc.)
    if (col.match(/^(monto_display|subtotal_display|ingreso_display|egreso_display)__/)) {
      const [base, currency] = col.split('__');
      const val = row[col];
      if (val == null) return '';
      return formatValue(val, 'currency', currency);
    }

    switch (col) {
      case 'fecha_factura':
        return formatDate(row.fecha_factura || row.fecha);
      case 'tipo':
        return (
          <Chip
            label={row.type === 'egreso' ? 'Egreso' : 'Ingreso'}
            size="small"
            color={row.type === 'egreso' ? 'error' : 'success'}
            variant="outlined"
          />
        );
      case 'monto_display':
        return formatValue(row.monto_display, 'currency', displayCurrency);
      case 'subtotal_display':
        return formatValue(row.subtotal_display, 'currency', displayCurrency);
      case 'ingreso_display':
        return row.ingreso_display != null ? formatValue(row.ingreso_display, 'currency', displayCurrency) : '';
      case 'egreso_display':
        return row.egreso_display != null ? formatValue(row.egreso_display, 'currency', displayCurrency) : '';
      case 'moneda':
        return row.moneda || 'ARS';
      case 'proveedor_nombre':
        return row.nombre_proveedor || '-';
      case 'proyecto_nombre':
        return row.proyecto || '-';
      case 'medioPago':
        return row.medio_pago || '-';
      case 'notas':
        return (
          <Typography
            variant="body2"
            sx={{
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.observacion || '-'}
          </Typography>
        );
      default:
        return row[col] || '-';
    }
  };

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {columnas.map((col) => (
                <TableCell
                  key={col}
                  sx={{
                    fontWeight: 700,
                    backgroundColor: 'grey.100',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {COLUMN_LABELS[col] || getColumnLabel(col)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row, idx) => (
              <TableRow key={row.id || idx} hover>
                {columnas.map((col) => (
                  <TableCell key={col} sx={{ whiteSpace: 'nowrap' }}>
                    {renderCell(row, col)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {visibleRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnas.length} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    No hay movimientos para los filtros seleccionados
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {totalRows > rowsPerPage && (
        <TablePagination
          component="div"
          count={totalRows}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[rowsPerPage]}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      )}
    </Box>
  );
};

export default MovementsTableBlock;
