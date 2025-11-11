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
  Menu,
  Tooltip,
  Tab,
  Tabs,
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
  Divider,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  FileDownload as FileDownloadIcon,
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
  MoreVert as MoreVertIcon,
  Label as LabelIcon,
  LabelOff as LabelOffIcon,
} from "@mui/icons-material";
import Head from "next/head";
import dayjs from "dayjs";

// Datos mock para pedidos - actualizados con productos del Excel
const mockPedidos = [
  {
    _id: "PED001",
    numeroPedido: "PED-2025-001",
    fechaPedido: "2025-11-01",
    fechaEstimada: "2025-11-25",
    estado: "en_transito",
    proveedor: "Tech Solutions",
    contenedor: "TCLU123456",
    comentarios: "Reposición auriculares CLD - stock agotado",
    productos: [
      { productoId: "1", codigo: "A02CLD", descripcion: "AURICULAR 02 CLD", cantidad: 200 },
      { productoId: "9", codigo: "ACLDE", descripcion: "AURICULAR INALAMBRICO CLD ERGO", cantidad: 200 }
    ]
  },
  {
    _id: "PED002", 
    numeroPedido: "PED-2025-002",
    fechaPedido: "2025-11-10",
    fechaEstimada: "2025-12-05",
    estado: "pedido",
    proveedor: "Tech Solutions",
    contenedor: null,
    comentarios: "Restock navideño - auriculares populares",
    productos: [
      { productoId: "2", codigo: "A03CLD", descripcion: "AURICULAR 03 CLD", cantidad: 200 },
      { productoId: "8", codigo: "ACLD01", descripcion: "AURICULAR CON CABLE CLD 01 TIPO C", cantidad: 200 }
    ]
  },
  {
    _id: "PED003",
    numeroPedido: "PED-2025-003", 
    fechaPedido: "2025-11-05",
    fechaEstimada: "2025-11-20",
    estado: "en_transito",
    proveedor: "Apple Store",
    contenedor: "APPL789012",
    comentarios: "Reposición AirPods - temporada alta",
    productos: [
      { productoId: "3", codigo: "A2DA", descripcion: "AIRPODS 2DA GEN", cantidad: 250 },
      { productoId: "4", codigo: "A3", descripcion: "AIRPODS 3RA GEN", cantidad: 250 }
    ]
  },
  {
    _id: "PED004",
    numeroPedido: "PED-2025-004",
    fechaPedido: "2025-11-12",
    fechaEstimada: "2025-12-01",
    estado: "pedido",
    proveedor: "Apple Store",
    contenedor: null,
    comentarios: "Navidad - productos Apple premium",
    productos: [
      { productoId: "5", codigo: "A4", descripcion: "AIRPODS 4TA GEN", cantidad: 250 }
    ]
  },
  {
    _id: "PED005",
    numeroPedido: "PED-2025-005",
    fechaPedido: "2025-11-15",
    fechaEstimada: "2025-12-10",
    estado: "pedido",
    proveedor: "Apple Store",
    contenedor: null,
    comentarios: "Último modelo AirPods",
    productos: [
      { productoId: "5", codigo: "A4", descripcion: "AIRPODS 4TA GEN", cantidad: 250 }
    ]
  },
  {
    _id: "PED006",
    numeroPedido: "PED-2025-006",
    fechaPedido: "2025-11-08",
    fechaEstimada: "2025-11-18",
    estado: "retraso",
    proveedor: "Apple Store",
    contenedor: "APPL456789",
    comentarios: "URGENTE - AirPods Pro stock crítico",
    productos: [
      { productoId: "6", codigo: "A5TA", descripcion: "AIRPODS PRO 2", cantidad: 300 }
    ]
  },

  {
    _id: "PED008",
    numeroPedido: "PED-2025-008",
    fechaPedido: "2025-11-18",
    fechaEstimada: "2025-12-15",
    estado: "pedido",
    proveedor: "Tech Solutions",
    contenedor: null,
    comentarios: "Alto volumen - producto popular",
    productos: [
      { productoId: "8", codigo: "ACLD01", descripcion: "AURICULAR CON CABLE CLD 01 TIPO C", cantidad: 200 }
    ]
  },
  {
    _id: "PED009",
    numeroPedido: "PED-2025-009",
    fechaPedido: "2025-11-16",
    fechaEstimada: "2025-12-08",
    estado: "pedido",
    proveedor: "Tech Solutions",
    contenedor: null,
    comentarios: "Auriculares ergonómicos",
    productos: [
      { productoId: "9", codigo: "ACLDE", descripcion: "AURICULAR INALAMBRICO CLD ERGO", cantidad: 200 }
    ]
  },


  {
    _id: "PED012",
    numeroPedido: "PED-2025-012",
    fechaPedido: "2025-11-25",
    fechaEstimada: "2025-12-20",
    estado: "pedido",
    proveedor: "Apple Store",
    contenedor: null,
    comentarios: "Más AirPods Max - negro más popular",
    productos: [
      { productoId: "12", codigo: "AMN", descripcion: "AIRPODS MAX NEGRO AAA", cantidad: 50 }
    ]
  },
  {
    _id: "PED013",
    numeroPedido: "PED-2025-013",
    fechaPedido: "2025-11-14",
    fechaEstimada: "2025-11-28",
    estado: "en_transito",
    proveedor: "Accesorios Plus",
    contenedor: "ACCE123456",
    comentarios: "Fundas iPhone 14 Pro",
    productos: [
      { productoId: "13", codigo: "ANBI14P", descripcion: "ANTIGOLPE BRILLO IPHONE 14 PRO", cantidad: 150 }
    ]
  },
  {
    _id: "PED014",
    numeroPedido: "PED-2025-014",
    fechaPedido: "2025-11-17",
    fechaEstimada: "2025-11-22",
    estado: "en_transito",
    proveedor: "Accesorios Plus",
    contenedor: "ACCE789012",
    comentarios: "URGENTE - Fundas iPhone 15 Pro stock bajo",
    productos: [
      { productoId: "14", codigo: "ANBI15P", descripcion: "ANTIGOLPE BRILLO IPHONE 15 PRO", cantidad: 200 }
    ]
  },


  {
    _id: "PED017",
    numeroPedido: "PED-2025-017",
    fechaPedido: "2025-11-21",
    fechaEstimada: "2025-12-10",
    estado: "pedido",
    proveedor: "Accesorios Plus",
    contenedor: null,
    comentarios: "Fundas Samsung A26 - modelo popular",
    productos: [
      { productoId: "17", codigo: "BCA26", descripcion: "BORDE COLOR A26", cantidad: 150 }
    ]
  },
  {
    _id: "PED018",
    numeroPedido: "PED-2025-018",
    fechaPedido: "2025-11-02",
    fechaEstimada: "2025-11-15",
    estado: "retraso",
    proveedor: "Apple Store",
    contenedor: "APPL999888",
    comentarios: "CRÍTICO - Apple Watch sin stock",
    productos: [
      { productoId: "18", codigo: "AW", descripcion: "APPLE WATCH S9 41MM PINK", cantidad: 25 }
    ]
  }
];

// Datos mock basados en el Excel proporcionado - productos de electrónicos y accesorios
const mockProductosProyeccion = [
  {
    _id: "1",
    codigo: "A02CLD",
    descripcion: "AURICULAR 02 CLD",
    tags: ["Auriculares", "Inalámbrico"],
    cantidad: 0,
    stockProyectado: 200,
    ventasPeriodo: 150,
    ventasProyectadas: 300,
    diasSinStock: 15,
    diasSinStockEnPeriodo: 15,
    stockCritico: true,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-001",
      fecha: "2025-11-25",
      cantidad: 200,
      proveedor: "Tech Solutions",
      contenedor: "TCLU123456"
    },
    anotaciones: "Stock agotado - prioridad alta"
  },
  {
    _id: "2",
    codigo: "A03CLD",
    descripcion: "AURICULAR 03 CLD",
    tags: ["Auriculares", "Inalámbrico"],
    cantidad: 1581,
    stockProyectado: 1781,
    ventasPeriodo: 320,
    ventasProyectadas: 450,
    diasSinStock: 0,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-002",
      fecha: "2025-12-05",
      cantidad: 200,
      proveedor: "Tech Solutions",
      contenedor: null
    },
    anotaciones: "Buen stock disponible"
  },
  {
    _id: "3",
    codigo: "A2DA",
    descripcion: "AIRPODS 2DA GEN",
    tags: ["Apple", "Premium", "Auriculares"],
    cantidad: 3657,
    stockProyectado: 3907,
    ventasPeriodo: 180,
    ventasProyectadas: 300,
    diasSinStock: 0,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-003",
      fecha: "2025-11-20",
      cantidad: 250,
      proveedor: "Apple Store",
      contenedor: "APPL789012"
    },
    anotaciones: "Producto estrella Apple"
  },
  {
    _id: "4",
    codigo: "A3",
    descripcion: "AIRPODS 3RA GEN",
    tags: ["Apple", "Premium", "Auriculares"],
    cantidad: 3093,
    stockProyectado: 3343,
    ventasPeriodo: 220,
    ventasProyectadas: 380,
    diasSinStock: 0,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-004",
      fecha: "2025-12-01",
      cantidad: 250,
      proveedor: "Apple Store",
      contenedor: null
    },
    anotaciones: "Alta demanda esperada para Navidad"
  },
  {
    _id: "5",
    codigo: "A4",
    descripcion: "AIRPODS 4TA GEN",
    tags: ["Apple", "Premium", "Nuevo"],
    cantidad: 6910,
    stockProyectado: 7160,
    ventasPeriodo: 450,
    ventasProyectadas: 600,
    diasSinStock: 0,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-005",
      fecha: "2025-12-10",
      cantidad: 250,
      proveedor: "Apple Store",
      contenedor: null
    },
    anotaciones: "Último modelo - muy demandado"
  },
  {
    _id: "6",
    codigo: "A5TA",
    descripcion: "AIRPODS PRO 2",
    tags: ["Apple", "Pro", "Premium"],
    cantidad: 6,
    stockProyectado: 306,
    ventasPeriodo: 280,
    ventasProyectadas: 450,
    diasSinStock: 8,
    diasSinStockEnPeriodo: 8,
    stockCritico: true,
    tienePedidosRetrasos: true,
    proximoPedido: {
      numeroPedido: "PED-2025-006",
      fecha: "2025-11-18",
      cantidad: 300,
      proveedor: "Apple Store",
      contenedor: "APPL456789"
    },
    anotaciones: "URGENTE - Stock crítico"
  },
  {
    _id: "7",
    codigo: "AB3",
    descripcion: "AURICULAR REDMI BUDS 3",
    tags: ["Samsung", "Xiaomi", "Budget"],
    cantidad: 143,
    stockProyectado: 143, // Sin pedidos pendientes
    ventasPeriodo: 85,
    ventasProyectadas: 150,
    diasSinStock: 12,
    diasSinStockEnPeriodo: 5,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: null,
    anotaciones: "Stock bajo pero sin pedidos programados"
  },
  {
    _id: "8",
    codigo: "ACLD01",
    descripcion: "AURICULAR CON CABLE CLD 01 TIPO C",
    tags: ["Cable", "USB-C", "Budget"],
    cantidad: 6949,
    stockProyectado: 7149,
    ventasPeriodo: 890,
    ventasProyectadas: 1200,
    diasSinStock: 0,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-008",
      fecha: "2025-12-15",
      cantidad: 200,
      proveedor: "Tech Solutions",
      contenedor: null
    },
    anotaciones: "Alto volumen de ventas"
  },
  {
    _id: "9",
    codigo: "ACLDE",
    descripcion: "AURICULAR INALAMBRICO CLD ERGO",
    tags: ["Inalámbrico", "Ergonómico"],
    cantidad: 1722,
    stockProyectado: 1922,
    ventasPeriodo: 180,
    ventasProyectadas: 250,
    diasSinStock: 0,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-009",
      fecha: "2025-12-08",
      cantidad: 200,
      proveedor: "Tech Solutions",
      contenedor: null
    },
    anotaciones: "Diseño ergonómico popular"
  },
  {
    _id: "10",
    codigo: "ACLDM",
    descripcion: "AURICULAR INALAMBRICO CLD METAL",
    tags: ["Inalámbrico", "Metal", "Premium"],
    cantidad: 830,
    stockProyectado: 830, // Sin pedidos pendientes
    ventasPeriodo: 120,
    ventasProyectadas: 200,
    diasSinStock: 0,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: null,
    anotaciones: "Stock suficiente - sin pedidos programados"
  },
  {
    _id: "11",
    codigo: "AMA",
    descripcion: "AIRPODS MAX AZUL AAA",
    tags: ["Apple", "Premium", "Over-ear"],
    cantidad: 219,
    stockProyectado: 219, // Sin pedidos pendientes
    ventasPeriodo: 25,
    ventasProyectadas: 60,
    diasSinStock: 0,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: null,
    anotaciones: "Stock suficiente - producto de nicho"
  },
  {
    _id: "12",
    codigo: "AMN",
    descripcion: "AIRPODS MAX NEGRO AAA",
    tags: ["Apple", "Premium", "Over-ear"],
    cantidad: 503,
    stockProyectado: 553,
    ventasPeriodo: 35,
    ventasProyectadas: 80,
    diasSinStock: 0,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-012",
      fecha: "2025-12-20",
      cantidad: 50,
      proveedor: "Apple Store",
      contenedor: null
    },
    anotaciones: "Color más popular en AirPods Max"
  },
  {
    _id: "13",
    codigo: "ANBI14P",
    descripcion: "ANTIGOLPE BRILLO IPHONE 14 PRO",
    tags: ["Funda", "iPhone", "Antigolpe"],
    cantidad: 309,
    stockProyectado: 459,
    ventasPeriodo: 85,
    ventasProyectadas: 150,
    diasSinStock: 0,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-013",
      fecha: "2025-11-28",
      cantidad: 150,
      proveedor: "Accesorios Plus",
      contenedor: "ACCE123456"
    },
    anotaciones: "Funda popular para iPhone 14 Pro"
  },
  {
    _id: "14",
    codigo: "ANBI15P",
    descripcion: "ANTIGOLPE BRILLO IPHONE 15 PRO",
    tags: ["Funda", "iPhone", "Nuevo"],
    cantidad: 3,
    stockProyectado: 203,
    ventasPeriodo: 95,
    ventasProyectadas: 180,
    diasSinStock: 18,
    diasSinStockEnPeriodo: 18,
    stockCritico: true,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-014",
      fecha: "2025-11-22",
      cantidad: 200,
      proveedor: "Accesorios Plus",
      contenedor: "ACCE789012"
    },
    anotaciones: "Stock muy bajo - nuevo modelo iPhone"
  },
  {
    _id: "15",
    codigo: "ARMAGC",
    descripcion: "ARO MAGSAFE COLOR",
    tags: ["MagSafe", "Accesorio", "Universal"],
    cantidad: 997764,
    stockProyectado: 997764, // Sin pedidos pendientes
    ventasPeriodo: 2500,
    ventasProyectadas: 3000,
    diasSinStock: 0,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: null,
    anotaciones: "Stock excesivo - no requiere pedidos"
  },
  {
    _id: "16",
    codigo: "BCA06",
    descripcion: "BORDE COLOR A06",
    tags: ["Funda", "Samsung", "Borde"],
    cantidad: 1707,
    stockProyectado: 1707, // Sin pedidos pendientes
    ventasPeriodo: 280,
    ventasProyectadas: 350,
    diasSinStock: 0,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: null,
    anotaciones: "Stock actual suficiente"
  },
  {
    _id: "17",
    codigo: "BCA26",
    descripcion: "BORDE COLOR A26",
    tags: ["Funda", "Samsung", "Borde"],
    cantidad: 2063,
    stockProyectado: 2213,
    ventasPeriodo: 320,
    ventasProyectadas: 400,
    diasSinStock: 0,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-017",
      fecha: "2025-12-10",
      cantidad: 150,
      proveedor: "Accesorios Plus",
      contenedor: null
    },
    anotaciones: "Modelo popular Samsung"
  },
  {
    _id: "18",
    codigo: "AW",
    descripcion: "APPLE WATCH S9 41MM PINK",
    tags: ["Apple Watch", "Premium", "Smartwatch"],
    cantidad: 0,
    stockProyectado: 25,
    ventasPeriodo: 12,
    ventasProyectadas: 35,
    diasSinStock: 45,
    diasSinStockEnPeriodo: 45,
    stockCritico: true,
    tienePedidosRetrasos: true,
    proximoPedido: {
      numeroPedido: "PED-2025-018",
      fecha: "2025-11-15",
      cantidad: 25,
      proveedor: "Apple Store",
      contenedor: "APPL999888"
    },
    anotaciones: "URGENTE - Producto de alto valor sin stock"
  }
];

const mockAlertas = {
  stockCritico: 4, // A02CLD, A5TA, ANBI15P, AW
  pedidosAtrasados: 2, // PED006, PED018
  proximosPedidos: 13 // Pedidos activos restantes
};

function ProyeccionMockPage() {
  const router = useRouter();
  const [productosProyeccion, setProductosProyeccion] = useState(mockProductosProyeccion);
  const [pedidos, setPedidos] = useState(mockPedidos);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [alertas, setAlertas] = useState(mockAlertas);
  
  // Estados para modales
  const [isPedidosOpen, setIsPedidosOpen] = useState(false);
  const [isNuevoPedidoOpen, setIsNuevoPedidoOpen] = useState(false);
  const [isContenedorOpen, setIsContenedorOpen] = useState(false);
  const [pedidoParaContenedor, setPedidoParaContenedor] = useState(null);
  
  // Estados para filtros
  const [riesgoStockFilter, setRiesgoStockFilter] = useState("Todos");
  const [metricasFilter, setMetricasFilter] = useState("Todos");
  const [isRecalculando, setIsRecalculando] = useState(false);
  
  // Estados para formularios
  const [tabValue, setTabValue] = useState(0);
  const [contenedorNuevo, setContenedorNuevo] = useState("");
  
  // Estados para crear nuevo pedido
  const [numeroPedido, setNumeroPedido] = useState("");
  const [proveedorPedido, setProveedorPedido] = useState("");
  const [fechaEstimadaPedido, setFechaEstimadaPedido] = useState("");
  const [comentariosPedido, setComentariosPedido] = useState("");
  const [productosEnPedido, setProductosEnPedido] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [cantidadProducto, setCantidadProducto] = useState("");
  
  // Estados para gestión de tags
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagAction, setTagAction] = useState(""); // "add" o "remove"
  const [newTag, setNewTag] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  
  // Estados para menú de acciones
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const menuOpen = Boolean(menuAnchorEl);

  const getPedidoStatusColor = (estado) => {
    switch (estado) {
      case "recibido": return "success";
      case "en_transito": return "info";
      case "pedido": return "warning";
      case "cancelado": return "error";
      default: return "default";
    }
  };

  const getPedidoStatusIcon = (estado) => {
    switch (estado) {
      case "recibido": return <CheckCircleIcon fontSize="small" />;
      case "en_transito": return <LocalShippingIcon fontSize="small" />;
      case "pedido": return <ScheduleIcon fontSize="small" />;
      case "cancelado": return <ErrorIcon fontSize="small" />;
      default: return <InventoryIcon fontSize="small" />;
    }
  };

  const marcarPedidoEnTransito = (pedidoId, contenedor) => {
    setPedidos(prev => prev.map(p => 
      p._id === pedidoId 
        ? { ...p, estado: "en_transito", contenedor }
        : p
    ));
  };

  const agregarProductoAPedido = () => {
    if (productoSeleccionado && cantidadProducto && parseInt(cantidadProducto) > 0) {
      const producto = productosProyeccion.find(p => p._id === productoSeleccionado);
      const nuevoProducto = {
        productoId: producto._id,
        codigo: producto.codigo,
        descripcion: producto.descripcion,
        cantidad: parseInt(cantidadProducto)
      };
      
      // Verificar si el producto ya está en el pedido
      const existente = productosEnPedido.find(p => p.productoId === productoSeleccionado);
      if (existente) {
        setProductosEnPedido(prev => prev.map(p => 
          p.productoId === productoSeleccionado 
            ? { ...p, cantidad: p.cantidad + parseInt(cantidadProducto) }
            : p
        ));
      } else {
        setProductosEnPedido(prev => [...prev, nuevoProducto]);
      }
      
      setProductoSeleccionado("");
      setCantidadProducto("");
    }
  };

  const actualizarCantidadProducto = (productoId, nuevaCantidad) => {
    setProductosEnPedido(prev => prev.map(p => 
      p.productoId === productoId 
        ? { ...p, cantidad: parseInt(nuevaCantidad) || 0 }
        : p
    ));
  };

  const removerProductoDePedido = (productoId) => {
    setProductosEnPedido(prev => prev.filter(p => p.productoId !== productoId));
  };

  const eliminarSeleccionados = () => {
    if (selectedKeys.size === 0) return;
    
    const confirmacion = window.confirm(
      `¿Está seguro que desea eliminar ${selectedKeys.size} producto(s) seleccionado(s)?`
    );
    
    if (confirmacion) {
      setProductosProyeccion(prev => prev.filter(p => !selectedKeys.has(p._id)));
      setSelectedKeys(new Set());
      alert(`${selectedKeys.size} producto(s) eliminado(s) exitosamente`);
    }
  };

  const agregarTagASeleccionados = (tag) => {
    if (selectedKeys.size === 0) return;
    
    setProductosProyeccion(prev => prev.map(producto => {
      if (selectedKeys.has(producto._id)) {
        const tagsActuales = producto.tags || [];
        if (!tagsActuales.includes(tag)) {
          return { ...producto, tags: [...tagsActuales, tag] };
        }
      }
      return producto;
    }));
    
    alert(`Tag "${tag}" agregado a ${selectedKeys.size} producto(s)`);
  };

  const eliminarTagDeSeleccionados = (tag) => {
    if (selectedKeys.size === 0) return;
    
    setProductosProyeccion(prev => prev.map(producto => {
      if (selectedKeys.has(producto._id)) {
        const tagsActuales = producto.tags || [];
        return { ...producto, tags: tagsActuales.filter(t => t !== tag) };
      }
      return producto;
    }));
    
    alert(`Tag "${tag}" eliminado de ${selectedKeys.size} producto(s)`);
  };

  const obtenerTagsDisponibles = () => {
    const todosLosTags = new Set();
    productosProyeccion.forEach(producto => {
      if (producto.tags) {
        producto.tags.forEach(tag => todosLosTags.add(tag));
      }
    });
    return Array.from(todosLosTags).sort();
  };

  const limpiarFormularioPedido = () => {
    setNumeroPedido("");
    setProveedorPedido("");
    setFechaEstimadaPedido("");
    setComentariosPedido("");
    setProductosEnPedido([]);
    setProductoSeleccionado("");
    setCantidadProducto("");
  };

  const recalcularProyeccion = () => {
    setIsRecalculando(true);
    setTimeout(() => {
      // Simular recálculo con datos aleatorios
      setProductosProyeccion(prev => prev.map(producto => ({
        ...producto,
        stockProyectado: producto.cantidad + Math.floor(Math.random() * 200),
        ventasPeriodo: Math.floor(Math.random() * 300) + 50,
        diasSinStock: Math.floor(Math.random() * 60),
        diasSinStockEnPeriodo: Math.floor(Math.random() * 15)
      })));
      setIsRecalculando(false);
      alert("✅ Proyección recalculada exitosamente con datos actualizados!");
    }, 2000);
  };

  const allVisibleKeys = useMemo(() => new Set(productosProyeccion.map((i) => i._id)), [productosProyeccion]);
  const allSelected = useMemo(() => 
    productosProyeccion.length > 0 && productosProyeccion.every((i) => selectedKeys.has(i._id)),
    [productosProyeccion, selectedKeys]
  );
  const someSelected = useMemo(() => 
    productosProyeccion.some((i) => selectedKeys.has(i._id)) && !allSelected,
    [productosProyeccion, selectedKeys, allSelected]
  );

  const toggleSelectAll = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        productosProyeccion.forEach((i) => next.delete(i._id));
      } else {
        productosProyeccion.forEach((i) => next.add(i._id));
      }
      return next;
    });
  };

  const toggleRow = (id) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };



  const productosSeleccionados = productosProyeccion.filter(p => selectedKeys.has(p._id));

  const productosFiltrados = useMemo(() => {
    return productosProyeccion.filter(producto => {
      // Filtro por métricas específicas
      if (metricasFilter !== "Todos") {
        switch (metricasFilter) {
          case "stockCritico":
            if (!producto.stockCritico) return false;
            break;
          case "sinStock":
            if (producto.cantidad >= 0) return false;
            break;
          case "conPedidos":
            if (!producto.proximoPedido) return false;
            break;
          case "sinPedidos":
            if (producto.proximoPedido) return false;
            break;
          case "conFaltantes":
            if (producto.diasSinStockEnPeriodo === 0) return false;
            break;
        }
      }

      // Filtro por riesgo de stock
      if (riesgoStockFilter !== "Todos") {
        switch (riesgoStockFilter) {
          case "critico":
            if (!producto.stockCritico && producto.cantidad >= 0) return false;
            break;
          case "bajo":
            if (producto.cantidad >= 50 || producto.cantidad < 0) return false;
            break;
          case "normal":
            if (producto.cantidad < 50) return false;
            break;
        }
      }

      return true;
    });
  }, [productosProyeccion, metricasFilter, riesgoStockFilter]);

  return (
    <>
      <Head>
        <title>Vista Previa - Gestión de Ingresos</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, pb: 2, minHeight: '100vh', bgcolor: 'grey.50' }}>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {/* Botón de volver */}
          <Button 
            onClick={() => router.back()} 
            sx={{ mb: 2 }}
            variant="outlined"
          >
            ← Volver
          </Button>
          


          {/* Dashboard de métricas mejorado */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card 
                sx={{ 
                  bgcolor: 'error.main', 
                  color: 'error.contrastText',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.02)' }
                }}
                onClick={() => setRiesgoStockFilter(riesgoStockFilter === 'critico' ? 'Todos' : 'critico')}
              >
                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                  <ErrorIcon sx={{ fontSize: 24, mb: 0.5 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
                    {alertas.stockCritico}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Stock Crítico
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card 
                sx={{ 
                  bgcolor: 'warning.main', 
                  color: 'warning.contrastText',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.02)' }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                  <WarningIcon sx={{ fontSize: 24, mb: 0.5 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
                    {alertas.pedidosAtrasados}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Pedidos Atrasados
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card 
                sx={{ 
                  bgcolor: 'info.main', 
                  color: 'info.contrastText',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.02)' }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                  <LocalShippingIcon sx={{ fontSize: 24, mb: 0.5 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
                    {alertas.proximosPedidos}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Próximos Pedidos
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card 
                sx={{ 
                  bgcolor: 'success.main', 
                  color: 'success.contrastText',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.02)' }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                  <InventoryIcon sx={{ fontSize: 24, mb: 0.5 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
                    {productosProyeccion.length - alertas.stockCritico}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Stock Normal
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Controles y filtros */}
          <Stack spacing={2} direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            {/* Filtros */}
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Filtrar por Métricas</InputLabel>
                <Select
                  value={metricasFilter}
                  label="Filtrar por Métricas"
                  onChange={(e) => setMetricasFilter(e.target.value)}
                >
                  <MenuItem value="Todos">📊 Todos los productos</MenuItem>
                  <MenuItem value="stockCritico">🔴 Stock crítico</MenuItem>
                  <MenuItem value="sinStock">⚠️ Sin stock</MenuItem>
                  <MenuItem value="conPedidos">📦 Con pedidos pendientes</MenuItem>
                  <MenuItem value="sinPedidos">❌ Sin pedidos</MenuItem>
                  <MenuItem value="conFaltantes">⏱️ Con días sin stock</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Riesgo de Stock</InputLabel>
                <Select
                  value={riesgoStockFilter}
                  label="Riesgo de Stock"
                  onChange={(e) => setRiesgoStockFilter(e.target.value)}
                >
                  <MenuItem value="Todos">Todos</MenuItem>
                  <MenuItem value="critico">Crítico</MenuItem>
                  <MenuItem value="bajo">Bajo</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                color="secondary"
                onClick={recalcularProyeccion}
                disabled={isRecalculando}
                startIcon={isRecalculando ? <InventoryIcon className="spin" /> : <InventoryIcon />}
                sx={{
                  '& .spin': {
                    animation: 'spin 1s linear infinite',
                  },
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  }
                }}
              >
                {isRecalculando ? "Calculando..." : "Recalcular Proyección"}
              </Button>
            </Stack>

            {/* Acciones principales */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              {/* Navegación */}
              <Button
                variant="outlined"
                color="primary"
                onClick={() => router.push('/celulandia/proyecciones/pedidos-mock')}
                startIcon={<LocalShippingIcon />}
                size="medium"
              >
                Ir a Gestión de Pedidos
              </Button>

              {/* Acciones principales */}
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    // Pre-cargar productos seleccionados
                    const productosPreCargados = productosSeleccionados.map(p => ({
                      productoId: p._id,
                      codigo: p.codigo,
                      descripcion: p.descripcion,
                      cantidad: 0 // Sin cantidad inicial, el usuario debe ingresarla
                    }));
                    setProductosEnPedido(productosPreCargados);
                    setIsNuevoPedidoOpen(true);
                  }}
                  startIcon={<EditIcon />}
                  size="medium"
                >
                  Crear Pedido
                </Button>

                <Button
                  variant="contained"
                  color="success"
                  startIcon={<FileDownloadIcon />}
                  onClick={() => alert("Función de exportar con nuevos campos implementada!")}
                  size="medium"
                >
                  Exportar Excel
                </Button>
              </Stack>

              {/* Acciones para productos seleccionados */}
              {selectedKeys.size > 0 && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    {selectedKeys.size} seleccionado(s):
                  </Typography>
                  
                  <Button
                    variant="contained"
                    color="info"
                    onClick={() => setIsPedidosOpen(true)}
                    startIcon={<LocalShippingIcon />}
                    size="small"
                  >
                    Gestionar Pedidos
                  </Button>

                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={(event) => setMenuAnchorEl(event.currentTarget)}
                    endIcon={<MoreVertIcon />}
                    size="small"
                  >
                    Más Acciones
                  </Button>
                </Stack>
              )}
            </Stack>
          </Stack>

          {/* Menú de acciones para productos seleccionados */}
          <Menu
            anchorEl={menuAnchorEl}
            open={menuOpen}
            onClose={() => setMenuAnchorEl(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem 
              onClick={() => {
                setTagAction("add");
                setIsTagModalOpen(true);
                setMenuAnchorEl(null);
              }}
            >
              <ListItemIcon>
                <LabelIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText>Agregar Tag</ListItemText>
            </MenuItem>
            
            <MenuItem 
              onClick={() => {
                setTagAction("remove");
                setIsTagModalOpen(true);
                setMenuAnchorEl(null);
              }}
            >
              <ListItemIcon>
                <LabelOffIcon fontSize="small" color="warning" />
              </ListItemIcon>
              <ListItemText>Eliminar Tag</ListItemText>
            </MenuItem>
            
            <Divider />
            
            <MenuItem 
              onClick={() => {
                eliminarSeleccionados();
                setMenuAnchorEl(null);
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Eliminar Productos ({selectedKeys.size})</ListItemText>
            </MenuItem>
          </Menu>

          {/* Información de filtros */}
          {(metricasFilter !== "Todos" || riesgoStockFilter !== "Todos") && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Mostrando {productosFiltrados.length} de {productosProyeccion.length} productos
              {metricasFilter !== "Todos" && ` • Filtro: ${metricasFilter}`}
              {riesgoStockFilter !== "Todos" && ` • Riesgo: ${riesgoStockFilter}`}
            </Alert>
          )}

          {/* Tabla principal */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Checkbox 
                      indeterminate={someSelected} 
                      checked={allSelected} 
                      onChange={toggleSelectAll} 
                    />
                  </TableCell>
                  <TableCell>Código</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell>Stock Actual</TableCell>
                  <TableCell>Stock Proyectado</TableCell>
                  <TableCell>Ventas Período</TableCell>
                  <TableCell>Días p/Agotar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productosFiltrados.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedKeys.has(item._id)} 
                        onChange={() => toggleRow(item._id)} 
                      />
                    </TableCell>
                    <TableCell>{item.codigo}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">{item.descripcion}</Typography>
                        {item.tienePedidosRetrasos && (
                          <Tooltip title="Pedidos con retrasos">
                            <WarningIcon color="warning" fontSize="small" />
                          </Tooltip>
                        )}
                        {item.stockCritico && (
                          <Tooltip title="Stock crítico">
                            <ErrorIcon color="error" fontSize="small" />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {!item.tags || item.tags.length === 0 ? "-" : (
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
                          {item.tags.map((t, idx) => (
                            <Chip key={idx} label={t} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          color: item.cantidad < 0 ? "error.main" : item.cantidad < 50 ? "warning.main" : "success.main",
                          fontWeight: item.cantidad < 0 ? "bold" : "normal",
                        }}
                      >
                        {item.cantidad.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="column" spacing={0.5}>
                        <Typography variant="body2" color={item.stockProyectado < 0 ? "error" : "success"}>
                          {item.stockProyectado.toLocaleString()}
                        </Typography>
                        {(item.stockProyectado - item.cantidad) > 0 && (
                          <Typography variant="caption" color="info.main">
                            (+{(item.stockProyectado - item.cantidad).toLocaleString()} en pedidos)
                          </Typography>
                        )}
                        {item.proximoPedido && (
                          <Stack direction="column" spacing={0.3}>
                            <Typography variant="caption" color="text.secondary">
                              Próximo: {dayjs(item.proximoPedido.fecha).format("DD/MM")} 
                              ({item.proximoPedido.cantidad.toLocaleString()} uds)
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.proximoPedido.numeroPedido} - {item.proximoPedido.proveedor}
                            </Typography>
                            {item.proximoPedido.contenedor && (
                              <Typography variant="caption" color="primary.main">
                                📦 {item.proximoPedido.contenedor}
                              </Typography>
                            )}
                          </Stack>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="column" spacing={0.3}>
                        <Typography variant="body2">
                          {item.ventasPeriodo.toLocaleString()}
                        </Typography>
                        {item.diasSinStockEnPeriodo > 0 && (
                          <Typography variant="caption" color="warning.main">
                            ⚠️ {item.diasSinStockEnPeriodo} días sin stock
                          </Typography>
                        )}
                        {item.diasSinStockEnPeriodo === 0 && (
                          <Typography variant="caption" color="success.main">
                            ✅ Sin faltantes
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          color: item.diasSinStock === 0 ? "error.main" : item.diasSinStock < 30 ? "warning.main" : "success.main",
                          fontWeight: item.diasSinStock < 30 ? "bold" : "normal",
                        }}
                      >
                        {item.diasSinStock === 0 ? "Agotado" : `${item.diasSinStock} días`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Box>

      {/* Modal de Gestión de Pedidos */}
      <Dialog open={isPedidosOpen} onClose={() => setIsPedidosOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Gestión de Pedidos de Material</Typography>
            <IconButton onClick={() => setIsPedidosOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
            <Tab label="Pedidos Pendientes" />
            <Tab label="Historial" />
          </Tabs>

          {tabValue === 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Pedidos Pendientes
              </Typography>
              
              {pedidos.filter(p => p.estado !== 'recibido').map((pedido) => (
                <Card key={pedido._id} sx={{ mb: 2 }} variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">{pedido.numeroPedido}</Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip 
                            size="small" 
                            label={pedido.estado.replace('_', ' ')}
                            color={getPedidoStatusColor(pedido.estado)}
                            icon={getPedidoStatusIcon(pedido.estado)}
                          />
                          {pedido.estado === 'pedido' && (
                            <Button 
                              size="small" 
                              variant="contained" 
                              color="info"
                              onClick={() => {
                                setPedidoParaContenedor(pedido);
                                setIsContenedorOpen(true);
                              }}
                            >
                              Marcar en Envío
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <Typography variant="caption" color="text.secondary">Proveedor</Typography>
                          <Typography variant="body2">{pedido.proveedor}</Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="caption" color="text.secondary">Fecha Estimada</Typography>
                          <Typography variant="body2">{dayjs(pedido.fechaEstimada).format("DD/MM/YYYY")}</Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="caption" color="text.secondary">Contenedor</Typography>
                          <Typography variant="body2">{pedido.contenedor || "Sin asignar"}</Typography>
                        </Grid>
                      </Grid>

                      <Box>
                        <Typography variant="caption" color="text.secondary">Productos en el pedido:</Typography>
                        <Stack spacing={1} sx={{ mt: 1 }}>
                          {pedido.productos.map((producto, idx) => (
                            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
                              <Typography variant="body2">
                                {producto.codigo} - {producto.descripcion}
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {producto.cantidad.toLocaleString()} uds
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>

                      {pedido.comentarios && (
                        <Typography variant="caption" color="text.secondary">
                          Comentarios: "{pedido.comentarios}"
                        </Typography>
                      )}

                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined">Editar Pedido</Button>
                        <Button size="small" variant="contained" color="success">
                          Marcar Recibido
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Historial de Pedidos
              </Typography>
              <Alert severity="info">
                Aquí se mostraría el historial completo de todos los pedidos de material,
                con filtros por fecha, proveedor, estado y contenedor.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPedidosOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Asignar Contenedor */}
      <Dialog open={isContenedorOpen} onClose={() => setIsContenedorOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <LocalShippingIcon color="primary" />
            <Typography variant="h6">Asignar Contenedor y Marcar en Envío</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {pedidoParaContenedor && (
              <>
                {/* Información del pedido */}
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'primary.light' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="primary.contrastText">Número de Pedido</Typography>
                      <Typography variant="h6" color="primary.contrastText">
                        {pedidoParaContenedor.numeroPedido}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="primary.contrastText">Proveedor</Typography>
                      <Typography variant="body1" color="primary.contrastText">
                        {pedidoParaContenedor.proveedor}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" color="primary.contrastText">Fecha Estimada</Typography>
                      <Typography variant="body1" color="primary.contrastText">
                        {dayjs(pedidoParaContenedor.fechaEstimada).format("DD/MM/YYYY")}
                      </Typography>
                    </Grid>
                  </Grid>
                </Card>

                {/* Campo del contenedor */}
                <Box>
                  <Typography variant="h6" gutterBottom>
                    🚢 Información del Contenedor
                  </Typography>
                  <TextField
                    fullWidth
                    label="Número de Contenedor"
                    value={contenedorNuevo}
                    onChange={(e) => setContenedorNuevo(e.target.value.toUpperCase())}
                    placeholder="Ej: TCLU123456, MSCU7890123"
                    helperText="Ingrese el número del contenedor para el seguimiento logístico"
                    sx={{ mb: 2 }}
                  />
                  
                  <Alert severity="info">
                    Al asignar el contenedor, el pedido cambiará automáticamente al estado "En Tránsito" 
                    y se podrá hacer seguimiento del mismo.
                  </Alert>
                </Box>

                {/* Lista de productos */}
                <Box>
                  <Typography variant="h6" gutterBottom>
                    📦 Productos en el Contenedor
                  </Typography>
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
                        {pedidoParaContenedor.productos.map((producto, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {producto.codigo}
                              </Typography>
                            </TableCell>
                            <TableCell>{producto.descripcion}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold">
                                {producto.cantidad.toLocaleString()} uds
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="success.contrastText">
                      <strong>Total:</strong> {pedidoParaContenedor.productos.length} tipos de productos, {' '}
                      {pedidoParaContenedor.productos.reduce((sum, p) => sum + p.cantidad, 0).toLocaleString()} unidades totales
                    </Typography>
                  </Box>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsContenedorOpen(false);
            setContenedorNuevo("");
            setPedidoParaContenedor(null);
          }}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color="success"
            onClick={() => {
              if (pedidoParaContenedor && contenedorNuevo) {
                marcarPedidoEnTransito(pedidoParaContenedor._id, contenedorNuevo);
                alert(`✅ Pedido ${pedidoParaContenedor.numeroPedido} marcado en envío\n🚢 Contenedor: ${contenedorNuevo}\n📍 Estado: En Tránsito`);
                setIsContenedorOpen(false);
                setContenedorNuevo("");
                setPedidoParaContenedor(null);
              }
            }}
            disabled={!contenedorNuevo}
            startIcon={<LocalShippingIcon />}
          >
            Confirmar Envío
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Gestión de Tags */}
      <Dialog open={isTagModalOpen} onClose={() => setIsTagModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            {tagAction === "add" ? <AddIcon color="primary" /> : <DeleteIcon color="warning" />}
            <Typography variant="h6">
              {tagAction === "add" ? "Agregar Tag a Productos Seleccionados" : "Eliminar Tag de Productos Seleccionados"}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              Esta acción afectará a {selectedKeys.size} producto(s) seleccionado(s).
            </Alert>

            {tagAction === "add" ? (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Crear nuevo tag o seleccionar existente:
                </Typography>
                <TextField
                  fullWidth
                  label="Nuevo Tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Ej: Premium, Oferta, Descontinuado"
                  helperText="Ingrese el nombre del tag que desea agregar"
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="subtitle2" gutterBottom>
                  Tags existentes (click para seleccionar):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {obtenerTagsDisponibles().map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      variant="outlined"
                      clickable
                      onClick={() => setNewTag(tag)}
                      color={newTag === tag ? "primary" : "default"}
                    />
                  ))}
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Seleccione el tag a eliminar:
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Tag a eliminar</InputLabel>
                  <Select
                    value={selectedTag}
                    label="Tag a eliminar"
                    onChange={(e) => setSelectedTag(e.target.value)}
                  >
                    {obtenerTagsDisponibles().map((tag) => (
                      <MenuItem key={tag} value={tag}>
                        {tag}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Preview de productos afectados */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Productos que serán afectados:
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                {productosSeleccionados.map((producto) => (
                  <Box key={producto._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2">
                      {producto.codigo} - {producto.descripcion}
                    </Typography>
                    <Box>
                      {producto.tags && producto.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ ml: 0.5 }} />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsTagModalOpen(false);
            setNewTag("");
            setSelectedTag("");
          }}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color={tagAction === "add" ? "primary" : "warning"}
            onClick={() => {
              if (tagAction === "add" && newTag) {
                agregarTagASeleccionados(newTag);
                setIsTagModalOpen(false);
                setNewTag("");
              } else if (tagAction === "remove" && selectedTag) {
                eliminarTagDeSeleccionados(selectedTag);
                setIsTagModalOpen(false);
                setSelectedTag("");
              }
            }}
            disabled={tagAction === "add" ? !newTag : !selectedTag}
            startIcon={tagAction === "add" ? <AddIcon /> : <DeleteIcon />}
          >
            {tagAction === "add" ? "Agregar Tag" : "Eliminar Tag"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Crear Nuevo Pedido */}
      <Dialog open={isNuevoPedidoOpen} onClose={() => setIsNuevoPedidoOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Crear Nuevo Pedido</Typography>
            <IconButton onClick={() => {
              setIsNuevoPedidoOpen(false);
              limpiarFormularioPedido();
            }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {/* Información del Pedido */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              📋 Información del Pedido
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Número de Pedido"
                  value={numeroPedido}
                  onChange={(e) => setNumeroPedido(e.target.value)}
                  placeholder="Ej: PED-2025-004"
                  helperText="Ingrese el número de pedido proporcionado por el proveedor"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Proveedor"
                  value={proveedorPedido}
                  onChange={(e) => setProveedorPedido(e.target.value)}
                  placeholder="Ej: TechSupply Corp"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Fecha Estimada de Llegada"
                  type="date"
                  value={fechaEstimadaPedido}
                  onChange={(e) => setFechaEstimadaPedido(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Número de Contenedor (opcional)"
                  placeholder="Se puede asignar ahora o al marcar en envío"
                  helperText="Puede dejarse vacío y asignarse después"
                />
              </Grid>
            </Grid>
          </Box>

          {/* Agregar Productos */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              📦 Productos del Pedido
            </Typography>
            
            {/* Formulario para agregar producto */}
            <Card variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Agregar Producto Adicional
              </Typography>
              {selectedKeys.size > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Los productos seleccionados en la tabla principal ya fueron pre-cargados. 
                  Puede agregar productos adicionales aquí.
                </Alert>
              )}
              <Grid container spacing={2} alignItems="end">
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Producto</InputLabel>
                    <Select
                      value={productoSeleccionado}
                      label="Producto"
                      onChange={(e) => setProductoSeleccionado(e.target.value)}
                    >
                      {productosProyeccion.map((producto) => (
                        <MenuItem key={producto._id} value={producto._id}>
                          {producto.codigo} - {producto.descripcion}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Cantidad"
                    type="number"
                    value={cantidadProducto}
                    onChange={(e) => setCantidadProducto(e.target.value)}
                    placeholder="0"
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={agregarProductoAPedido}
                    disabled={!productoSeleccionado || !cantidadProducto}
                    startIcon={<AddIcon />}
                  >
                    Agregar
                  </Button>
                </Grid>
              </Grid>
            </Card>

            {/* Lista de productos agregados */}
            {productosEnPedido.length > 0 ? (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Productos en el pedido ({productosEnPedido.length}):
                  {selectedKeys.size > 0 && (
                    <Chip size="small" label={`${selectedKeys.size} pre-cargados`} color="info" sx={{ ml: 1 }} />
                  )}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Código</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell align="center">Cantidad</TableCell>
                        <TableCell align="center">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {productosEnPedido.map((producto, index) => (
                        <TableRow key={index} sx={{ 
                          bgcolor: producto.cantidad === 0 ? 'warning.light' : 'inherit' 
                        }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {producto.codigo}
                            </Typography>
                          </TableCell>
                          <TableCell>{producto.descripcion}</TableCell>
                          <TableCell align="center">
                            <TextField
                              size="small"
                              type="number"
                              value={producto.cantidad}
                              onChange={(e) => actualizarCantidadProducto(producto.productoId, e.target.value)}
                              inputProps={{ min: 0, style: { textAlign: 'center' } }}
                              sx={{ width: 100 }}
                              error={producto.cantidad === 0}
                              helperText={producto.cantidad === 0 ? "Requerido" : ""}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removerProductoDePedido(producto.productoId)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Resumen */}
                <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="info.contrastText">
                    <strong>Total de productos:</strong> {productosEnPedido.length} tipos diferentes
                  </Typography>
                  <Typography variant="body2" color="info.contrastText">
                    <strong>Total de unidades:</strong> {productosEnPedido.reduce((sum, p) => sum + p.cantidad, 0).toLocaleString()} unidades
                  </Typography>
                  {productosEnPedido.some(p => p.cantidad === 0) && (
                    <Typography variant="body2" color="warning.contrastText" sx={{ mt: 1 }}>
                      ⚠️ Algunos productos no tienen cantidad asignada
                    </Typography>
                  )}
                </Box>
              </Box>
            ) : (
              <Alert severity="warning">
                No se han agregado productos al pedido. {selectedKeys.size > 0 ? 
                  "Seleccione productos en la tabla principal y haga clic en 'Crear Pedido' para pre-cargarlos." : 
                  "Agregue al menos un producto para continuar."
                }
              </Alert>
            )}
          </Box>

          {/* Comentarios */}
          <Box>
            <Typography variant="h6" gutterBottom>
              💬 Comentarios Adicionales
            </Typography>
            <TextField
              fullWidth
              label="Comentarios"
              multiline
              rows={3}
              value={comentariosPedido}
              onChange={(e) => setComentariosPedido(e.target.value)}
              placeholder="Notas adicionales sobre este pedido (urgencia, condiciones especiales, etc.)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsNuevoPedidoOpen(false);
            limpiarFormularioPedido();
          }}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              const productosValidos = productosEnPedido.filter(p => p.cantidad > 0);
              
              if (numeroPedido && proveedorPedido && fechaEstimadaPedido && productosValidos.length > 0) {
                const nuevoPedido = {
                  _id: `PED${Date.now()}`,
                  numeroPedido,
                  fechaPedido: new Date().toISOString().split('T')[0],
                  fechaEstimada: fechaEstimadaPedido,
                  estado: "pedido",
                  proveedor: proveedorPedido,
                  contenedor: null,
                  comentarios: comentariosPedido,
                  productos: productosValidos
                };
                
                setPedidos(prev => [...prev, nuevoPedido]);
                alert(`Pedido ${numeroPedido} creado exitosamente con ${productosValidos.length} productos!`);
                setIsNuevoPedidoOpen(false);
                limpiarFormularioPedido();
              } else {
                if (!numeroPedido || !proveedorPedido || !fechaEstimadaPedido) {
                  alert("Por favor complete todos los campos obligatorios (Número de pedido, Proveedor y Fecha estimada).");
                } else if (productosValidos.length === 0) {
                  alert("Por favor asigne cantidades válidas (mayores a 0) a al menos un producto.");
                }
              }
            }}
            disabled={
              !numeroPedido || 
              !proveedorPedido || 
              !fechaEstimadaPedido || 
              productosEnPedido.length === 0 ||
              productosEnPedido.filter(p => p.cantidad > 0).length === 0
            }
            startIcon={<AddIcon />}
          >
            Crear Pedido
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

ProyeccionMockPage.getLayout = (page) => page;

export default ProyeccionMockPage;
