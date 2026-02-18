import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Box,
} from '@mui/material';
import { formatValue } from 'src/tools/reportEngine';

const SummaryTableBlock = ({ data, displayCurrency, onDrillDown }) => {
  if (!data) return null;

  const { headers, rows, totals } = data;

  const handleRowClick = (row) => {
    if (onDrillDown && row._movimientos?.length > 0) {
      onDrillDown(row._movimientos, row.grupo);
    }
  };

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {headers.map((h) => (
              <TableCell
                key={h.id}
                sx={{
                  fontWeight: 700,
                  backgroundColor: 'grey.100',
                  whiteSpace: 'nowrap',
                }}
                align={h.id === 'grupo' ? 'left' : 'right'}
              >
                {h.titulo}
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
              sx={{ cursor: row._movimientos?.length > 0 ? 'pointer' : 'default' }}
            >
              {headers.map((h) => (
                <TableCell
                  key={h.id}
                  align={h.id === 'grupo' ? 'left' : 'right'}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {h.id === 'grupo' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {row.grupo}
                      </Typography>
                      {row._count && (
                        <Typography variant="caption" color="text.secondary">
                          ({row._count})
                        </Typography>
                      )}
                    </Box>
                  ) : h.id === '_porcentaje' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                      <Typography variant="body2">
                        {formatValue(row._porcentaje, 'percentage')}
                      </Typography>
                      <Box
                        sx={{
                          width: 60,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: 'grey.200',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${Math.min((row._porcentaje || 0) * 100, 100)}%`,
                            height: '100%',
                            bgcolor: 'primary.main',
                            borderRadius: 3,
                          }}
                        />
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2">
                      {formatValue(
                        row[h.id],
                        h.formato || 'currency',
                        h.currency || displayCurrency,
                      )}
                    </Typography>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}

          {/* Fila totales */}
          {totals && (
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              {headers.map((h) => (
                <TableCell
                  key={h.id}
                  align={h.id === 'grupo' ? 'left' : 'right'}
                  sx={{ fontWeight: 700, borderTop: 2, borderColor: 'divider' }}
                >
                  {h.id === 'grupo' ? (
                    <Typography variant="body2" fontWeight={700}>
                      {totals.grupo}
                    </Typography>
                  ) : h.id === '_porcentaje' ? (
                    formatValue(totals._porcentaje, 'percentage')
                  ) : (
                    formatValue(totals[h.id], h.formato || 'currency', h.currency || displayCurrency)
                  )}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SummaryTableBlock;
