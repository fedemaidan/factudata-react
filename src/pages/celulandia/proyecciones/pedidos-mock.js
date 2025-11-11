import { useRouter } from "next/router";
import { useState, useMemo } from "react";
import {
  Container,
  Typography,
  Box,
  Stack,
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Card,
  CardContent,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Divider,
} from "@mui/material";
import {
  LocalShipping as LocalShippingIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Inventory as InventoryIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import Head from "next/head";
import dayjs from "dayjs";

// Datos mock expandidos para pedidos
const mockPedidosCompletos = [
  {
    _id: "PED001",
    numeroPedido: "PED-2025-001",
    fechaPedido: "2025-11-01",
    fechaEstimada: "2025-11-25",
    fechaReal: null,
    estado: "en_transito",
    proveedor: "TechSupply Corp",
    contenedor: "TCLU123456",
    comentarios: "Pedido especial Black Friday",
    productos: [
      { productoId: "1", codigo: "ACC001", descripcion: "Auriculares Gaming RGB Pro", cantidad: 100 },
      { productoId: "2", codigo: "CAB002", descripcion: "Cable USB-C a Lightning 2m", cantidad: 50 }
    ],
    historial: [
      { fecha: "2025-11-01", accion: "Pedido creado", usuario: "Juan Pérez" },
      { fecha: "2025-11-15", accion: "Confirmado por proveedor", usuario: "Sistema" },
      { fecha: "2025-11-18", accion: "En tránsito - Contenedor TCLU123456", usuario: "María López" }
    ]
  },
  {
    _id: "PED002", 
    numeroPedido: "PED-2025-002",
    fechaPedido: "2025-11-10",
    fechaEstimada: "2025-12-05",
    fechaReal: null,
    estado: "pedido",
    proveedor: "TechSupply Corp",
    contenedor: null,
    comentarios: "Restock navideño",
    productos: [
      { productoId: "1", codigo: "ACC001", descripcion: "Auriculares Gaming RGB Pro", cantidad: 50 },
      { productoId: "4", codigo: "CAR004", descripcion: "Cargador Rápido 65W USB-C", cantidad: 150 }
    ],
    historial: [
      { fecha: "2025-11-10", accion: "Pedido creado", usuario: "Ana García" },
      { fecha: "2025-11-12", accion: "Enviado a proveedor", usuario: "Sistema" }
    ]
  },
  {
    _id: "PED003",
    numeroPedido: "PED-2025-003", 
    fechaPedido: "2025-11-05",
    fechaEstimada: "2025-11-20",
    fechaReal: "2025-11-22",
    estado: "recibido",
    proveedor: "Cable Solutions",
    contenedor: "CSLU789012",
    comentarios: "URGENTE - Stock agotado",
    productos: [
      { productoId: "2", codigo: "CAB002", descripcion: "Cable USB-C a Lightning 2m", cantidad: 200 }
    ],
    historial: [
      { fecha: "2025-11-05", accion: "Pedido creado", usuario: "Carlos Ruiz" },
      { fecha: "2025-11-06", accion: "Confirmado por proveedor", usuario: "Sistema" },
      { fecha: "2025-11-15", accion: "En tránsito - Contenedor CSLU789012", usuario: "María López" },
      { fecha: "2025-11-22", accion: "Recibido en almacén", usuario: "Pedro Martín" }
    ]
  },
  {
    _id: "PED004",
    numeroPedido: "PED-2025-004",
    fechaPedido: "2025-10-28",
    fechaEstimada: "2025-11-18",
    fechaReal: null,
    estado: "atrasado",
    proveedor: "Mobile Accessories Ltd",
    contenedor: "MALU456789",
    comentarios: "Pedido con retraso por problemas logísticos",
    productos: [
      { productoId: "3", codigo: "FUN003", descripcion: "Funda Transparente iPhone 15", cantidad: 300 },
      { productoId: "1", codigo: "ACC001", descripcion: "Auriculares Gaming RGB Pro", cantidad: 75 }
    ],
    historial: [
      { fecha: "2025-10-28", accion: "Pedido creado", usuario: "Luis Fernández" },
      { fecha: "2025-10-30", accion: "Confirmado por proveedor", usuario: "Sistema" },
      { fecha: "2025-11-10", accion: "En tránsito - Contenedor MALU456789", usuario: "María López" },
      { fecha: "2025-11-19", accion: "Retraso notificado por proveedor", usuario: "Sistema" }
    ]
  }
];

function PedidosMockPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState(mockPedidosCompletos);
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroProveedor, setFiltroProveedor] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [tabValue, setTabValue] = useState(0);
  
  // Estados para modales
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  const [isContenedorOpen, setIsContenedorOpen] = useState(false);
  const [contenedorNuevo, setContenedorNuevo] = useState("");

  const getStatusColor = (estado) => {
    switch (estado) {
      case "recibido": return "success";
      case "en_transito": return "info";
      case "pedido": return "warning";
      case "atrasado": return "error";
      case "cancelado": return "error";
      default: return "default";
    }
  };

  const getStatusIcon = (estado) => {
    switch (estado) {
      case "recibido": return <CheckCircleIcon fontSize="small" />;
      case "en_transito": return <LocalShippingIcon fontSize="small" />;
      case "pedido": return <ScheduleIcon fontSize="small" />;
      case "atrasado": return <ErrorIcon fontSize="small" />;
      case "cancelado": return <ErrorIcon fontSize="small" />;
      default: return <InventoryIcon fontSize="small" />;
    }
  };

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(pedido => {
      const matchEstado = filtroEstado === "Todos" || pedido.estado === filtroEstado;
      const matchProveedor = filtroProveedor === "Todos" || pedido.proveedor === filtroProveedor;
      const matchBusqueda = busqueda === "" || 
        pedido.numeroPedido.toLowerCase().includes(busqueda.toLowerCase()) ||
        pedido.proveedor.toLowerCase().includes(busqueda.toLowerCase()) ||
        pedido.contenedor?.toLowerCase().includes(busqueda.toLowerCase());
      
      return matchEstado && matchProveedor && matchBusqueda;
    });
  }, [pedidos, filtroEstado, filtroProveedor, busqueda]);

  const estadisticas = useMemo(() => {
    return {
      total: pedidos.length,
      pedidos: pedidos.filter(p => p.estado === 'pedido').length,
      enTransito: pedidos.filter(p => p.estado === 'en_transito').length,
      recibidos: pedidos.filter(p => p.estado === 'recibido').length,
      atrasados: pedidos.filter(p => p.estado === 'atrasado').length,
      totalProductos: pedidos.reduce((sum, p) => sum + p.productos.reduce((pSum, prod) => pSum + prod.cantidad, 0), 0)
    };
  }, [pedidos]);

  const proveedores = [...new Set(pedidos.map(p => p.proveedor))];

  const marcarPedidoEnTransito = (pedidoId, contenedor) => {
    setPedidos(prev => prev.map(p => 
      p._id === pedidoId 
        ? { 
            ...p, 
            estado: "en_transito", 
            contenedor,
            historial: [...p.historial, {
              fecha: new Date().toISOString().split('T')[0],
              accion: `En tránsito - Contenedor ${contenedor}`,
              usuario: "Usuario Demo"
            }]
          }
        : p
    ));
  };

  const marcarPedidoRecibido = (pedidoId) => {
    setPedidos(prev => prev.map(p => 
      p._id === pedidoId 
        ? { 
            ...p, 
            estado: "recibido",
            fechaReal: new Date().toISOString().split('T')[0],
            historial: [...p.historial, {
              fecha: new Date().toISOString().split('T')[0],
              accion: "Recibido en almacén",
              usuario: "Usuario Demo"
            }]
          }
        : p
    ));
  };

  return (
    <>
      <Head>
        <title>Gestión de Pedidos - Demo</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, pb: 2, minHeight: '100vh', bgcolor: 'grey.50' }}>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {/* Botón de volver */}
          <Button 
            onClick={() => router.back()} 
            sx={{ mb: 2 }}
            variant="outlined"
          >
            ← Volver a Proyecciones
          </Button>
          
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom>
              📦 Gestión de Pedidos
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Administra todos los pedidos de material, seguimiento de contenedores y estados de entrega
            </Typography>
          </Box>

          {/* Estadísticas */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">{estadisticas.total}</Typography>
                  <Typography variant="caption">Total Pedidos</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">{estadisticas.pedidos}</Typography>
                  <Typography variant="caption">Pendientes</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">{estadisticas.enTransito}</Typography>
                  <Typography variant="caption">En Tránsito</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">{estadisticas.recibidos}</Typography>
                  <Typography variant="caption">Recibidos</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main">{estadisticas.atrasados}</Typography>
                  <Typography variant="caption">Atrasados</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {estadisticas.totalProductos.toLocaleString()}
                  </Typography>
                  <Typography variant="caption">Total Productos</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filtros y búsqueda */}
          <Card sx={{ mb: 3, p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por número, proveedor o contenedor..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={filtroEstado}
                    label="Estado"
                    onChange={(e) => setFiltroEstado(e.target.value)}
                  >
                    <MenuItem value="Todos">Todos</MenuItem>
                    <MenuItem value="pedido">Pedido</MenuItem>
                    <MenuItem value="en_transito">En Tránsito</MenuItem>
                    <MenuItem value="recibido">Recibido</MenuItem>
                    <MenuItem value="atrasado">Atrasado</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Proveedor</InputLabel>
                  <Select
                    value={filtroProveedor}
                    label="Proveedor"
                    onChange={(e) => setFiltroProveedor(e.target.value)}
                  >
                    <MenuItem value="Todos">Todos</MenuItem>
                    {proveedores.map(proveedor => (
                      <MenuItem key={proveedor} value={proveedor}>{proveedor}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Mostrando {pedidosFiltrados.length} de {pedidos.length} pedidos
                </Typography>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setFiltroEstado("Todos");
                    setFiltroProveedor("Todos");
                    setBusqueda("");
                  }}
                >
                  Limpiar Filtros
                </Button>
              </Grid>
            </Grid>
          </Card>

          {/* Lista de pedidos */}
          <Grid container spacing={2}>
            {pedidosFiltrados.map((pedido) => (
              <Grid item xs={12} key={pedido._id}>
                <Card>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={2}>
                        <Typography variant="h6">{pedido.numeroPedido}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(pedido.fechaPedido).format("DD/MM/YYYY")}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Typography variant="body2">{pedido.proveedor}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Proveedor
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Chip
                          size="small"
                          icon={getStatusIcon(pedido.estado)}
                          label={pedido.estado.replace('_', ' ')}
                          color={getStatusColor(pedido.estado)}
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                          Llega: {dayjs(pedido.fechaEstimada).format("DD/MM")}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Typography variant="body2">
                          {pedido.contenedor || "Sin contenedor"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Contenedor
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Typography variant="body2" fontWeight="bold">
                          {pedido.productos.length} productos
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Cantidad de items
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setPedidoSeleccionado(pedido);
                              setIsDetalleOpen(true);
                            }}
                            startIcon={<VisibilityIcon />}
                          >
                            Ver
                          </Button>
                          {pedido.estado === 'pedido' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="info"
                              onClick={() => {
                                setPedidoSeleccionado(pedido);
                                setIsContenedorOpen(true);
                              }}
                            >
                              Envío
                            </Button>
                          )}
                          {pedido.estado === 'en_transito' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => marcarPedidoRecibido(pedido._id)}
                            >
                              Recibir
                            </Button>
                          )}
                        </Stack>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {pedidosFiltrados.length === 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  No se encontraron pedidos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Intenta ajustar los filtros de búsqueda
                </Typography>
              </CardContent>
            </Card>
          )}
        </Container>
      </Box>

      {/* Modal de Detalle del Pedido */}
      <Dialog open={isDetalleOpen} onClose={() => setIsDetalleOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Detalle del Pedido</Typography>
            <IconButton onClick={() => setIsDetalleOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {pedidoSeleccionado && (
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
              <Tab label="Información General" />
              <Tab label="Productos" />
              <Tab label="Historial" />
            </Tabs>
          )}

          {pedidoSeleccionado && tabValue === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Número de Pedido</Typography>
                <Typography variant="body1" gutterBottom>{pedidoSeleccionado.numeroPedido}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Estado</Typography>
                <Chip
                  size="small"
                  icon={getStatusIcon(pedidoSeleccionado.estado)}
                  label={pedidoSeleccionado.estado.replace('_', ' ')}
                  color={getStatusColor(pedidoSeleccionado.estado)}
                  sx={{ mt: 0.5 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Proveedor</Typography>
                <Typography variant="body1" gutterBottom>{pedidoSeleccionado.proveedor}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Contenedor</Typography>
                <Typography variant="body1" gutterBottom>{pedidoSeleccionado.contenedor || "No asignado"}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2">Fecha Pedido</Typography>
                <Typography variant="body1" gutterBottom>{dayjs(pedidoSeleccionado.fechaPedido).format("DD/MM/YYYY")}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2">Fecha Estimada</Typography>
                <Typography variant="body1" gutterBottom>{dayjs(pedidoSeleccionado.fechaEstimada).format("DD/MM/YYYY")}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2">Fecha Real</Typography>
                <Typography variant="body1" gutterBottom>
                  {pedidoSeleccionado.fechaReal ? dayjs(pedidoSeleccionado.fechaReal).format("DD/MM/YYYY") : "Pendiente"}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Total de Items</Typography>
                <Typography variant="h5" color="primary.main" gutterBottom>
                  {pedidoSeleccionado.productos.reduce((sum, p) => sum + p.cantidad, 0)} productos
                </Typography>
              </Grid>
              {pedidoSeleccionado.comentarios && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Comentarios</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {pedidoSeleccionado.comentarios}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}

          {pedidoSeleccionado && tabValue === 1 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pedidoSeleccionado.productos.map((producto, idx) => (
                    <TableRow key={idx}>
                      <TableCell fontWeight="bold">{producto.codigo}</TableCell>
                      <TableCell>{producto.descripcion}</TableCell>
                      <TableCell align="right">{producto.cantidad.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}

                </TableBody>
              </Table>
            </TableContainer>
          )}

          {pedidoSeleccionado && tabValue === 2 && (
            <Box>
              {pedidoSeleccionado.historial.map((evento, idx) => (
                <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight="bold">
                      {evento.accion}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dayjs(evento.fecha).format("DD/MM/YYYY")}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Por: {evento.usuario}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDetalleOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Asignar Contenedor */}
      <Dialog open={isContenedorOpen} onClose={() => setIsContenedorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Marcar Pedido en Envío</DialogTitle>
        <DialogContent>
          {pedidoSeleccionado && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Pedido: {pedidoSeleccionado.numeroPedido}
              </Typography>
              <TextField
                fullWidth
                label="Número de Contenedor"
                value={contenedorNuevo}
                onChange={(e) => setContenedorNuevo(e.target.value.toUpperCase())}
                placeholder="Ej: TCLU123456"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsContenedorOpen(false);
            setContenedorNuevo("");
          }}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (pedidoSeleccionado && contenedorNuevo) {
                marcarPedidoEnTransito(pedidoSeleccionado._id, contenedorNuevo);
                setIsContenedorOpen(false);
                setContenedorNuevo("");
                alert(`Pedido ${pedidoSeleccionado.numeroPedido} marcado en envío`);
              }
            }}
            disabled={!contenedorNuevo}
          >
            Confirmar Envío
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

PedidosMockPage.getLayout = (page) => page;

export default PedidosMockPage;