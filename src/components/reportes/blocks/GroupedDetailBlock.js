import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Chip, Stack, Card, CardContent, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TablePagination,
} from '@mui/material';
import { formatValue, getAmount, groupBy, applyBlockFilters } from 'src/tools/reportEngine';

const formatDate = (d) => {
  if (!d) return '-';
  const date = d?.toDate ? d.toDate() : d?.seconds ? new Date(d.seconds * 1000) : new Date(d);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

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

/**
 * Bloque grouped_detail:
 * Muestra chips/mini-cards con grupos (etapas, categorías, etc.)
 * y al seleccionar uno filtra la tabla de movimientos de abajo.
 */
const GroupedDetailBlock = ({ data, displayCurrency, displayCurrencies, onDrillDown }) => {
  const [selectedGroup, setSelectedGroup] = useState(null); // null = todos
  const [page, setPage] = useState(0);

  if (!data) return null;

  const { groups, columnas, pageSize, currencies, chipsStyle } = data;
  const rowsPerPage = pageSize || 25;
  const isMulti = currencies && currencies.length > 1;

  // Movimientos según grupo seleccionado
  const currentMovimientos = useMemo(() => {
    if (!selectedGroup) {
      // Todos los movimientos de todos los grupos
      return groups.flatMap((g) => g.movimientos);
    }
    const group = groups.find((g) => g.key === selectedGroup);
    return group ? group.movimientos : [];
  }, [selectedGroup, groups]);

  // Total del grupo/todos
  const currentTotal = useMemo(() => {
    return currentMovimientos.reduce((acc, m) => acc + getAmount(m, displayCurrency, 'total'), 0);
  }, [currentMovimientos, displayCurrency]);

  // Paginación
  const sortedMovs = useMemo(() => {
    return [...currentMovimientos].sort((a, b) => {
      const toDate = (m) => {
        const f = m.fecha_factura || m.fecha;
        if (!f) return 0;
        if (f?.toDate) return f.toDate().getTime();
        if (f?.seconds) return f.seconds * 1000;
        const d = new Date(f);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      return toDate(b) - toDate(a);
    });
  }, [currentMovimientos]);

  const visibleRows = useMemo(
    () => sortedMovs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sortedMovs, page, rowsPerPage],
  );

  // Reset page on group change
  const handleSelectGroup = (key) => {
    setSelectedGroup(key === selectedGroup ? null : key);
    setPage(0);
  };

  const renderCell = (row, col) => {
    // Multi-moneda dinámicas
    if (col.match(/^(monto_display|subtotal_display|ingreso_display|egreso_display)__/)) {
      const [base, currency] = col.split('__');
      if (base === 'ingreso_display') {
        return row.type === 'ingreso' ? formatValue(row[`monto_display__${currency}`] ?? getAmount(row, currency, 'total'), 'currency', currency) : '';
      }
      if (base === 'egreso_display') {
        return row.type === 'egreso' ? formatValue(row[`monto_display__${currency}`] ?? getAmount(row, currency, 'total'), 'currency', currency) : '';
      }
      return formatValue(row[col] ?? getAmount(row, currency, 'total'), 'currency', currency);
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
        return formatValue(getAmount(row, displayCurrency, 'total'), 'currency', displayCurrency);
      case 'subtotal_display':
        return formatValue(getAmount(row, displayCurrency, 'subtotal'), 'currency', displayCurrency);
      case 'ingreso_display':
        return row.type === 'ingreso' ? formatValue(getAmount(row, displayCurrency, 'total'), 'currency', displayCurrency) : '';
      case 'egreso_display':
        return row.type === 'egreso' ? formatValue(getAmount(row, displayCurrency, 'total'), 'currency', displayCurrency) : '';
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
            sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
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
      {/* Chips / Mini-cards de grupos */}
      {chipsStyle === 'metric' ? (
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {/* Chip "Todos" */}
          <Grid item>
            <Card
              variant="outlined"
              sx={{
                cursor: 'pointer',
                minWidth: 100,
                transition: 'all 0.2s',
                borderColor: !selectedGroup ? 'primary.main' : 'divider',
                borderWidth: !selectedGroup ? 2 : 1,
                bgcolor: !selectedGroup ? 'action.selected' : 'background.paper',
                boxShadow: !selectedGroup ? 4 : 0,
                transform: !selectedGroup ? 'translateY(-2px)' : 'none',
                '&:hover': { boxShadow: 3, borderColor: 'primary.light' },
              }}
              onClick={() => handleSelectGroup(null)}
            >
              <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Todos
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {groups.reduce((a, g) => a + g.count, 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatValue(groups.reduce((a, g) => a + g.total, 0), 'currency', displayCurrency)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          {groups.map((g) => (
            <Grid item key={g.key}>
              <Card
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  minWidth: 100,
                  transition: 'all 0.2s',
                  borderColor: selectedGroup === g.key ? 'primary.main' : 'divider',
                  borderWidth: selectedGroup === g.key ? 2 : 1,
                  bgcolor: selectedGroup === g.key ? 'action.selected' : 'background.paper',
                  boxShadow: selectedGroup === g.key ? 4 : 0,
                  transform: selectedGroup === g.key ? 'translateY(-2px)' : 'none',
                  '&:hover': { boxShadow: 3, borderColor: 'primary.light' },
                }}
                onClick={() => handleSelectGroup(g.key)}
              >
                <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap sx={{ textTransform: 'uppercase', letterSpacing: 0.5, maxWidth: 120 }}>
                    {g.label}
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    {g.count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatValue(g.total, 'currency', displayCurrency)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Chip
            label={`Todos (${groups.reduce((a, g) => a + g.count, 0)})`}
            onClick={() => handleSelectGroup(null)}
            color={!selectedGroup ? 'primary' : 'default'}
            variant={!selectedGroup ? 'filled' : 'outlined'}
          />
          {groups.map((g) => (
            <Chip
              key={g.key}
              label={`${g.label} (${g.count})`}
              onClick={() => handleSelectGroup(g.key)}
              color={selectedGroup === g.key ? 'primary' : 'default'}
              variant={selectedGroup === g.key ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>
      )}

      {/* Info del grupo seleccionado */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {selectedGroup || 'Todos'} · {currentMovimientos.length} movimientos
        </Typography>
        <Chip
          label={formatValue(currentTotal, 'currency', displayCurrency)}
          size="small"
          color={currentTotal >= 0 ? 'success' : 'error'}
          variant="outlined"
        />
      </Stack>

      {/* Tabla de movimientos */}
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {columnas.map((col) => (
                <TableCell
                  key={col}
                  sx={{ fontWeight: 700, backgroundColor: 'grey.100', whiteSpace: 'nowrap' }}
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
                    No hay movimientos para el grupo seleccionado
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {sortedMovs.length > rowsPerPage && (
        <TablePagination
          component="div"
          count={sortedMovs.length}
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

export default GroupedDetailBlock;
