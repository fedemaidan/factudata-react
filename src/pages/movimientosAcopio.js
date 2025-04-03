import React, { useState, useEffect, useCallback, use } from 'react';
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
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogContent
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import AcopioService from 'src/services/acopioService';

const MovimientosAcopioPage = () => {
  const router = useRouter();
  const { acopioId } = router.query;
  const [movimientos, setMovimientos] = useState([]);
  const [materialesAgrupados, setMaterialesAgrupados] = useState({});
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [expanded, setExpanded] = useState(null); // Control de colapsar detalles de cada material
  const [tabActiva, setTabActiva] = useState("acopio");
  const [acopio, setAcopio] = useState(null);
  const [compras, setCompras] = useState([]);
  const [remitoMovimientos, setRemitoMovimientos] = useState({});
  const [loading, setLoading] = useState(false);
  const [remitoAEliminar, setRemitoAEliminar] = useState(null);
  const [dialogoEliminarAbierto, setDialogoEliminarAbierto] = useState(false);
  
  const fetchAcopio = useCallback(async () => {
    try {
      setLoading(true);
      const acopioData = await AcopioService.obtenerAcopio(acopioId);
      setAcopio(acopioData);
      const comprasData = await AcopioService.obtenerCompras(acopioId);
      setCompras(comprasData);
    } catch (error) {
      console.error("Error al obtener acopio o compras:", error);
      setAlert({ open: true, message: 'Error al obtener información del acopio', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [acopioId]);
  

  const handleChangeTab = async (event, newValue) => {
    setTabActiva(newValue);
    if (newValue === "remitos") fetchRemitos();
    else if (newValue === "materiales") fetchMovimientos();
    else if (newValue === "acopio") fetchAcopio();
  };
  
  const fetchActualTab = async () => {
    if (tabActiva === "remitos") fetchRemitos();
    else if (tabActiva === "materiales") fetchMovimientos();
    else if (tabActiva === "acopio") fetchAcopio();
  };
  
  useEffect(() => {
    if (acopioId) fetchAcopio();
  }, [fetchAcopio]);
  
  const formatCurrency = (amount) => {
    return amount
      ? amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })
      : "$ 0";
  };

  const [remitos, setRemitos] = useState([]);

const fetchRemitos = useCallback(async () => {
  try {
    if (!acopioId) return;
    setLoading(true);
    const remitos = await AcopioService.obtenerRemitos(acopioId);
    setRemitos(remitos);
  } catch (error) {
    console.error('Error al obtener remitos:', error);
    setAlert({ open: true, message: 'Error al obtener remitos', severity: 'error' });
  } finally {
    setLoading(false);
  }
}, [acopioId]);

const eliminarRemito = async () => {
  try {
    const exito = await AcopioService.eliminarRemito(acopioId, remitoAEliminar);
    if (exito) {
      setAlert({ open: true, message: 'Remito eliminado con éxito', severity: 'success' });
      await fetchRemitos();
    } else {
      setAlert({ open: true, message: 'No se pudo eliminar el remito', severity: 'error' });
    }
  } catch (error) {
    console.error('Error al eliminar remito:', error);
    setAlert({ open: true, message: 'Error al eliminar remito', severity: 'error' });
  } finally {
    setDialogoEliminarAbierto(false);
    setRemitoAEliminar(null);
  }
};


useEffect(() => {
  if (acopioId) fetchRemitos();
}, [fetchRemitos]);


  // Obtener los movimientos del acopio
  const fetchMovimientos = useCallback(async () => {
    try {
      if (!acopioId) return;
      setLoading(true)
      const { movimientos, error } = await AcopioService.obtenerMovimientos(acopioId);
      const comprasData = await AcopioService.obtenerCompras(acopioId);
      if (error)  { console.error('Error al obtener movimientos:', error); throw new Error('Error al obtener movimientos');  }
      const union_movimientos = [...movimientos, ...comprasData];
      setMovimientos(union_movimientos);


      // 🔥 Agrupar movimientos por material
      const agrupados = union_movimientos.reduce((acc, mov) => {
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

    } catch (error) {
      console.error('Error al obtener movimientos:', error);
      setAlert({ open: true, message: 'Error al obtener los movimientos', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [acopioId]);

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
        <Stack direction="row" justifyContent="right" mb={3}>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchActualTab}>
            Actualizar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push(`/gestionRemito?acopioId=${acopioId}`)}
          >
            Agregar Remito
          </Button>
        </Stack>
        <Tabs value={tabActiva} onChange={handleChangeTab}>
          <Tab label="Info Acopio" value="acopio" />
          <Tab label="Remitos" value="remitos" />
          <Tab label="Materiales" value="materiales" />
        </Tabs>
        {loading && (
          <Typography variant="body1" sx={{ mb: 2 }}>
            <CircularProgress size={20} />
            Cargando...
          </Typography>
        )}


        {/* Tabla de materiales agrupados */}
        {tabActiva === "materiales" && (
  <>
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
        </>)}
        {tabActiva === "remitos" && (
  <Box>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Fecha</TableCell>
          <TableCell>Estado</TableCell>
          <TableCell>Valor Operación</TableCell>
          <TableCell>Remito</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
      {remitos.length === 0 && (
      <Typography variant="body1">No hay remitos para mostrar</Typography>
    )}
      {remitos.map((remito) => (
  <React.Fragment key={remito.id}>
    <TableRow
      sx={{ cursor: 'pointer', backgroundColor: expanded === remito.id ? "#f5f5f5" : "inherit" }}
      onClick={async () => {
        if (expanded === remito.id) {
          setExpanded(null); // cerrar si ya está abierto
        } else {
          if (!remitoMovimientos[remito.id]) {
            const movimientos = await AcopioService.obtenerMovimientosDeRemito(acopioId, remito.id);
            setRemitoMovimientos((prev) => ({ ...prev, [remito.id]: movimientos }));
          }
          setExpanded(remito.id);
        }
      }}
    >
      <TableCell>{new Date(remito.fecha).toLocaleDateString()}</TableCell>
      <TableCell>{remito.estado}</TableCell>
      <TableCell>{formatCurrency(remito.valorOperacion || 0)}</TableCell>
      <TableCell>
        <Stack direction="column" spacing={1}>
          {remito.url_remito ? (
            <a
              href={remito.url_remito}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver remito
            </a>
          ) : (
            "-"
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={(e) => {
              e.stopPropagation(); // Para evitar expandir el detalle al hacer click
              router.push(`/gestionRemito?acopioId=${acopioId}&remitoId=${remito.id}`);
            }}
          >
            Editar
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              setRemitoAEliminar(remito.id);
              setDialogoEliminarAbierto(true);
            }}
          >
            Eliminar
          </Button>

        </Stack>
      </TableCell>

    </TableRow>

    <TableRow>
      <TableCell colSpan={5} sx={{ p: 0 }}>
        <Collapse in={expanded === remito.id} timeout="auto" unmountOnExit>
          <Box sx={{ m: 2 }}>
            <Typography variant="subtitle1">Movimientos del Remito</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Código</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Valor Unitario</TableCell>
                  <TableCell>Valor Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(remitoMovimientos[remito.id] || []).map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>{new Date(mov.fecha).toLocaleDateString()}</TableCell>
                    <TableCell>{mov.codigo}</TableCell>
                    <TableCell>{mov.descripcion}</TableCell>
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
  </Box>
)}
{tabActiva === "acopio" && (
  <Box mt={3}>
    {acopio && (
      <Box my={2}>
        <Typography><strong>Código:</strong> {acopio.codigo}</Typography>
        <Typography><strong>Proveedor:</strong> {acopio.proveedor}</Typography>
        <Typography><strong>Proyecto:</strong> {acopio.proyecto_nombre}</Typography>
        <Typography><strong>Valor Total Acopiado:</strong> {formatCurrency(acopio.valor_acopio)}</Typography>
        <Typography><strong>Valor Total Desacopiado:</strong> {formatCurrency(acopio.valor_desacopio)}</Typography>
        <Typography><strong>Disponible:</strong> {formatCurrency(acopio.valor_acopio - acopio.valor_desacopio)}</Typography>
      </Box>
    )}

    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Fecha</TableCell>
          <TableCell>Código</TableCell>
          <TableCell>Descripción</TableCell>
          <TableCell>Cantidad</TableCell>
          <TableCell>Valor Unitario</TableCell>
          <TableCell>Valor Total</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {compras.map((mov) => (
          <TableRow key={mov.id}>
            <TableCell>{new Date(mov.fecha).toLocaleDateString()}</TableCell>
            <TableCell>{mov.codigo}</TableCell>
            <TableCell>{mov.descripcion}</TableCell>
            <TableCell>{mov.cantidad}</TableCell>
            <TableCell>{formatCurrency(mov.valorUnitario)}</TableCell>
            <TableCell>{formatCurrency(mov.valorOperacion)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Box>
)}

{dialogoEliminarAbierto && (
  <Dialog open={dialogoEliminarAbierto} onClose={() => setDialogoEliminarAbierto(false)}>
    <DialogContent>
      <Typography variant="h6" gutterBottom>
        ¿Estás seguro de que querés eliminar este remito?
      </Typography>
      <Stack direction="row" spacing={2} mt={2}>
        <Button variant="outlined" onClick={() => setDialogoEliminarAbierto(false)}>Cancelar</Button>
        <Button variant="contained" color="error" onClick={eliminarRemito}>Eliminar</Button>
      </Stack>
    </DialogContent>
  </Dialog>
)}


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
