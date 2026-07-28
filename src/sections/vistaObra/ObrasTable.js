// Tabla de cartera: una fila por obra (el "pantallazo Roberto: presupuesto 100, cobró 50").
// Cada fila es clickeable → entra al detalle de esa obra.

import PropTypes from 'prop-types';
import {
  Card, Table, TableBody, TableCell, TableHead, TableRow, Typography, Stack, Box,
} from '@mui/material';

import { fmtUsd, fmtUsdM2, fmtPct } from './format';

function Pct({ value, danger }) {
  if (value == null) return null;
  return (
    <Typography component="span" variant="caption" color={danger ? 'error.main' : 'text.disabled'} sx={{ ml: 0.5 }}>
      {fmtPct(value)}
    </Typography>
  );
}

Pct.propTypes = { value: PropTypes.number, danger: PropTypes.bool };

export default function ObrasTable({ rows, onSelect }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.25 }}>
        <Typography variant="subtitle2">Obras</Typography>
        <Typography variant="caption" color="text.disabled">
          click en una fila para ver el detalle
        </Typography>
      </Stack>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell>Obra</TableCell>
              <TableCell align="right">Venta</TableCell>
              <TableCell align="right">Cobrado</TableCell>
              <TableCell align="right">Costo</TableCell>
              <TableCell align="right">Gastado</TableCell>
              <TableCell align="right">$/m²</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.proyectoId || 'sin_obra'}
                hover
                onClick={() => r.proyectoId && onSelect(r.proyectoId)}
                sx={{ cursor: r.proyectoId ? 'pointer' : 'default' }}
              >
                <TableCell sx={{ fontWeight: 500 }}>{r.nombre}</TableCell>
                <TableCell align="right">{fmtUsd(r.venta)}</TableCell>
                <TableCell align="right">
                  {fmtUsd(r.cobrado)}<Pct value={r.pctCobrado} />
                </TableCell>
                <TableCell align="right">{fmtUsd(r.costo)}</TableCell>
                <TableCell align="right">
                  {fmtUsd(r.gastado)}<Pct value={r.pctGastado} danger={r.pctGastado > 1} />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={r.gananciaM2 >= 0 ? 'success.main' : 'error.main'}>
                    {fmtUsdM2(r.gananciaM2)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No hay obras con datos todavía.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Card>
  );
}

ObrasTable.propTypes = {
  rows: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
};
