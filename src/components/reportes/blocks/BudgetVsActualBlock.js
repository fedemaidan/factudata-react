import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Box, Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { formatValue } from 'src/tools/reportEngine';

const COLUMN_LABELS = {
  presupuestado: 'Presupuestado',
  ejecutado: 'Ejecutado',
  disponible: 'Disponible',
  porcentaje: '% Ejecución',
  barra: 'Progreso',
};

const BudgetVsActualBlock = ({ data, displayCurrency, onDrillDown }) => {
  if (!data) return null;

  const { columnas, rows, totals, groupLabel = 'Categoría', showBudgetBreakdown } = data;
  const visibleColumns = (columnas || []).filter((col) => col !== 'barra');
  const breakdownColumns = visibleColumns;
  const breakdownGridTemplate = `minmax(220px, 1fr) repeat(${breakdownColumns.length}, minmax(130px, 0.42fr)) 32px`;
  const columnRatioTotal = 1 + visibleColumns.length * 0.42;
  const labelColumnWidth = `${100 / columnRatioTotal}%`;
  const valueColumnWidth = `${42 / columnRatioTotal}%`;

  const handleRowClick = (row) => {
    if (onDrillDown && row._movimientos?.length > 0) {
      onDrillDown(row._movimientos, row.categoria);
    }
  };

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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, width: '100%' }}>
            <Typography variant="body2">
              {formatValue(row.porcentaje, 'percentage')}
            </Typography>
          </Box>
        );
      default:
        return row[col] ?? '-';
    }
  };

  if (showBudgetBreakdown) {
    return (
      <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: breakdownGridTemplate,
              minWidth: 760,
              bgcolor: 'grey.100',
              borderBottom: 1,
              borderColor: 'divider',
              pl: 1.5,
              pr: 1.5,
              py: 1,
              alignItems: 'center',
            }}
          >
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {groupLabel}
            </Typography>
            {breakdownColumns.map((col) => (
              <Typography
                key={col}
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                align="right"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}
              >
                {COLUMN_LABELS[col] || col}
              </Typography>
            ))}
            <Box />
          </Box>

          {rows.map((row, idx) => (
            <Accordion
              key={`${row.categoria}-${idx}`}
              disableGutters
              square
              sx={{
                '&:before': { display: 'none' },
                boxShadow: 'none',
                borderBottom: 1,
                borderColor: 'divider',
                ...(row.sobreejecucion ? { bgcolor: 'error.lighter' } : {}),
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minHeight: 44,
                  px: 1.5,
                  '&:hover': { bgcolor: 'action.hover' },
                  '& .MuiAccordionSummary-expandIconWrapper': {
                    display: 'none',
                  },
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                    display: 'grid',
                    gridTemplateColumns: breakdownGridTemplate,
                    minWidth: 760,
                    gap: 0,
                    my: 0.75,
                  },
                }}
              >
                <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {row.categoria}
                  </Typography>
                  {row.sobreejecucion && (
                    <Chip label="Sobreejecutado" size="small" color="error" variant="outlined" />
                  )}
                </Box>
                {breakdownColumns.map((col) => (
                  <Box
                    key={col}
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      typography: 'body2',
                      lineHeight: 1.35,
                      '& .MuiTypography-root': { fontSize: '0.875rem' },
                    }}
                  >
                    {renderCell(row, col)}
                  </Box>
                ))}
                <ExpandMoreIcon sx={{ color: 'text.secondary', justifySelf: 'end' }} />
            </AccordionSummary>

            <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1 }}>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.50' }}>
                        Presupuesto
                      </TableCell>
                      {breakdownColumns.map((col) => (
                        <TableCell key={col} align="right" sx={{ fontWeight: 700, backgroundColor: 'grey.50' }}>
                          {COLUMN_LABELS[col] || col}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(row.details || []).map((detail, detailIdx) => (
                      <TableRow
                        key={detail.id || detailIdx}
                        hover
                        onClick={() => {
                          if (onDrillDown && detail._movimientos?.length > 0) {
                            onDrillDown(detail._movimientos, `${row.categoria} - ${detail.label}`);
                          }
                        }}
                        sx={{
                          cursor: detail._movimientos?.length > 0 ? 'pointer' : 'default',
                          ...(detail.sobreejecucion ? { backgroundColor: 'error.lighter' } : {}),
                          '&:hover': detail._movimientos?.length > 0 ? { backgroundColor: 'action.hover' } : undefined,
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={500}>
                              {detail.label}
                            </Typography>
                            {detail.sobreejecucion && (
                              <Chip label="Sobreejecutado" size="small" color="error" variant="outlined" />
                            )}
                          </Box>
                        </TableCell>
                        {breakdownColumns.map((col) => (
                          <TableCell key={col} align="right">
                            {renderCell(detail, col)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {(row.details || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={breakdownColumns.length + 1} align="center">
                          <Typography variant="body2" color="text.secondary" py={2}>
                            No hay presupuestos para desglosar
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
          ))}

          {totals && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: breakdownGridTemplate,
                minWidth: 760,
                pl: 1.5,
                pr: 1.5,
                py: 1.25,
                bgcolor: 'grey.50',
                borderTop: 2,
                borderColor: 'divider',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" fontWeight={700}>{totals.categoria}</Typography>
              {breakdownColumns.map((col) => (
                <Box
                  key={col}
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    typography: 'body2',
                    fontWeight: 700,
                    '& .MuiTypography-root': { fontSize: '0.875rem', fontWeight: 700 },
                  }}
                >
                  {renderCell(totals, col)}
                </Box>
              ))}
              <Box />
            </Box>
          )}
        </Box>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
      <Table
        size="small"
        stickyHeader
        sx={{
          tableLayout: 'fixed',
          '& .MuiTableRow-root': {
            height: 44,
          },
          '& .MuiTableCell-root': {
            py: 0.75,
            fontSize: '0.875rem',
            lineHeight: 1.35,
          },
          '& .MuiTableCell-head': {
            py: 0.85,
            fontSize: '0.75rem',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          },
          '& .MuiTableCell-body': {
            height: 44,
          },
        }}
      >
        <colgroup>
          <col style={{ width: labelColumnWidth }} />
          {visibleColumns.map((col) => (
            <col key={col} style={{ width: valueColumnWidth }} />
          ))}
        </colgroup>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, backgroundColor: 'grey.100' }}>
              {groupLabel}
            </TableCell>
            {visibleColumns.map((col) => (
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
              onClick={() => handleRowClick(row)}
              sx={{
                cursor: row._movimientos?.length > 0 ? 'pointer' : 'default',
                ...(row.sobreejecucion ? { backgroundColor: 'error.lighter' } : {}),
              }}
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
              {visibleColumns.map((col) => (
                <TableCell key={col} align="right">
                  {renderCell(row, col)}
                </TableCell>
              ))}
            </TableRow>
          ))}

          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={visibleColumns.length + 1} align="center">
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
              {visibleColumns.map((col) => (
                <TableCell
                  key={col}
                  align="right"
                  sx={{ fontWeight: 700, borderTop: 2, borderColor: 'divider' }}
                >
                  {renderCell(totals, col)}
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
