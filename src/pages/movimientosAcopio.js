import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Snackbar,
  Alert,
  Collapse,
  Chip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import AcopioService from 'src/services/acopioService';

const MovimientosAcopioPage = () => {
  const router = useRouter();
  const { acopioId } = router.query;
  const [movimientos, setMovimientos] = useState([]);
  const [materialesAgrupados, setMaterialesAgrupados] = useState({});
  const [totalValor, setTotalValor] = useState(0);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [expanded, setExpanded] = useState(null); // Control de colapsar detalles de cada material

  const formatCurrency = (amount) => {
    return amount
      ? amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })
      : "$ 0";
  };

  // Obtener los movimientos del acopio
  const fetchMovimientos = useCallback(async () => {
    try {
      if (!acopioId) return;
      const { movimientos, error } = await AcopioService.obtenerMovimientos(acopioId);
      if (error) throw new Error('Error al obtener movimientos');

      setMovimientos(movimientos);

      // 🔥 Agrupar movimientos por material
      const agrupados = movimientos.reduce((acc, mov) => {
        if (!acc[mov.codigo]) {
          acc[mov.codigo] = {
            codigo: mov.codigo,
            descripcion: mov.descripcion,
            cantidadAcopiada: 0,
            cantidadDesacopiada: 0,
            valorTotalAcopiado: 0,
            valorTotalDesacopiado: 0,
            detalles: []
          };
        }

        // Sumar cantidad y valor dependiendo del tipo de movimiento
        if (mov.tipo === "acopio") {
          acc[mov.codigo].cantidadAcopiada += mov.cantidad;
          acc[mov.codigo].valorTotalAcopiado += mov.valorOperacion || 0;
        } else if (mov.tipo === "desacopio") {
          acc[mov.codigo].cantidadDesacopiada += mov.cantidad;
          acc[mov.codigo].valorTotalDesacopiado += mov.valorOperacion || 0;
        }

        // Guardar los detalles del movimiento
        acc[mov.codigo].detalles.push(mov);
        return acc;
      }, {});

      setMaterialesAgrupados(agrupados);

      // 🔥 Calcular el total sumando los valores de cada operación
      const total = movimientos.reduce(
        (sum, mov) => sum + (mov.tipo === "acopio" ? mov.valorOperacion || 0 : -(mov.valorOperacion || 0)),
        0
      );

      setTotalValor(total);
    } catch (error) {
      console.error('Error al obtener movimientos:', error);
      setAlert({ open: true, message: 'Error al obtener los movimientos', severity: 'error' });
    }
  }, [acopioId]);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">Movimientos del Acopio</Typography>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchMovimientos}>
            Actualizar
          </Button>
        </Stack>

        {/* Tabla de materiales agrupados */}
        <Table>
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
            {Object.values(materialesAgrupados).map((material) => (
              <React.Fragment key={material.codigo}>
                <TableRow
                  onClick={() => setExpanded(expanded === material.codigo ? null : material.codigo)}
                  sx={{ cursor: 'pointer', backgroundColor: expanded === material.codigo ? "#f5f5f5" : "inherit" }}
                >
                  <TableCell>{material.codigo}</TableCell>
                  <TableCell>{material.descripcion}</TableCell>
                  <TableCell>{material.cantidadAcopiada}</TableCell>
                  <TableCell>{material.cantidadDesacopiada}</TableCell>
                  <TableCell>{formatCurrency(material.valorTotalAcopiado)}</TableCell>
                  <TableCell>{formatCurrency(material.valorTotalDesacopiado)}</TableCell>
                </TableRow>

                {/* Detalle de movimientos al hacer click en un material */}
                <TableRow>
                  <TableCell colSpan={6} sx={{ p: 0 }}>
                    <Collapse in={expanded === material.codigo} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 2 }}>
                        <Typography variant="subtitle1">Detalles de {material.descripcion}</Typography>
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
                            {material.detalles.map((mov) => (
                              <TableRow key={mov.id}>
                                <TableCell>{new Date(mov.fecha).toLocaleDateString()}</TableCell>
                                <TableCell>
                                <Chip
                                  label={mov.tipo === "acopio" ? "Acopio" : "Desacopio"}
                                  color={mov.tipo === "acopio" ? "success" : "error"}
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
              </React.Fragment>
            ))}
          </TableBody>
        </Table>

        {/* 🔥 Mostrar Total de Todos los Movimientos */}
        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Typography variant="h6">
            <strong>Total Acumulado:</strong> {formatCurrency(totalValor)}
          </Typography>
        </Box>

        <Snackbar open={alert.open} autoHideDuration={6000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
            {alert.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

MovimientosAcopioPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default MovimientosAcopioPage;
