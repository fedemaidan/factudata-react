import { useState, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Collapse,
  Typography,
  Chip,
  TextField,
  Stack,
  Button,
  CircularProgress
} from '@mui/material';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const MaterialesTable = ({ materialesAgrupados, expanded, setExpanded, loading }) => {
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroDescripcion, setFiltroDescripcion] = useState('');

  const formatCurrency = (amount) => amount ? amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }) : "$ 0";

  const materialesFiltrados = useMemo(() => {
    return Object.values(materialesAgrupados)
      .filter((mat) =>
        mat.codigo.toLowerCase().includes(filtroCodigo.toLowerCase()) &&
        mat.descripcion.toLowerCase().includes(filtroDescripcion.toLowerCase())
      )
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [materialesAgrupados, filtroCodigo, filtroDescripcion]);

  const exportarExcel = () => {
    const data = materialesFiltrados.map((mat) => ({
      Codigo: mat.codigo,
      Descripcion: mat.descripcion,
      CantidadAcopiada: mat.cantidadAcopiada,
      CantidadDesacopiada: mat.cantidadDesacopiada,
      ValorTotalAcopiado: mat.valorTotalAcopiado,
      ValorTotalDesacopiado: mat.valorTotalDesacopiado
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Materiales');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'materiales.xlsx');
  };

  return (
    <Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Stack direction="row" spacing={2} sx={{ my: 2, flexWrap: 'wrap' }}>
            <TextField label="Buscar por código" value={filtroCodigo} onChange={(e) => setFiltroCodigo(e.target.value)} />
            <TextField label="Buscar por descripción" value={filtroDescripcion} onChange={(e) => setFiltroDescripcion(e.target.value)} />
            <Button variant="outlined" onClick={exportarExcel}>Exportar Excel</Button>
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Cant. Acopiada</TableCell>
                <TableCell>Cant. Desacopiada</TableCell>
                <TableCell>Valor Total Acopiado</TableCell>
                <TableCell>Valor Total Desacopiado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {materialesFiltrados.map((mat) => (
                <>
                  <TableRow
                    key={mat.codigo}
                    sx={{ cursor: 'pointer', backgroundColor: expanded === mat.codigo ? '#f5f5f5' : 'inherit' }}
                    onClick={() => setExpanded(expanded === mat.codigo ? null : mat.codigo)}
                  >
                    <TableCell>{mat.codigo}</TableCell>
                    <TableCell>{mat.descripcion}</TableCell>
                    <TableCell>{mat.cantidadAcopiada}</TableCell>
                    <TableCell>{mat.cantidadDesacopiada}</TableCell>
                    <TableCell>{formatCurrency(mat.valorTotalAcopiado)}</TableCell>
                    <TableCell>{formatCurrency(mat.valorTotalDesacopiado)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={6} sx={{ p: 0 }}>
                      <Collapse in={expanded === mat.codigo} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2 }}>
                          <Typography variant="subtitle1">Detalles de {mat.descripcion}</Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Fecha</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Cantidad</TableCell>
                                <TableCell>Valor Unitario</TableCell>
                                <TableCell>Valor Total</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {mat.detalles.map((mov) => (
                                <TableRow key={mov.id}>
                                  <TableCell>{new Date(mov.fecha).toLocaleDateString()}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={mov.tipo === 'acopio' ? 'Acopio' : 'Desacopio'}
                                      color={mov.tipo === 'acopio' ? 'success' : 'error'}
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell>{mov.cantidad}</TableCell>
                                  <TableCell>{formatCurrency(mov.valorUnitario)}</TableCell>
                                  <TableCell>{formatCurrency(mov.valorOperacion)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </Box>
  );
};

export default MaterialesTable;
