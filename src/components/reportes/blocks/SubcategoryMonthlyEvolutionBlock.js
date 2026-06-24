import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { formatValue } from 'src/tools/reportEngine';
import ChartBlock from './ChartBlock';

const MATRIX_CURRENCY_OPTIONS = { maximumFractionDigits: 0 };

const SubcategoryMonthlyEvolutionBlock = ({ data, displayCurrency, displayCurrencies, onDrillDown }) => {
  if (!data) return null;

  const matrix = data.matrix;
  const currency = data.displayCurrency || displayCurrency || 'ARS';
  const showMatrix = data.mostrarMatriz !== false && matrix?.headers?.length > 1;

  const getCellMovements = (row, header) => row._movimientosPorSerie?.[header.id] || [];

  const openCell = (row, header) => {
    if (!onDrillDown || header.id === 'grupo') return;
    const movements = getCellMovements(row, header);
    if (!movements.length) return;
    onDrillDown(movements, `${row.grupo} - ${header.titulo}`);
  };

  return (
    <Box>
      <ChartBlock
        data={data}
        displayCurrency={displayCurrency}
        displayCurrencies={displayCurrencies}
        onDrillDown={onDrillDown}
      />

      {showMatrix && (
        <Accordion
          disableGutters
          variant="outlined"
          sx={{ mt: 1.5, borderRadius: 1, '&:before': { display: 'none' }, overflow: 'hidden' }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ minHeight: 48, '&:hover': { bgcolor: 'action.hover' } }}
          >
            <Typography variant="body2" fontWeight={700}>
              Ver detalle de evolución mensual por subcategoría
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1.5, bgcolor: 'grey.50' }}>
            {matrix.headers.filter((header) => header.id !== 'grupo' && header.id !== '_total_mes').map((header) => (
              <Accordion
                key={header.id}
                disableGutters
                variant="outlined"
                sx={{ mb: 0.75, borderRadius: 1, '&:before': { display: 'none' }, overflow: 'hidden', bgcolor: 'background.paper' }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    minHeight: 46,
                    '&:hover': { bgcolor: 'action.hover' },
                    '& .MuiAccordionSummary-content': { justifyContent: 'space-between', alignItems: 'center', gap: 2 },
                  }}
                >
                  <Typography variant="body2" fontWeight={600} noWrap title={header.titulo}>
                    {header.titulo}
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                    {Number(matrix.totals?.[header.id] || 0) === 0
                      ? '-'
                      : formatValue(matrix.totals[header.id], 'currency', currency, MATRIX_CURRENCY_OPTIONS)}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>Mes</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, bgcolor: 'grey.50' }}>Monto</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {matrix.rows.map((row) => {
                          const movements = getCellMovements(row, header);
                          const clickable = movements.length > 0 && !!onDrillDown;
                          const value = Number(row[header.id] || 0);
                          return (
                            <TableRow
                              key={row._monthKey || row.grupo}
                              hover={clickable}
                              onClick={() => openCell(row, header)}
                              sx={{ cursor: clickable ? 'pointer' : 'default' }}
                            >
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.grupo}</TableCell>
                              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                {value === 0 ? '-' : formatValue(value, 'currency', currency, MATRIX_CURRENCY_OPTIONS)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default SubcategoryMonthlyEvolutionBlock;
