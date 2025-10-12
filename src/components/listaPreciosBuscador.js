import { useState } from 'react';
import { Box, Stack, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Typography, CircularProgress } from '@mui/material';
import AcopioService from 'src/services/acopioService';
import { formatCurrency } from 'src/utils/formatters';

export default function ListaPreciosBuscador({ acopioId }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState([]);

  const buscar = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const data = await AcopioService.buscarMaterialesListaPrecios(acopioId, q);
      setResultados(data || []);
    } catch (e) {
      console.error(e);
      setResultados([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField label="Buscar material (código o descripción)" value={q} onChange={(e)=>setQ(e.target.value)} fullWidth />
        <Button variant="contained" onClick={buscar} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Buscar'}
        </Button>
      </Stack>

      {resultados.length === 0 ? (
        <Typography variant="body2">Sin resultados.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Valor Unitario (si aplica)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {resultados.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.codigo || '—'}</TableCell>
                <TableCell>{r.descripcion}</TableCell>
                <TableCell>{r.valorUnitario != null ? formatCurrency(r.valorUnitario) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
