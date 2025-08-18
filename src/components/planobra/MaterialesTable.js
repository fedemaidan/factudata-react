import React from 'react';
import { Box, LinearProgress, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { numberFmt } from 'src/utils/planobra';

const MaterialesTable = ({ materiales, onEditRow }) => {
  return (
    <>
      <Typography variant="subtitle2" sx={{ mt: 2 }}>📦 Materiales</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Unidad</TableCell>
            <TableCell>Plan (cant × $)</TableCell>
            <TableCell>Usado (cant × $)</TableCell>
            <TableCell>% Avance</TableCell>
            <TableCell>SKU / Aliases</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(materiales || []).map((m, i) => {
            const plan$ = (Number(m.cantidad_plan||0) * Number(m.precio_unit_plan||0));
            const usadoCapped = Math.min(Number(m.cantidad_usada||0), Number(m.cantidad_plan||0));
            const usado$ = (usadoCapped * Number(m.precio_unit_plan||0));
            const pct = plan$ > 0 ? Math.round((usado$ / plan$) * 100) : 0;
            return (
              <TableRow key={i}>
                <TableCell>{m.nombre}</TableCell>
                <TableCell>{m.unidad}</TableCell>
                <TableCell>{`${m.cantidad_plan || 0} × ${m.precio_unit_plan || 0} = ${numberFmt(plan$)}`}</TableCell>
                <TableCell>
                  <Box display="flex" gap={1} alignItems="center">
                    <TextField size="small" type="number" value={m.cantidad_usada ?? 0}
                      onChange={(e) => onEditRow?.(i, { cantidad_usada: Number(e.target.value) })}
                      sx={{ width: 90 }} />
                    <Typography variant="body2">= {numberFmt(usado$)}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress variant="determinate" value={pct} sx={{ width: 100, height: 8, borderRadius: 5 }} />
                    <Typography variant="body2">{pct}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {m.sku || '-'} {m.aliases?.length ? `• ${m.aliases.join(', ')}` : ''}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
};

export default MaterialesTable;