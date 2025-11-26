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

// Datos mock para pedidos - estructura simplificada sin estado
const mockPedidos = [
  {
    _id: "PED001",
    numeroPedido: "PED-2025-001",
    fechaPedido: "2025-11-01",
    fechaEstimadaLlegada: "2025-11-25",
    observaciones: "Reposición auriculares CLD - stock agotado",
    productos: [
      { productoId: "1", codigo: "A02CLD", descripcion: "AURICULAR 02 CLD", cantidad: 200 },
      { productoId: "9", codigo: "ACLDE", descripcion: "AURICULAR INALAMBRICO CLD ERGO", cantidad: 200 }
    ]
  },
  {
    _id: "PED002", 
    numeroPedido: "PED-2025-002",
    fechaPedido: "2025-11-10",
    fechaEstimadaLlegada: "2025-12-05",
    observaciones: "Restock navideño - auriculares populares",
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

// Datos mock de contenedores para la funcionalidad de agregar productos
const mockContenedores = [
  {
    _id: "CONT001",
    numero: "TCLU123456",
    estado: "en_transito",
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
    fechaUltimaModificacion: "2025-11-16T09:15:00Z",
    observaciones: "En tránsito hacia destino"
  }
];

// Tabla de relación muchos-a-muchos entre pedidos y contenedores
const mockPedidoContenedores = [
  {
    _id: "PC001",
    pedidoId: "PED001",
    contenedorId: "CONT001",
    fechaAsignacion: "2025-11-15",
    observaciones: "Asignación inicial"
  },
  {
    _id: "PC002",
    pedidoId: "PED002",
    contenedorId: "CONT001",
    fechaAsignacion: "2025-11-15",
    observaciones: "Pedido consolidado"
  },
  {
    _id: "PC003",
    pedidoId: "PED003",
    contenedorId: "CONT002",
    fechaAsignacion: "2025-11-12",
    observaciones: "Pedido completo"
  },
  {
    _id: "PC004",
    pedidoId: "PED004",
    contenedorId: "CONT003",
    fechaAsignacion: "2025-11-06",
    observaciones: "Ya recibido"
  }
];

const mockAlertas = {
  stockCritico: 4, // A02CLD, A5TA, ANBI15P, AW
  pedidosProximos: 8, // Pedidos próximos a llegar
  totalPedidos: 8 // Total de pedidos activos
};

function ProyeccionMockPage() {
  const router = useRouter();
  const [productosProyeccion, setProductosProyeccion] = useState(mockProductosProyeccion);
  const [pedidos, setPedidos] = useState(mockPedidos);
  const [contenedores, setContenedores] = useState(mockContenedores);
  const [pedidoContenedores, setPedidoContenedores] = useState(mockPedidoContenedores);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [alertas, setAlertas] = useState(mockAlertas);
  
  // Estados para modales
  const [isPedidosOpen, setIsPedidosOpen] = useState(false);

  const [isContenedorOpen, setIsContenedorOpen] = useState(false);
  const [pedidoParaContenedor, setPedidoParaContenedor] = useState(null);
  

  
  // Estados para formularios
  const [tabValue, setTabValue] = useState(0);
  const [contenedorNuevo, setContenedorNuevo] = useState("");
  

  
  // Estados para gestión de tags
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagAction, setTagAction] = useState(""); // "add" o "remove"
  const [newTag, setNewTag] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  
  // Estados para menú de acciones
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const menuOpen = Boolean(menuAnchorEl);

  // Estados para agregar productos a pedidos/contenedores
  const [isAgregarProductosOpen, setIsAgregarProductosOpen] = useState(false);
  const [tipoAgregar, setTipoAgregar] = useState("existente"); // "existente" o "nuevo"
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState("");
  const [contenedorSeleccionado, setContenedorSeleccionado] = useState("");
  const [nuevoPedidoData, setNuevoPedidoData] = useState({
    numero: "",
    fechaEstimada: "",
    observaciones: ""
  });
  const [nuevoContenedorData, setNuevoContenedorData] = useState({
    numero: "",
    fechaEstimada: "",
    observaciones: ""
  });





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

  // Funciones para agregar productos a pedidos/contenedores
  const obtenerProductosSeleccionados = () => {
    return productosProyeccion.filter(p => selectedKeys.has(p._id));
  };

  const obtenerContenedoresPorPedido = (pedidoId) => {
    const relacionesPedido = pedidoContenedores.filter(pc => pc.pedidoId === pedidoId);
    return relacionesPedido.map(rel => {
      const contenedor = contenedores.find(c => c._id === rel.contenedorId);
      return { ...contenedor, fechaAsignacion: rel.fechaAsignacion };
    }).filter(Boolean);
  };

  const agregarProductosAPedidoExistente = () => {
    if (!pedidoSeleccionado || selectedKeys.size === 0) return;

    const productosAgregar = obtenerProductosSeleccionados();
    const pedido = pedidos.find(p => p._id === pedidoSeleccionado);
    
    // Si se especifica crear un nuevo contenedor
    if (nuevoContenedorData.numero) {
      if (!nuevoContenedorData.fechaEstimada) {
        alert("⚠️ La fecha estimada es requerida para crear un nuevo contenedor");
        return;
      }
      const nuevoContenedor = {
        _id: `CONT${Date.now()}`,
        numero: nuevoContenedorData.numero,
        estado: "pendiente",
        fechaCreacion: new Date().toISOString().split('T')[0],
        fechaEstimada: nuevoContenedorData.fechaEstimada,
        fechaReal: null,
        fechaUltimaModificacion: new Date().toISOString(),
        observaciones: nuevoContenedorData.observaciones || "Creado desde proyecciones"
      };

      setContenedores(prev => [...prev, nuevoContenedor]);
      
      // Crear relación pedido-contenedor
      const nuevaRelacion = {
        _id: `PC${Date.now()}`,
        pedidoId: pedidoSeleccionado,
        contenedorId: nuevoContenedor._id,
        fechaAsignacion: new Date().toISOString().split('T')[0],
        observaciones: "Contenedor creado para productos desde proyecciones"
      };

      setPedidoContenedores(prev => [...prev, nuevaRelacion]);
      
      alert(`✅ ${productosAgregar.length} producto(s) agregados al nuevo contenedor ${nuevoContenedorData.numero} del pedido ${pedido.numeroPedido}`);
    }
    else if (contenedorSeleccionado) {
      // Agregar a contenedor existente (puede estar en otros pedidos)
      const contenedor = contenedores.find(c => c._id === contenedorSeleccionado);
      
      // Verificar si ya existe relación pedido-contenedor
      const relacionExiste = pedidoContenedores.some(pc => 
        pc.pedidoId === pedidoSeleccionado && pc.contenedorId === contenedorSeleccionado
      );
      
      if (!relacionExiste) {
        // Crear nueva relación pedido-contenedor
        const nuevaRelacion = {
          _id: `PC${Date.now()}`,
          pedidoId: pedidoSeleccionado,
          contenedorId: contenedorSeleccionado,
          fechaAsignacion: new Date().toISOString().split('T')[0],
          observaciones: "Asociación desde proyecciones"
        };

        setPedidoContenedores(prev => [...prev, nuevaRelacion]);
      }
      
      alert(`✅ ${productosAgregar.length} producto(s) agregados al contenedor ${contenedor.numero} (asociado al pedido ${pedido.numeroPedido})`);
    } else {
      // Agregar al pedido sin contenedor específico
      alert(`✅ ${productosAgregar.length} producto(s) agregados al pedido ${pedido.numeroPedido} (sin contenedor específico)`);
    }

    // Limpiar selección y cerrar modal
    setSelectedKeys(new Set());
    setIsAgregarProductosOpen(false);
    limpiarFormularioAgregarProductos();
  };

  const crearNuevoPedidoConProductos = () => {
    if (!nuevoPedidoData.numero || selectedKeys.size === 0) return;
    
    // Validar que hay contenedor (existente o nuevo)
    if (!contenedorSeleccionado && !nuevoContenedorData.numero) return;
    
    // Validar que si se crea nuevo contenedor, debe tener fecha estimada
    if (nuevoContenedorData.numero && !nuevoContenedorData.fechaEstimada) {
      alert("⚠️ La fecha estimada es requerida para crear un nuevo contenedor");
      return;
    }

    const productosAgregar = obtenerProductosSeleccionados();
    const nuevoPedido = {
      _id: `PED${Date.now()}`,
      numeroPedido: nuevoPedidoData.numero,
      fechaPedido: new Date().toISOString().split('T')[0],
      fechaEstimadaLlegada: contenedorSeleccionado ? 
        contenedores.find(c => c._id === contenedorSeleccionado)?.fechaEstimada :
        nuevoContenedorData.fechaEstimada,
      observaciones: nuevoPedidoData.observaciones,
      productos: productosAgregar.map(p => ({
        productoId: p._id,
        codigo: p.codigo,
        descripcion: p.descripcion,
        cantidad: 1 // Cantidad por defecto
      }))
    };

    setPedidos(prev => [...prev, nuevoPedido]);
    
    if (contenedorSeleccionado) {
      // Usar contenedor existente
      const contenedor = contenedores.find(c => c._id === contenedorSeleccionado);
      
      // Crear relación pedido-contenedor
      const nuevaRelacion = {
        _id: `PC${Date.now()}`,
        pedidoId: nuevoPedido._id,
        contenedorId: contenedorSeleccionado,
        fechaAsignacion: new Date().toISOString().split('T')[0],
        observaciones: "Nuevo pedido asociado a contenedor existente"
      };

      setPedidoContenedores(prev => [...prev, nuevaRelacion]);
      
      alert(`✅ Nuevo pedido ${nuevoPedidoData.numero} creado y asociado al contenedor existente ${contenedor.numero} con ${productosAgregar.length} producto(s)`);
    } else if (nuevoContenedorData.numero && nuevoContenedorData.fechaEstimada) {
      // Crear nuevo contenedor
      const nuevoContenedor = {
        _id: `CONT${Date.now()}`,
        numero: nuevoContenedorData.numero,
        estado: "pendiente",
        fechaCreacion: new Date().toISOString().split('T')[0],
        fechaEstimada: nuevoContenedorData.fechaEstimada,
        fechaReal: null,
        fechaUltimaModificacion: new Date().toISOString(),
        observaciones: nuevoContenedorData.observaciones || "Creado desde proyecciones"
      };

      setContenedores(prev => [...prev, nuevoContenedor]);
      
      // Crear relación pedido-contenedor
      const nuevaRelacion = {
        _id: `PC${Date.now()}`,
        pedidoId: nuevoPedido._id,
        contenedorId: nuevoContenedor._id,
        fechaAsignacion: new Date().toISOString().split('T')[0],
        observaciones: "Creado desde proyecciones"
      };

      setPedidoContenedores(prev => [...prev, nuevaRelacion]);
      
      alert(`✅ Nuevo pedido ${nuevoPedidoData.numero} y contenedor ${nuevoContenedorData.numero} creados con ${productosAgregar.length} producto(s)`);
    }

    // Limpiar y cerrar
    setSelectedKeys(new Set());
    setIsAgregarProductosOpen(false);
    limpiarFormularioAgregarProductos();
  };

  const limpiarFormularioAgregarProductos = () => {
    setPedidoSeleccionado("");
    setContenedorSeleccionado("");
    setNuevoPedidoData({ numero: "", fechaEstimada: "", observaciones: "" });
    setNuevoContenedorData({ numero: "", fechaEstimada: "", observaciones: "" });
    setTipoAgregar("existente");
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

            {/* Acciones */}
              <Button
                variant="contained"
                color="primary"
                onClick={() => window.location.href = '/celulandia/proyecciones/pedidos-mock'}
                startIcon={<LocalShippingIcon />}
              >
                Gestionar Pedidos
              </Button>

              <Button
                variant="outlined"
                color="success"
                startIcon={<FileDownloadIcon />}
                onClick={() => alert("Función de exportar implementada!")}
              >
                Exportar
              </Button>

              {/* Acciones para productos seleccionados */}
              {selectedKeys.size > 0 && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    {selectedKeys.size} seleccionado(s):
                  </Typography>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setIsAgregarProductosOpen(true)}
                    startIcon={<AddIcon />}
                    size="small"
                  >
                    Agregar a Pedido
                  </Button>

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

          {/* Tabla de productos */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedKeys.size > 0 && selectedKeys.size < productosProyeccion.length}
                      checked={selectedKeys.size === productosProyeccion.length}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedKeys(new Set(productosProyeccion.map(p => p._id)));
                        } else {
                          setSelectedKeys(new Set());
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>Código</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell align="center">Stock Actual</TableCell>
                  <TableCell align="center">Stock Proyectado</TableCell>
                  <TableCell align="center">Ventas Período</TableCell>
                  <TableCell align="center">Días sin Stock</TableCell>
                  <TableCell>Observaciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productosProyeccion.map((producto) => (
                  <TableRow 
                    key={producto._id}
                    selected={selectedKeys.has(producto._id)}
                    onClick={() => {
                      const newSelectedKeys = new Set(selectedKeys);
                      if (newSelectedKeys.has(producto._id)) {
                        newSelectedKeys.delete(producto._id);
                      } else {
                        newSelectedKeys.add(producto._id);
                      }
                      setSelectedKeys(newSelectedKeys);
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox checked={selectedKeys.has(producto._id)} />
                    </TableCell>
                    <TableCell>{producto.codigo}</TableCell>
                    <TableCell>{producto.descripcion}</TableCell>
                    <TableCell align="center">{producto.cantidad}</TableCell>
                    <TableCell align="center">{producto.stockProyectado}</TableCell>
                    <TableCell align="center">{producto.ventasPeriodo}</TableCell>
                    <TableCell align="center">{producto.diasSinStock}</TableCell>
                    <TableCell>{producto.anotaciones}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Box>

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
              
              {pedidos.map((pedido) => (
                <Card key={pedido._id} sx={{ mb: 2 }} variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">{pedido.numeroPedido}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Creado: {dayjs(pedido.fechaPedido).format("DD/MM/YYYY")}
                        </Typography>
                      </Stack>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" color="text.secondary">Fecha Estimada de Llegada</Typography>
                          <Typography variant="body2">{dayjs(pedido.fechaEstimadaLlegada || pedido.fechaEstimada).format("DD/MM/YYYY")}</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" color="text.secondary">Observaciones</Typography>
                          <Typography variant="body2">{pedido.observaciones || pedido.comentarios || "Sin observaciones"}</Typography>
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

      {/* Modal para Agregar Productos a Pedidos/Contenedores */}
      <Dialog open={isAgregarProductosOpen} onClose={() => {
        setIsAgregarProductosOpen(false);
        limpiarFormularioAgregarProductos();
      }} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              Agregar Productos ({selectedKeys.size} seleccionados)
            </Typography>
            <IconButton onClick={() => {
              setIsAgregarProductosOpen(false);
              limpiarFormularioAgregarProductos();
            }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {/* Productos seleccionados */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              📦 Productos a agregar:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {obtenerProductosSeleccionados().map(producto => (
                <Chip 
                  key={producto._id}
                  label={`${producto.codigo} - ${producto.descripcion}`}
                  variant="outlined"
                  size="small"
                />
              ))}
            </Stack>
          </Box>

          {/* Tabs para seleccionar tipo de acción */}
          <Tabs value={tipoAgregar === "existente" ? 0 : 1} onChange={(e, newValue) => {
            setTipoAgregar(newValue === 0 ? "existente" : "nuevo");
          }} sx={{ mb: 3 }}>
            <Tab label="Agregar a Pedido Existente" />
            <Tab label="Crear Nuevo Pedido" />
          </Tabs>

          {tipoAgregar === "existente" ? (
            // Agregar a pedido existente
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Seleccionar Pedido</InputLabel>
                    <Select
                      value={pedidoSeleccionado}
                      label="Seleccionar Pedido"
                      onChange={(e) => {
                        setPedidoSeleccionado(e.target.value);
                        setContenedorSeleccionado(""); // Reset contenedor
                      }}
                    >
                      {pedidos.map((pedido) => (
                        <MenuItem key={pedido._id} value={pedido._id}>
                          <Stack>
                            <Typography variant="body2" fontWeight="bold">
                              {pedido.numeroPedido}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Creado: {pedido.fechaPedido} | Llegada: {pedido.fechaEstimadaLlegada}
                            </Typography>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                {pedidoSeleccionado && (
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Contenedor (Opcional)</InputLabel>
                      <Select
                        value={contenedorSeleccionado}
                        label="Contenedor (Opcional)"
                        onChange={(e) => setContenedorSeleccionado(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>Sin contenedor específico</em>
                        </MenuItem>
                        {obtenerContenedoresPorPedido(pedidoSeleccionado).map((contenedor) => (
                          <MenuItem key={contenedor._id} value={contenedor._id}>
                            <Stack>
                              <Typography variant="body2" fontWeight="bold">
                                {contenedor.numero}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Estado: {contenedor.estado} | Fecha: {contenedor.fechaEstimada}
                              </Typography>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>
            </Box>
          ) : (
            // Crear nuevo pedido
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                📋 Información del Nuevo Pedido
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Número de Pedido *"
                    value={nuevoPedidoData.numero}
                    onChange={(e) => setNuevoPedidoData(prev => ({
                      ...prev,
                      numero: e.target.value
                    }))}
                    placeholder="Ej: PED-2025-019"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Fecha Estimada *"
                    type="date"
                    value={nuevoPedidoData.fechaEstimada}
                    onChange={(e) => setNuevoPedidoData(prev => ({
                      ...prev,
                      fechaEstimada: e.target.value
                    }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Observaciones"
                    multiline
                    rows={2}
                    value={nuevoPedidoData.observaciones}
                    onChange={(e) => setNuevoPedidoData(prev => ({
                      ...prev,
                      observaciones: e.target.value
                    }))}
                    placeholder="Notas adicionales sobre el pedido..."
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                📦 Contenedor (Opcional)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Número de Contenedor"
                    value={nuevoContenedorData.numero}
                    onChange={(e) => setNuevoContenedorData(prev => ({
                      ...prev,
                      numero: e.target.value
                    }))}
                    placeholder="Ej: TCLU123456"
                    helperText="Opcional - puede crearse después"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Fecha Estimada Contenedor"
                    type="date"
                    value={nuevoContenedorData.fechaEstimada}
                    onChange={(e) => setNuevoContenedorData(prev => ({
                      ...prev,
                      fechaEstimada: e.target.value
                    }))}
                    InputLabelProps={{ shrink: true }}
                    helperText="Si no se especifica, usa la del pedido"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Observaciones del Contenedor"
                    value={nuevoContenedorData.observaciones}
                    onChange={(e) => setNuevoContenedorData(prev => ({
                      ...prev,
                      observaciones: e.target.value
                    }))}
                    placeholder="Notas sobre el contenedor..."
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsAgregarProductosOpen(false);
            limpiarFormularioAgregarProductos();
          }}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={tipoAgregar === "existente" ? agregarProductosAPedidoExistente : crearNuevoPedidoConProductos}
            disabled={
              tipoAgregar === "existente" 
                ? !pedidoSeleccionado 
                : !nuevoPedidoData.numero || !nuevoPedidoData.fechaEstimada
            }
            startIcon={<AddIcon />}
          >
            {tipoAgregar === "existente" ? "Agregar a Pedido" : "Crear Pedido"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Agregar Productos a Pedidos/Contenedores */}
      <Dialog open={isAgregarProductosOpen} onClose={() => {
        setIsAgregarProductosOpen(false);
        limpiarFormularioAgregarProductos();
      }} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Agregar Productos a Pedido/Contenedor</Typography>
            <IconButton onClick={() => {
              setIsAgregarProductosOpen(false);
              limpiarFormularioAgregarProductos();
            }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {/* Mostrar productos seleccionados */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              📦 Productos a agregar ({selectedKeys.size}):
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {obtenerProductosSeleccionados().map(producto => (
                <Chip 
                  key={producto._id}
                  label={`${producto.codigo} - ${producto.descripcion}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Tabs para elegir método */}
          <Tabs 
            value={tipoAgregar} 
            onChange={(e, newValue) => setTipoAgregar(newValue)}
            sx={{ mb: 3 }}
          >
            <Tab label="Pedido Existente" value="existente" />
            <Tab label="Crear Nuevo Pedido" value="nuevo" />
          </Tabs>

          {tipoAgregar === "existente" ? (
            <Box>
              {/* Seleccionar pedido existente */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Seleccionar Pedido</InputLabel>
                    <Select
                      value={pedidoSeleccionado}
                      label="Seleccionar Pedido"
                      onChange={(e) => {
                        setPedidoSeleccionado(e.target.value);
                        setContenedorSeleccionado(""); // Reset contenedor
                      }}
                    >
                      {pedidos.map(pedido => (
                        <MenuItem key={pedido._id} value={pedido._id}>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {pedido.numeroPedido}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Estado: {pedido.estado} | Creado: {pedido.fechaPedido}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Selección de contenedor */}
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Contenedor (opcional):
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Contenedor Existente</InputLabel>
                    <Select
                      value={contenedorSeleccionado}
                      label="Contenedor Existente"
                      onChange={(e) => setContenedorSeleccionado(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Sin contenedor específico</em>
                      </MenuItem>
                      {contenedores.filter(c => c.estado !== "recibido").map(contenedor => {
                        const pedidosAsociados = pedidoContenedores
                          .filter(pc => pc.contenedorId === contenedor._id)
                          .map(pc => pedidos.find(p => p._id === pc.pedidoId))
                          .filter(Boolean)
                          .map(p => p.numeroPedido);

                        return (
                          <MenuItem key={contenedor._id} value={contenedor._id}>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {contenedor.numero}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Estado: {contenedor.estado} | Fecha: {contenedor.fechaEstimada}
                                {pedidosAsociados.length > 0 && (
                                  <><br />Pedidos: {pedidosAsociados.join(", ")}</>
                                )}
                              </Typography>
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="O crear nuevo contenedor"
                    placeholder="Ej: TCLU789456"
                    value={nuevoContenedorData.numero}
                    onChange={(e) => setNuevoContenedorData(prev => ({
                      ...prev,
                      numero: e.target.value
                    }))}
                    helperText="Solo ingrese el número para crear contenedor"
                  />
                </Grid>

                {nuevoContenedorData.numero && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Fecha Estimada del Contenedor"
                        type="date"
                        value={nuevoContenedorData.fechaEstimada}
                        onChange={(e) => setNuevoContenedorData(prev => ({
                          ...prev,
                          fechaEstimada: e.target.value
                        }))}
                        InputLabelProps={{ shrink: true }}
                        required
                        helperText="Fecha estimada de llegada del contenedor (requerida)"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Observaciones del Contenedor"
                        value={nuevoContenedorData.observaciones}
                        onChange={(e) => setNuevoContenedorData(prev => ({
                          ...prev,
                          observaciones: e.target.value
                        }))}
                        placeholder="Observaciones opcionales"
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          ) : (
            <Box>
              {/* Crear nuevo pedido */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Número de Pedido"
                    value={nuevoPedidoData.numero}
                    onChange={(e) => setNuevoPedidoData(prev => ({
                      ...prev,
                      numero: e.target.value
                    }))}
                    placeholder="Ej: PED-2025-020"
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Observaciones del Pedido"
                    value={nuevoPedidoData.observaciones}
                    onChange={(e) => setNuevoPedidoData(prev => ({
                      ...prev,
                      observaciones: e.target.value
                    }))}
                    placeholder="Observaciones opcionales"
                  />
                </Grid>
              </Grid>

              {/* Contenedor para el nuevo pedido */}
              <Typography variant="subtitle2" gutterBottom>
                Contenedor:
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Contenedor Existente</InputLabel>
                    <Select
                      value={contenedorSeleccionado}
                      label="Contenedor Existente"
                      onChange={(e) => {
                        setContenedorSeleccionado(e.target.value);
                        if (e.target.value) {
                          setNuevoContenedorData({ numero: "", fechaEstimada: "", observaciones: "" });
                        }
                      }}
                    >
                      <MenuItem value="">
                        <em>Crear nuevo contenedor</em>
                      </MenuItem>
                      {contenedores.filter(c => c.estado !== "recibido").map(contenedor => {
                        const pedidosAsociados = pedidoContenedores
                          .filter(pc => pc.contenedorId === contenedor._id)
                          .map(pc => pedidos.find(p => p._id === pc.pedidoId))
                          .filter(Boolean)
                          .map(p => p.numeroPedido);

                        return (
                          <MenuItem key={contenedor._id} value={contenedor._id}>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {contenedor.numero}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Estado: {contenedor.estado} | Fecha: {contenedor.fechaEstimada}
                                {pedidosAsociados.length > 0 && (
                                  <><br />Pedidos: {pedidosAsociados.join(", ")}</>
                                )}
                              </Typography>
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Grid>

                {!contenedorSeleccionado && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Número de Nuevo Contenedor"
                        value={nuevoContenedorData.numero}
                        onChange={(e) => setNuevoContenedorData(prev => ({
                          ...prev,
                          numero: e.target.value
                        }))}
                        placeholder="Ej: TCLU789456"
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Fecha Estimada del Contenedor"
                        type="date"
                        value={nuevoContenedorData.fechaEstimada}
                        onChange={(e) => setNuevoContenedorData(prev => ({
                          ...prev,
                          fechaEstimada: e.target.value
                        }))}
                        InputLabelProps={{ shrink: true }}
                        required
                        helperText="Fecha estimada de llegada del contenedor"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Observaciones del Contenedor"
                        value={nuevoContenedorData.observaciones}
                        onChange={(e) => setNuevoContenedorData(prev => ({
                          ...prev,
                          observaciones: e.target.value
                        }))}
                        placeholder="Observaciones opcionales"
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsAgregarProductosOpen(false);
            limpiarFormularioAgregarProductos();
          }}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={tipoAgregar === "existente" ? agregarProductosAPedidoExistente : crearNuevoPedidoConProductos}
            disabled={
              selectedKeys.size === 0 ||
              (tipoAgregar === "existente" && (
                !pedidoSeleccionado || 
                (nuevoContenedorData.numero && !nuevoContenedorData.fechaEstimada)
              )) ||
              (tipoAgregar === "nuevo" && (
                !nuevoPedidoData.numero || 
                (!contenedorSeleccionado && (!nuevoContenedorData.numero || !nuevoContenedorData.fechaEstimada))
              ))
            }
            startIcon={<AddIcon />}
          >
            {tipoAgregar === "existente" ? "Agregar a Pedido" : "Crear y Agregar"}
          </Button>
        </DialogActions>
      </Dialog>


    </>
  );
}

ProyeccionMockPage.getLayout = (page) => page;

export default ProyeccionMockPage;
