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
  DialogContent,
  Paper,
  Grid,
  LinearProgress
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useRouter } from 'next/router';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import AcopioService from 'src/services/acopioService';
import RemitosTable from 'src/components/remitosTable';
import MaterialesTable from 'src/components/materialesTable';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';


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
  const [remitosDuplicados, setRemitosDuplicados] = useState(new Set());

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
    setRemitosDuplicados(detectarDuplicados(remitos))
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

const porcentajeDisponible = (1 - (acopio?.valor_desacopio / acopio?.valor_acopio)) * 100;

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

  const detectarDuplicados = (remitos) => {
    console.log(remitos)
    const duplicadosPorNumero = {};
    const duplicadosPorValorYFecha = {};
  
    remitos.forEach((r) => {
      // clave por número de remito
      if (r.numero_remito) {
        const claveNumero = r.numero_remito.trim().toLowerCase();
        duplicadosPorNumero[claveNumero] = duplicadosPorNumero[claveNumero] || [];
        duplicadosPorNumero[claveNumero].push(r.id);
      }
  
      // clave por valor de operación + fecha
      const claveVF = `${r.valorOperacion}_${new Date(r.fecha).toISOString().split('T')[0]}`;
      duplicadosPorValorYFecha[claveVF] = duplicadosPorValorYFecha[claveVF] || [];
      duplicadosPorValorYFecha[claveVF].push(r.id);
    });
  
    const duplicadosSet = new Set();
  
    Object.values(duplicadosPorNumero).forEach((ids) => {
      if (ids.length > 1) ids.forEach((id) => duplicadosSet.add(id));
    });
    
    Object.values(duplicadosPorValorYFecha).forEach((ids) => {
      if (ids.length > 1) ids.forEach((id) => duplicadosSet.add(id));
    });
    console.log(duplicadosSet)
    return duplicadosSet;
  };
  
  
  
  return (
    <Box component="main">
      <Container maxWidth="xl">
      <Box sx={{ mt: 2 }}>
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push(`/acopios?empresaId=${acopio?.empresaId || ''}`)}
          >
            Volver a la lista de acopios
          </Button>
        </Box>

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
          <MaterialesTable
            materialesAgrupados={materialesAgrupados}
            expanded={expanded}
            setExpanded={setExpanded}
          />
        )}
        {tabActiva === "remitos" && (
          <Box>
          <RemitosTable
          remitos={remitos}
          remitoMovimientos={remitoMovimientos}
          expanded={expanded}
          setExpanded={setExpanded}
          router={router}
          acopioId={acopioId}
          remitosDuplicados={remitosDuplicados}
          setDialogoEliminarAbierto={setDialogoEliminarAbierto}
          setRemitoAEliminar={setRemitoAEliminar}
        />
        </Box>)}
{tabActiva === "acopio" && (
  <Box mt={3}>
    {acopio && (
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>Resumen del Acopio</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="subtitle2">Código</Typography>
          <Typography>{acopio.codigo}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="subtitle2">Proveedor</Typography>
          <Typography>{acopio.proveedor}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Typography variant="subtitle2">Proyecto</Typography>
          <Typography>{acopio.proyecto_nombre}</Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="subtitle2">Valor Total Acopiado</Typography>
          <Typography>{formatCurrency(acopio.valor_acopio)}</Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="subtitle2">Valor Total Desacopiado</Typography>
          <Typography>{formatCurrency(acopio.valor_desacopio)}</Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="subtitle2">Disponible {porcentajeDisponible.toFixed(2)}%</Typography>
          <LinearProgress variant="determinate" value={porcentajeDisponible} />
          <Typography sx={{ fontWeight: 'bold' }}>
            {formatCurrency(acopio.valor_acopio - acopio.valor_desacopio)}
          </Typography>
        </Grid>
      </Grid>
    </Paper>    
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
        <Box
  sx={{
    position: 'fixed',
    bottom: 16,
    right: 16,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  }}
>
  <Button
    variant="outlined"
    size="small"
    startIcon={<RefreshIcon />}
    onClick={fetchActualTab}
    sx={{ minWidth: 'auto', px: 2 }}
  >
    Actualizar
  </Button>
</Box>

      </Container>
    </Box>
  );
};

MovimientosAcopioPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default MovimientosAcopioPage;
