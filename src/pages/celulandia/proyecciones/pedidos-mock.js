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

// Datos mock de contenedores
const mockContenedores = [
  {
    _id: "CONT001",
    numero: "TCLU123456",
    estado: "en_transito", // pendiente, en_transito, recibido
    fechaCreacion: "2025-11-15",
    fechaEstimada: "2025-11-25",
    fechaReal: null,
    fechaUltimaModificacion: "2025-11-18T10:30:00Z",
    observaciones: "Contenedor compartido entre múltiples pedidos"
  },
  {
    _id: "CONT002",
    numero: "TCLU567890",
    estado: "pendiente",
    fechaCreacion: "2025-11-10",
    fechaEstimada: "2025-12-05",
    fechaReal: null,
    fechaUltimaModificacion: "2025-11-12T14:20:00Z",
    observaciones: "Pendiente de envío"
  },
  {
    _id: "CONT003",
    numero: "CSLU789012",
    estado: "recibido",
    fechaCreacion: "2025-11-06",
    fechaEstimada: "2025-11-20",
    fechaReal: "2025-11-22",
    fechaUltimaModificacion: "2025-11-22T16:45:00Z",
    observaciones: "Entregado completo"
  },
  {
    _id: "CONT004",
    numero: "MALU456789",
    estado: "en_transito",
    fechaCreacion: "2025-11-10",
    fechaEstimada: "2025-11-18",
    fechaReal: null,
    fechaUltimaModificacion: "2025-11-19T09:15:00Z",
    observaciones: "Retraso por problemas logísticos"
  },
  {
    _id: "CONT005",
    numero: "APPL111222",
    estado: "pendiente",
    fechaCreacion: "2025-11-12",
    fechaEstimada: "2025-12-01",
    fechaReal: null,
    fechaUltimaModificacion: "2025-11-12T11:00:00Z",
    observaciones: "Productos premium"
  }
];

// Tabla de relación pedidos-contenedores
const mockPedidoContenedores = [
  {
    _id: "PC001",
    pedidoId: "PED001",
    contenedorId: "CONT001",
    productos: [
      { productoId: "1", codigo: "ACC001", descripcion: "Auriculares Gaming RGB Pro", cantidad: 100 }
    ],
    fechaAsignacion: "2025-11-15"
  },
  {
    _id: "PC002",
    pedidoId: "PED002",
    contenedorId: "CONT001",
    productos: [
      { productoId: "2", codigo: "CAB002", descripcion: "Cable USB-C a Lightning 2m", cantidad: 50 }
    ],
    fechaAsignacion: "2025-11-18"
  },
  {
    _id: "PC003",
    pedidoId: "PED002",
    contenedorId: "CONT002",
    productos: [
      { productoId: "1", codigo: "ACC001", descripcion: "Auriculares Gaming RGB Pro", cantidad: 50 },
      { productoId: "4", codigo: "CAR004", descripcion: "Cargador Rápido 65W USB-C", cantidad: 150 }
    ],
    fechaAsignacion: "2025-11-12"
  },
  {
    _id: "PC004",
    pedidoId: "PED003",
    contenedorId: "CONT003",
    productos: [
      { productoId: "2", codigo: "CAB002", descripcion: "Cable USB-C a Lightning 2m", cantidad: 200 }
    ],
    fechaAsignacion: "2025-11-06"
  },
  {
    _id: "PC005",
    pedidoId: "PED004",
    contenedorId: "CONT004",
    productos: [
      { productoId: "3", codigo: "FUN003", descripcion: "Funda Transparente iPhone 15", cantidad: 300 },
      { productoId: "1", codigo: "ACC001", descripcion: "Auriculares Gaming RGB Pro", cantidad: 75 }
    ],
    fechaAsignacion: "2025-11-10"
  },
  {
    _id: "PC006",
    pedidoId: "PED005",
    contenedorId: "CONT005",
    productos: [
      { productoId: "5", codigo: "APL001", descripcion: "iPhone 15 Pro", cantidad: 25 }
    ],
    fechaAsignacion: "2025-11-12"
  }
];

// Datos mock expandidos para pedidos (sin contenedor y estado directo)
const mockPedidosCompletos = [
  {
    _id: "PED001",
    numeroPedido: "PED-2025-001", // Usuario puede editarlo
    fechaPedido: "2025-11-01",
    fechaEstimada: "2025-11-25",
    fechaReal: null,
    fechaUltimaModificacion: "2025-11-18T10:30:00Z",
    comentarios: "Pedido especial Black Friday",
    historial: [
      { fecha: "2025-11-01", accion: "Pedido creado", usuario: "Juan Pérez" },
      { fecha: "2025-11-15", accion: "Confirmado", usuario: "Sistema" },
      { fecha: "2025-11-18", accion: "Asignado a contenedor TCLU123456", usuario: "María López" }
    ]
  },
  {
    _id: "PED002", 
    numeroPedido: "PED-2025-002",
    fechaPedido: "2025-11-10",
    fechaEstimada: "2025-12-05",
    fechaReal: null,
    fechaUltimaModificacion: "2025-11-18T11:45:00Z",
    comentarios: "Restock navideño - dividido en 2 contenedores",
    historial: [
      { fecha: "2025-11-10", accion: "Pedido creado", usuario: "Ana García" },
      { fecha: "2025-11-12", accion: "Confirmado", usuario: "Sistema" },
      { fecha: "2025-11-18", accion: "Dividido en contenedores TCLU123456 y TCLU567890", usuario: "María López" }
    ]
  },
  {
    _id: "PED003",
    numeroPedido: "PED-2025-003", 
    fechaPedido: "2025-11-05",
    fechaEstimada: "2025-11-20",
    fechaReal: "2025-11-22",
    fechaUltimaModificacion: "2025-11-22T16:45:00Z",
    comentarios: "URGENTE - Stock agotado",
    historial: [
      { fecha: "2025-11-05", accion: "Pedido creado", usuario: "Carlos Ruiz" },
      { fecha: "2025-11-06", accion: "Confirmado", usuario: "Sistema" },
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
    fechaUltimaModificacion: "2025-11-19T09:15:00Z",
    comentarios: "Pedido con retraso por problemas logísticos",
    historial: [
      { fecha: "2025-10-28", accion: "Pedido creado", usuario: "Luis Fernández" },
      { fecha: "2025-10-30", accion: "Confirmado", usuario: "Sistema" },
      { fecha: "2025-11-10", accion: "En tránsito - Contenedor MALU456789", usuario: "María López" },
      { fecha: "2025-11-19", accion: "Retraso notificado", usuario: "Sistema" }
    ]
  },
  {
    _id: "PED005",
    numeroPedido: "PED-2025-005",
    fechaPedido: "2025-11-12",
    fechaEstimada: "2025-12-01",
    fechaReal: null,
    fechaUltimaModificacion: "2025-11-12T11:00:00Z",
    comentarios: "Productos premium",
    historial: [
      { fecha: "2025-11-12", accion: "Pedido creado", usuario: "Ana García" },
      { fecha: "2025-11-12", accion: "Asignado a contenedor APPL111222", usuario: "Sistema" }
    ]
  }
];

function PedidosMockPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState(mockPedidosCompletos);
  const [contenedores, setContenedores] = useState(mockContenedores);
  const [pedidoContenedores, setPedidoContenedores] = useState(mockPedidoContenedores);
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [tabValue, setTabValue] = useState(0);
  
  // Estados para modales
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [contenedorSeleccionado, setContenedorSeleccionado] = useState(null);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [isEditarPedidoOpen, setIsEditarPedidoOpen] = useState(false);
  const [isNuevoContenedorOpen, setIsNuevoContenedorOpen] = useState(false);
  const [isAsignarContenedorOpen, setIsAsignarContenedorOpen] = useState(false);
  const [isGestionContenedorOpen, setIsGestionContenedorOpen] = useState(false);
  const [contenedorNuevo, setContenedorNuevo] = useState("");
  
  // Estados para formularios
  const [numeroPedidoEditado, setNumeroPedidoEditado] = useState("");
  const [nuevoNumeroContenedor, setNuevoNumeroContenedor] = useState("");
  const [nuevaFechaEstimada, setNuevaFechaEstimada] = useState("");
  const [nuevasObservaciones, setNuevasObservaciones] = useState("");

  // Funciones para manejo de contenedores y estados
  const obtenerContenedoresPorPedido = (pedidoId) => {
    const relaciones = pedidoContenedores.filter(pc => pc.pedidoId === pedidoId);
    return relaciones.map(relacion => {
      const contenedor = contenedores.find(c => c._id === relacion.contenedorId);
      return {
        ...contenedor,
        productos: relacion.productos,
        fechaAsignacion: relacion.fechaAsignacion
      };
    });
  };

  const obtenerPedidosPorContenedor = (contenedorId) => {
    const relaciones = pedidoContenedores.filter(pc => pc.contenedorId === contenedorId);
    return relaciones.map(relacion => {
      const pedido = pedidos.find(p => p._id === relacion.pedidoId);
      return {
        ...pedido,
        productos: relacion.productos,
        fechaAsignacion: relacion.fechaAsignacion
      };
    });
  };

  const calcularEstadoPedido = (pedidoId) => {
    const contenedoresPedido = obtenerContenedoresPorPedido(pedidoId);
    
    if (contenedoresPedido.length === 0) return "pedido";
    
    const estadosContenedores = contenedoresPedido.map(c => c.estado);
    
    if (estadosContenedores.every(estado => estado === "recibido")) return "recibido";
    if (estadosContenedores.some(estado => estado === "en_transito")) return "en_transito";
    if (estadosContenedores.every(estado => estado === "pendiente")) return "pedido";
    
    // Si hay estados mixtos, determinar por mayoría o fecha más reciente
    const fechaEstimadaMasReciente = Math.max(...contenedoresPedido.map(c => new Date(c.fechaEstimada).getTime()));
    const hoy = new Date().getTime();
    
    if (fechaEstimadaMasReciente < hoy) return "atrasado";
    if (estadosContenedores.some(estado => estado === "en_transito")) return "en_transito";
    
    return "pedido";
  };

  const obtenerProductosTotalesPedido = (pedidoId) => {
    const contenedoresPedido = obtenerContenedoresPorPedido(pedidoId);
    const productosMap = new Map();
    
    contenedoresPedido.forEach(contenedor => {
      contenedor.productos.forEach(producto => {
        const key = producto.codigo;
        if (productosMap.has(key)) {
          productosMap.get(key).cantidad += producto.cantidad;
        } else {
          productosMap.set(key, { ...producto });
        }
      });
    });
    
    return Array.from(productosMap.values());
  };

  const crearNuevoContenedor = () => {
    if (!nuevoNumeroContenedor || !nuevaFechaEstimada) return;
    
    const nuevoContenedor = {
      _id: `CONT${Date.now()}`,
      numero: nuevoNumeroContenedor.toUpperCase(),
      estado: "pendiente",
      fechaCreacion: new Date().toISOString().split('T')[0],
      fechaEstimada: nuevaFechaEstimada,
      fechaReal: null,
      fechaUltimaModificacion: new Date().toISOString(),
      observaciones: nuevasObservaciones || ""
    };
    
    setContenedores(prev => [...prev, nuevoContenedor]);
    
    // Limpiar formulario
    setNuevoNumeroContenedor("");
    setNuevaFechaEstimada("");
    setNuevasObservaciones("");
    setIsNuevoContenedorOpen(false);
    
    alert(`Contenedor ${nuevoContenedor.numero} creado exitosamente`);
  };

  const asignarContenedorAPedido = (pedidoId, contenedorId, productos) => {
    const nuevaRelacion = {
      _id: `PC${Date.now()}`,
      pedidoId,
      contenedorId,
      productos,
      fechaAsignacion: new Date().toISOString().split('T')[0]
    };
    
    setPedidoContenedores(prev => [...prev, nuevaRelacion]);
    
    // Actualizar fecha de última modificación del pedido
    setPedidos(prev => prev.map(p => 
      p._id === pedidoId 
        ? { 
            ...p, 
            fechaUltimaModificacion: new Date().toISOString(),
            historial: [...p.historial, {
              fecha: new Date().toISOString().split('T')[0],
              accion: `Asignado a contenedor ${contenedores.find(c => c._id === contenedorId)?.numero}`,
              usuario: "Usuario Demo"
            }]
          }
        : p
    ));
  };

  const cambiarEstadoContenedor = (contenedorId, nuevoEstado) => {
    setContenedores(prev => prev.map(c => 
      c._id === contenedorId 
        ? { 
            ...c, 
            estado: nuevoEstado,
            fechaReal: nuevoEstado === "recibido" ? new Date().toISOString().split('T')[0] : c.fechaReal,
            fechaUltimaModificacion: new Date().toISOString()
          }
        : c
    ));
    
    // Actualizar historial de todos los pedidos asociados
    const pedidosAfectados = obtenerPedidosPorContenedor(contenedorId);
    const contenedor = contenedores.find(c => c._id === contenedorId);
    
    pedidosAfectados.forEach(pedido => {
      setPedidos(prev => prev.map(p => 
        p._id === pedido._id 
          ? { 
              ...p, 
              fechaUltimaModificacion: new Date().toISOString(),
              fechaReal: nuevoEstado === "recibido" ? new Date().toISOString().split('T')[0] : p.fechaReal,
              historial: [...p.historial, {
                fecha: new Date().toISOString().split('T')[0],
                accion: `Contenedor ${contenedor?.numero} marcado como ${nuevoEstado}`,
                usuario: "Usuario Demo"
              }]
            }
          : p
      ));
    });
  };

  const editarNumeroPedido = (pedidoId, nuevoNumero) => {
    setPedidos(prev => prev.map(p => 
      p._id === pedidoId 
        ? { 
            ...p, 
            numeroPedido: nuevoNumero,
            fechaUltimaModificacion: new Date().toISOString(),
            historial: [...p.historial, {
              fecha: new Date().toISOString().split('T')[0],
              accion: `Número de pedido actualizado a ${nuevoNumero}`,
              usuario: "Usuario Demo"
            }]
          }
        : p
    ));
  };

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
    return pedidos
      .map(pedido => ({
        ...pedido,
        estadoCalculado: calcularEstadoPedido(pedido._id),
        contenedoresPedido: obtenerContenedoresPorPedido(pedido._id),
        productosTotales: obtenerProductosTotalesPedido(pedido._id)
      }))
      .filter(pedido => {
        const matchEstado = filtroEstado === "Todos" || pedido.estadoCalculado === filtroEstado;
        
        // Buscar en número de pedido y números de contenedores
        const numerosContenedores = pedido.contenedoresPedido.map(c => c.numero).join(" ");
        const matchBusqueda = busqueda === "" || 
          pedido.numeroPedido.toLowerCase().includes(busqueda.toLowerCase()) ||
          numerosContenedores.toLowerCase().includes(busqueda.toLowerCase());
        
        return matchEstado && matchBusqueda;
      })
      .sort((a, b) => new Date(b.fechaUltimaModificacion) - new Date(a.fechaUltimaModificacion)); // Ordenar por última modificación
  }, [pedidos, contenedores, pedidoContenedores, filtroEstado, busqueda]);

  const estadisticas = useMemo(() => {
    const pedidosConEstado = pedidos.map(p => ({
      ...p,
      estadoCalculado: calcularEstadoPedido(p._id),
      productosTotales: obtenerProductosTotalesPedido(p._id)
    }));
    
    return {
      total: pedidos.length,
      pedidos: pedidosConEstado.filter(p => p.estadoCalculado === 'pedido').length,
      enTransito: pedidosConEstado.filter(p => p.estadoCalculado === 'en_transito').length,
      recibidos: pedidosConEstado.filter(p => p.estadoCalculado === 'recibido').length,
      atrasados: pedidosConEstado.filter(p => p.estadoCalculado === 'atrasado').length,
      totalProductos: pedidosConEstado.reduce((sum, p) => sum + p.productosTotales.reduce((pSum, prod) => pSum + prod.cantidad, 0), 0),
      totalContenedores: contenedores.length
    };
  }, [pedidos, contenedores, pedidoContenedores]);



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
            <Grid item xs={12} md={1.5}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">{estadisticas.recibidos}</Typography>
                  <Typography variant="caption">Recibidos</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={1.5}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main">{estadisticas.atrasados}</Typography>
                  <Typography variant="caption">Atrasados</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={1.5}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="secondary.main">{estadisticas.totalContenedores}</Typography>
                  <Typography variant="caption">Contenedores</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={1.5}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {estadisticas.totalProductos.toLocaleString()}
                  </Typography>
                  <Typography variant="caption">Productos</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filtros y búsqueda */}
          <Card sx={{ mb: 3, p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por número de pedido o contenedor..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  helperText="Ej: PED-2025-001, TCLU123456"
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
                <Typography variant="body2" color="text.secondary">
                  Mostrando {pedidosFiltrados.length} de {pedidos.length} pedidos
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Ordenado por última modificación
                </Typography>
              </Grid>
              <Grid item xs={12} md={2}>
                <Stack spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setFiltroEstado("Todos");
                      setBusqueda("");
                    }}
                  >
                    Limpiar Filtros
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    color="success"
                    onClick={() => setIsNuevoContenedorOpen(true)}
                    startIcon={<AddIcon />}
                  >
                    Nuevo Contenedor
                  </Button>
                </Stack>
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
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="h6">{pedido.numeroPedido}</Typography>
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setPedidoSeleccionado(pedido);
                              setNumeroPedidoEditado(pedido.numeroPedido);
                              setIsEditarPedidoOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(pedido.fechaPedido).format("DD/MM/YYYY")}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Últ. mod: {dayjs(pedido.fechaUltimaModificacion).format("DD/MM HH:mm")}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Chip
                          size="small"
                          icon={getStatusIcon(pedido.estadoCalculado)}
                          label={pedido.estadoCalculado.replace('_', ' ')}
                          color={getStatusColor(pedido.estadoCalculado)}
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                          Llega: {dayjs(pedido.fechaEstimada).format("DD/MM")}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Box>
                          {pedido.contenedoresPedido.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              Sin contenedores
                            </Typography>
                          ) : pedido.contenedoresPedido.length === 1 ? (
                            <>
                              <Typography variant="body2" fontWeight="bold">
                                {pedido.contenedoresPedido[0].numero}
                              </Typography>
                              <Chip 
                                size="small" 
                                label={pedido.contenedoresPedido[0].estado} 
                                color={getStatusColor(pedido.contenedoresPedido[0].estado)}
                                sx={{ mt: 0.5 }}
                              />
                            </>
                          ) : (
                            <>
                              <Typography variant="body2" fontWeight="bold">
                                {pedido.contenedoresPedido.length} contenedores
                              </Typography>
                              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                                {pedido.contenedoresPedido.slice(0, 2).map((cont, idx) => (
                                  <Chip 
                                    key={idx}
                                    size="small" 
                                    label={cont.numero} 
                                    color={getStatusColor(cont.estado)}
                                  />
                                ))}
                                {pedido.contenedoresPedido.length > 2 && (
                                  <Chip size="small" label={`+${pedido.contenedoresPedido.length - 2}`} />
                                )}
                              </Stack>
                            </>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Contenedores
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Typography variant="body2" fontWeight="bold">
                          {pedido.productosTotales.length} productos
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pedido.productosTotales.reduce((sum, p) => sum + p.cantidad, 0)} unidades
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
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => {
                              setPedidoSeleccionado(pedido);
                              setIsAsignarContenedorOpen(true);
                            }}
                            startIcon={<AddIcon />}
                          >
                            Contenedor
                          </Button>
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
              <Tab label="Contenedores" />
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
                  icon={getStatusIcon(pedidoSeleccionado.estadoCalculado)}
                  label={pedidoSeleccionado.estadoCalculado.replace('_', ' ')}
                  color={getStatusColor(pedidoSeleccionado.estadoCalculado)}
                  sx={{ mt: 0.5 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Contenedores</Typography>
                <Typography variant="body1" gutterBottom>
                  {pedidoSeleccionado.contenedoresPedido.length === 0 
                    ? "Sin asignar" 
                    : `${pedidoSeleccionado.contenedoresPedido.length} contenedor(es)`}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Última Modificación</Typography>
                <Typography variant="body1" gutterBottom>
                  {dayjs(pedidoSeleccionado.fechaUltimaModificacion).format("DD/MM/YYYY HH:mm")}
                </Typography>
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
                  {pedidoSeleccionado.productosTotales.reduce((sum, p) => sum + p.cantidad, 0)} productos
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
            <Box>
              {pedidoSeleccionado.contenedoresPedido.length === 0 ? (
                <Alert severity="info">
                  Este pedido no tiene contenedores asignados todavía.
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {pedidoSeleccionado.contenedoresPedido.map((contenedor, idx) => (
                    <Grid item xs={12} key={idx}>
                      <Card variant="outlined">
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Typography variant="h6">{contenedor.numero}</Typography>
                            <Stack direction="row" spacing={1}>
                              <Chip 
                                size="small" 
                                label={contenedor.estado} 
                                color={getStatusColor(contenedor.estado)}
                              />
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  setContenedorSeleccionado(contenedor);
                                  setIsGestionContenedorOpen(true);
                                }}
                              >
                                Gestionar
                              </Button>
                            </Stack>
                          </Stack>
                          
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">Fecha Estimada</Typography>
                              <Typography variant="body2">{dayjs(contenedor.fechaEstimada).format("DD/MM/YYYY")}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">Fecha Real</Typography>
                              <Typography variant="body2">
                                {contenedor.fechaReal ? dayjs(contenedor.fechaReal).format("DD/MM/YYYY") : "Pendiente"}
                              </Typography>
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">Productos en este contenedor</Typography>
                              <Box sx={{ mt: 1 }}>
                                {contenedor.productos.map((producto, pIdx) => (
                                  <Chip 
                                    key={pIdx}
                                    size="small" 
                                    label={`${producto.codigo} (${producto.cantidad})`}
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                  />
                                ))}
                              </Box>
                            </Grid>
                            {contenedor.observaciones && (
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">Observaciones</Typography>
                                <Typography variant="body2">{contenedor.observaciones}</Typography>
                              </Grid>
                            )}
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}

          {pedidoSeleccionado && tabValue === 2 && (
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
                  {pedidoSeleccionado.productosTotales.map((producto, idx) => (
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

          {pedidoSeleccionado && tabValue === 3 && (
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

      {/* Modal para Editar Número de Pedido */}
      <Dialog open={isEditarPedidoOpen} onClose={() => setIsEditarPedidoOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Número de Pedido</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Número de Pedido"
              value={numeroPedidoEditado}
              onChange={(e) => setNumeroPedidoEditado(e.target.value)}
              placeholder="Ej: PED-2025-001"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditarPedidoOpen(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (pedidoSeleccionado && numeroPedidoEditado) {
                editarNumeroPedido(pedidoSeleccionado._id, numeroPedidoEditado);
                setIsEditarPedidoOpen(false);
                alert(`Número de pedido actualizado`);
              }
            }}
            disabled={!numeroPedidoEditado}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Crear Nuevo Contenedor */}
      <Dialog open={isNuevoContenedorOpen} onClose={() => setIsNuevoContenedorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Crear Nuevo Contenedor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Número de Contenedor"
              value={nuevoNumeroContenedor}
              onChange={(e) => setNuevoNumeroContenedor(e.target.value.toUpperCase())}
              placeholder="Ej: TCLU123456"
            />
            <TextField
              fullWidth
              type="date"
              label="Fecha Estimada de Llegada"
              value={nuevaFechaEstimada}
              onChange={(e) => setNuevaFechaEstimada(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Observaciones"
              value={nuevasObservaciones}
              onChange={(e) => setNuevasObservaciones(e.target.value)}
              placeholder="Observaciones opcionales sobre el contenedor"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsNuevoContenedorOpen(false);
            setNuevoNumeroContenedor("");
            setNuevaFechaEstimada("");
            setNuevasObservaciones("");
          }}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={crearNuevoContenedor}
            disabled={!nuevoNumeroContenedor || !nuevaFechaEstimada}
          >
            Crear Contenedor
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Asignar Contenedor a Pedido */}
      <Dialog open={isAsignarContenedorOpen} onClose={() => setIsAsignarContenedorOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Asignar Contenedor a Pedido</DialogTitle>
        <DialogContent>
          {pedidoSeleccionado && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Pedido: {pedidoSeleccionado.numeroPedido}
              </Typography>
              
              <Typography variant="h6">Contenedores Disponibles</Typography>
              <Grid container spacing={2}>
                {contenedores.filter(c => c.estado === 'pendiente').map((contenedor) => (
                  <Grid item xs={12} md={6} key={contenedor._id}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'grey.50' }
                      }}
                      onClick={() => {
                        // Lógica para asignar contenedor - simplificada por ser mock
                        const productosAPedido = pedidoSeleccionado.productosTotales.slice(0, 2); // Tomar algunos productos
                        asignarContenedorAPedido(pedidoSeleccionado._id, contenedor._id, productosAPedido);
                        setIsAsignarContenedorOpen(false);
                        alert(`Contenedor ${contenedor.numero} asignado al pedido`);
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6">{contenedor.numero}</Typography>
                          <Chip size="small" label={contenedor.estado} color={getStatusColor(contenedor.estado)} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Llega: {dayjs(contenedor.fechaEstimada).format("DD/MM/YYYY")}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              {contenedores.filter(c => c.estado === 'pendiente').length === 0 && (
                <Alert severity="info">
                  No hay contenedores pendientes disponibles. Crea uno nuevo primero.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAsignarContenedorOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Gestionar Contenedor */}
      <Dialog open={isGestionContenedorOpen} onClose={() => setIsGestionContenedorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gestionar Contenedor</DialogTitle>
        <DialogContent>
          {contenedorSeleccionado && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="h6">{contenedorSeleccionado.numero}</Typography>
              <Typography variant="body2" color="text.secondary">
                Estado actual: {contenedorSeleccionado.estado}
              </Typography>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>Cambiar Estado:</Typography>
                <Stack direction="row" spacing={1}>
                  {contenedorSeleccionado.estado === 'pendiente' && (
                    <Button
                      variant="contained"
                      color="info"
                      onClick={() => {
                        cambiarEstadoContenedor(contenedorSeleccionado._id, "en_transito");
                        setIsGestionContenedorOpen(false);
                        alert("Contenedor marcado en tránsito");
                      }}
                    >
                      Marcar En Tránsito
                    </Button>
                  )}
                  {contenedorSeleccionado.estado === 'en_transito' && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => {
                        cambiarEstadoContenedor(contenedorSeleccionado._id, "recibido");
                        setIsGestionContenedorOpen(false);
                        alert("Contenedor marcado como recibido");
                      }}
                    >
                      Marcar Recibido
                    </Button>
                  )}
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsGestionContenedorOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

PedidosMockPage.getLayout = (page) => page;

export default PedidosMockPage;