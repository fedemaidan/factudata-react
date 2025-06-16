import React, { useState, useMemo } from 'react';
import {
  Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TextField, Box, Typography, FormControl, InputLabel, Select, MenuItem, Chip
} from '@mui/material';
import { formatCurrency, formatTimestamp, toDateFromFirestore } from 'src/utils/formatters';

export const CuotasPendientesTable = ({ cuotas }) => {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos'); // 'todos', 'a_cobrar', 'a_pagar'

  const cuotasFiltradas = useMemo(() => {
    const fechaDesde = desde ? new Date(desde) : null;
    const fechaHasta = hasta ? new Date(hasta) : null;

    return [...cuotas]
      .filter(cuota => {
        const v = toDateFromFirestore(cuota.fecha_vencimiento);
        if (!v) return false;
        if (fechaDesde && v < fechaDesde) return false;
        if (fechaHasta && v > fechaHasta) return false;
        if (tipoFiltro !== 'todos' && cuota.tipo !== tipoFiltro) return false;
        return true;
      })
      .sort((a, b) => {
        const fechaA = toDateFromFirestore(a.fecha_vencimiento);
        const fechaB = toDateFromFirestore(b.fecha_vencimiento);
        return fechaA - fechaB;
      });
  }, [cuotas, desde, hasta, tipoFiltro]);

  return (
    <Paper sx={{ mt: 2, p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>Filtrar cuotas pendientes</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <TextField
          type="date"
          label="Desde"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="date"
          label="Hasta"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <FormControl>
          <InputLabel>Tipo</InputLabel>
          <Select
            value={tipoFiltro}
            label="Tipo"
            onChange={(e) => setTipoFiltro(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="a_cobrar">A cobrar</MenuItem>
            <MenuItem value="a_pagar">A pagar</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Cuenta</TableCell>
            <TableCell>Monto</TableCell>
            <TableCell>Vencimiento</TableCell>
            <TableCell>Tipo</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {cuotasFiltradas.map((cuota, idx) => (
            <TableRow key={idx}>
              <TableCell>{cuota.cuenta_nombre || '-'}</TableCell>
              <TableCell>{formatCurrency(cuota.monto_nominal)}</TableCell>
              <TableCell>{formatTimestamp(cuota.fecha_vencimiento)}</TableCell>
              <TableCell>
                <Chip
                  label={cuota.tipo === 'a_cobrar' ? 'A cobrar' : 'A pagar'}
                  color={cuota.tipo === 'a_cobrar' ? 'success' : 'error'}
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};
