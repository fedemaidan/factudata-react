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
  CircularProgress,
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
  TrendingUp as TrendingUpIcon,
  FilterList as FilterListIcon,
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
  }
];

// Datos mock basados en el Excel proporcionado - productos de electrónicos y accesorios
const mockProductosProyeccion = [
  {
    _id: "1",
    codigo: "A02CLD",
    descripcion: "AURICULAR 02 CLD",
    tags: ["ARTICULOS PARA REPOSICION"],
    cantidad: 0,
    stockProyectado: 200,
    ventasPeriodo: 150,
    ventasProyectadas: 350,
    diasSinStock: 15,
    diasSinStockEnPeriodo: 8,
    stockCritico: true,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-001",
      fecha: "2025-11-25",
      cantidad: 200,
      proveedor: "Tech Solutions",
      contenedor: "TCLU123456"
    }
  },
  {
    _id: "2",
    codigo: "A03CLD",
    descripcion: "AURICULAR 03 CLD",
    tags: ["ARTICULOS SIN REPOSICION"],
    cantidad: 45,
    stockProyectado: 245,
    ventasPeriodo: 89,
    ventasProyectadas: 200,
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
    }
  },
  {
    _id: "3",
    codigo: "A04CLD",
    descripcion: "AURICULAR 04 CLD PREMIUM",
    tags: ["ARTICULOS SIN REPOSICION"],
    cantidad: 25,
    stockProyectado: 125,
    ventasPeriodo: 45,
    ventasProyectadas: 120,
    diasSinStock: 45,
    diasSinStockEnPeriodo: 15,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-003",
      fecha: "2025-12-15",
      cantidad: 100,
      proveedor: "Premium Audio",
      contenedor: "TCLU789012"
    }
  },
  {
    _id: "4",
    codigo: "A05CLD",
    descripcion: "AURICULAR 05 CLD GAMER",
    tags: ["ARTICULOS PARA REPOSICION"],
    cantidad: 15,
    stockProyectado: 115,
    ventasPeriodo: 78,
    ventasProyectadas: 180,
    diasSinStock: 75,
    diasSinStockEnPeriodo: 25,
    stockCritico: true,
    tienePedidosRetrasos: true,
    proximoPedido: {
      numeroPedido: "PED-2025-004",
      fecha: "2025-12-20",
      cantidad: 100,
      proveedor: "Gaming Tech",
      contenedor: "TCLU345678"
    }
  },
  {
    _id: "5",
    codigo: "CARG01",
    descripcion: "CARGADOR TIPO C RAPIDO",
    tags: ["ARTICULOS SIN REPOSICION"],
    cantidad: 120,
    stockProyectado: 120,
    ventasPeriodo: 95,
    ventasProyectadas: 180,
    diasSinStock: 85,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: null
  },
  {
    _id: "6",
    codigo: "FUND01",
    descripcion: "FUNDA SILICONA IPHONE 15",
    tags: ["ARTICULOS PARA REPOSICION"],
    cantidad: 0,
    stockProyectado: 150,
    ventasPeriodo: 210,
    ventasProyectadas: 380,
    diasSinStock: 25,
    diasSinStockEnPeriodo: 25,
    stockCritico: true,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-005",
      fecha: "2025-11-28",
      cantidad: 150,
      proveedor: "Case Pro",
      contenedor: "TCLU901234"
    }
  },
  {
    _id: "7",
    codigo: "CABLE03",
    descripcion: "CABLE LIGHTNING 2M",
    tags: ["ARTICULOS SIN REPOSICION"],
    cantidad: 80,
    stockProyectado: 180,
    ventasPeriodo: 55,
    ventasProyectadas: 110,
    diasSinStock: 145,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-006",
      fecha: "2025-12-10",
      cantidad: 100,
      proveedor: "Cable Express",
      contenedor: "TCLU567891"
    }
  },
  {
    _id: "8",
    codigo: "PROT01",
    descripcion: "PROTECTOR PANTALLA SAMSUNG A54",
    tags: ["ARTICULOS PARA REPOSICION"],
    cantidad: 35,
    stockProyectado: 135,
    ventasPeriodo: 125,
    ventasProyectadas: 250,
    diasSinStock: 28,
    diasSinStockEnPeriodo: 10,
    stockCritico: true,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-007",
      fecha: "2025-12-01",
      cantidad: 100,
      proveedor: "Screen Guard",
      contenedor: "TCLU234567"
    }
  },
  {
    _id: "9",
    codigo: "SOPORTE02",
    descripcion: "SOPORTE VEHICULAR MAGNETICO",
    tags: ["ARTICULOS PARA REPOSICION"],
    cantidad: 0,
    stockProyectado: 75,
    ventasPeriodo: 40,
    ventasProyectadas: 85,
    diasSinStock: 18,
    diasSinStockEnPeriodo: 18,
    stockCritico: true,
    tienePedidosRetrasos: true,
    proximoPedido: {
      numeroPedido: "PED-2025-008",
      fecha: "2025-12-08",
      cantidad: 75,
      proveedor: "Car Tech",
      contenedor: "TCLU678901"
    }
  },
  {
    _id: "10",
    codigo: "POW01",
    descripcion: "POWER BANK 10000MAH",
    tags: ["ARTICULOS SIN REPOSICION"],
    cantidad: 60,
    stockProyectado: 160,
    ventasPeriodo: 45,
    ventasProyectadas: 90,
    diasSinStock: 120,
    diasSinStockEnPeriodo: 0,
    stockCritico: false,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-009",
      fecha: "2025-12-12",
      cantidad: 100,
      proveedor: "Power Solutions",
      contenedor: "TCLU789012"
    }
  },
  {
    _id: "11",
    codigo: "MOUSE01",
    descripcion: "MOUSE INALAMBRICO GAMING",
    tags: ["ARTICULOS PARA REPOSICION"],
    cantidad: 22,
    stockProyectado: 122,
    ventasPeriodo: 85,
    ventasProyectadas: 170,
    diasSinStock: 32,
    diasSinStockEnPeriodo: 8,
    stockCritico: true,
    tienePedidosRetrasos: false,
    proximoPedido: {
      numeroPedido: "PED-2025-010",
      fecha: "2025-12-15",
      cantidad: 100,
      proveedor: "Gaming Gear",
      contenedor: "TCLU890123"
    }
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
  }
];

// Funciones auxiliares para colores y formato
const getDiasSinStockColor = (dias) => {
  if (dias < 30) return 'error';    // Rojo
  if (dias < 60) return 'warning';  // Amarillo
  return 'success';                 // Verde (más de 60 días está bien)
};

const getStockActualColor = (producto) => {
  if (producto.cantidad === 0) return 'error';
  return null; // Sin color para el resto
};

const formatStockProyectado = (producto) => {
  if (!producto.proximoPedido) return producto.stockProyectado;
  
  const fechaFormateada = dayjs(producto.proximoPedido.fecha).format('DD/MM');
  return {
    total: producto.stockProyectado,
    incremento: producto.proximoPedido.cantidad,
    fecha: fechaFormateada
  };
};

export default function ProyeccionMockPage() {
  const router = useRouter();
  
  // Estados principales
  const [productosProyeccion, setProductosProyeccion] = useState(mockProductosProyeccion);
  const [pedidos, setPedidos] = useState(mockPedidos);
  const [contenedores, setContenedores] = useState(mockContenedores);
  const [pedidoContenedores, setPedidoContenedores] = useState(mockPedidoContenedores);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    stockCriticos: false,
    tags: [],
    pedidosVencidos: false
  });

  // Obtener todos los tags únicos disponibles
  const tagsDisponibles = useMemo(() => {
    const allTags = productosProyeccion.flatMap(p => p.tags || []);
    return [...new Set(allTags)].sort();
  }, [productosProyeccion]);

  // Estado para pedidos confirmados/entregados
  const [pedidosEntregados, setPedidosEntregados] = useState(new Set());

  // Productos filtrados según los filtros aplicados
  const productosFiltrados = useMemo(() => {
    let productos = productosProyeccion;

    // Filtro de stock críticos
    if (filtros.stockCriticos) {
      productos = productos.filter(producto => producto.diasSinStock < 60);
    }

    // Filtro por tags
    if (filtros.tags.length > 0) {
      productos = productos.filter(producto => 
        producto.tags && producto.tags.some(tag => filtros.tags.includes(tag))
      );
    }

    // Filtro de pedidos vencidos
    if (filtros.pedidosVencidos) {
      const hoy = new Date();
      productos = productos.filter(producto => {
        if (!producto.proximoPedido) return false;
        const fechaPedido = new Date(producto.proximoPedido.fecha);
        return fechaPedido < hoy && !pedidosEntregados.has(producto.proximoPedido.numeroPedido);
      });
    }

    return productos;
  }, [productosProyeccion, filtros, pedidosEntregados]);

  // Estados para gestión de tags
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [isTagSaving, setIsTagSaving] = useState(false);
  const [isTagLoading, setIsTagLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedExistingTag, setSelectedExistingTag] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [tagError, setTagError] = useState("");
  const [isRemoveTagOpen, setIsRemoveTagOpen] = useState(false);
  const [isRemoveTagSaving, setIsRemoveTagSaving] = useState(false);
  const [removeTagError, setRemoveTagError] = useState("");

  // Estados para confirmar llegada de contenedor
  const [isConfirmarLlegadaOpen, setIsConfirmarLlegadaOpen] = useState(false);
  const [contenedorAConfirmar, setContenedorAConfirmar] = useState(null);
  const [productosEnContenedor, setProductosEnContenedor] = useState([]);

  // Estados para agregar productos a pedidos/contenedores
  const [isAgregarProductosOpen, setIsAgregarProductosOpen] = useState(false);
  const [tipoAgregar, setTipoAgregar] = useState("existente"); // "existente" o "nuevo"
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState("");
  const [contenedorSeleccionado, setContenedorSeleccionado] = useState("");
  const [tipoContenedor, setTipoContenedor] = useState("existente"); // "existente" o "nuevo"
  const [nuevoPedidoData, setNuevoPedidoData] = useState({
    numero: "",
    fechaEstimada: "",
    observaciones: ""
  });
  const [nuevoContenedorData, setNuevoContenedorData] = useState({
    numero: "",
    fechaEstimada: ""
  });
  const [cantidadesProductos, setCantidadesProductos] = useState({});

  // Funciones para agregar productos a pedidos/contenedores
  const obtenerProductosSeleccionados = () => {
    return productosProyeccion.filter(p => selectedKeys.has(p._id));
  };

  const obtenerCantidadProducto = (productoId) => {
    return cantidadesProductos[productoId] || 1;
  };

  const actualizarCantidadProducto = (productoId, cantidad) => {
    setCantidadesProductos(prev => ({
      ...prev,
      [productoId]: Math.max(1, parseInt(cantidad) || 1)
    }));
  };

  // Funciones para filtros
  const actualizarFiltroStockCriticos = (valor) => {
    setFiltros(prev => ({ ...prev, stockCriticos: valor }));
  };

  const actualizarFiltroTags = (tags) => {
    setFiltros(prev => ({ ...prev, tags }));
  };

  const actualizarFiltroPedidosVencidos = (valor) => {
    setFiltros(prev => ({ ...prev, pedidosVencidos: valor }));
  };

  // Función para abrir modal de confirmación de llegada
  const confirmarEntregaPedido = (numeroPedido) => {
    // Buscar el producto con este pedido para obtener el contenedor
    const producto = productosProyeccion.find(p => 
      p.proximoPedido && p.proximoPedido.numeroPedido === numeroPedido
    );

    if (!producto || !producto.proximoPedido || !producto.proximoPedido.contenedor) {
      // Si no hay contenedor, confirmar solo este producto
      confirmarLlegadaDirecta(numeroPedido);
      return;
    }

    const numeroContenedor = producto.proximoPedido.contenedor;

    // Buscar todos los productos que comparten este contenedor
    const productosDelContenedor = productosProyeccion.filter(p => 
      p.proximoPedido && p.proximoPedido.contenedor === numeroContenedor
    );

    setContenedorAConfirmar(numeroContenedor);
    setProductosEnContenedor(productosDelContenedor);
    setIsConfirmarLlegadaOpen(true);
  };

  // Función para confirmar llegada directa (sin modal)
  const confirmarLlegadaDirecta = (numeroPedido) => {
    const productosActualizados = productosProyeccion.map(producto => {
      if (producto.proximoPedido && producto.proximoPedido.numeroPedido === numeroPedido) {
        return {
          ...producto,
          proximoPedido: null,
          stockProyectado: producto.cantidad
        };
      }
      return producto;
    });

    setProductosProyeccion(productosActualizados);
    setPedidosEntregados(prev => new Set([...prev, numeroPedido]));
  };

  // Función para confirmar llegada de todo el contenedor
  const confirmarLlegadaContenedor = () => {
    if (!contenedorAConfirmar || productosEnContenedor.length === 0) return;

    // Obtener todos los números de pedido del contenedor
    const numerosPedidos = productosEnContenedor.map(p => p.proximoPedido.numeroPedido);

    // Actualizar todos los productos del contenedor
    const productosActualizados = productosProyeccion.map(producto => {
      if (producto.proximoPedido && producto.proximoPedido.contenedor === contenedorAConfirmar) {
        return {
          ...producto,
          proximoPedido: null,
          stockProyectado: producto.cantidad
        };
      }
      return producto;
    });

    setProductosProyeccion(productosActualizados);
    
    // Marcar todos los pedidos como entregados
    setPedidosEntregados(prev => {
      const newSet = new Set(prev);
      numerosPedidos.forEach(num => newSet.add(num));
      return newSet;
    });

    // Cerrar modal
    setIsConfirmarLlegadaOpen(false);
    setContenedorAConfirmar(null);
    setProductosEnContenedor([]);

    alert(`✅ Contenedor ${contenedorAConfirmar} confirmado con ${productosEnContenedor.length} producto(s)`);
  };

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltros({
      stockCriticos: false,
      tags: [],
      pedidosVencidos: false
    });
  };

  // Función para generar color de tag determinístico
  const getTagColor = (tag) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    const s = 75 + (hash % 10);
    const l = 85 + (hash % 5);
    return `hsl(${h}, ${s}%, ${l}%)`;
  };

  // Funciones para manejar tags
  const handleAgregarTag = async () => {
    try {
      setTagError("");
      const finalTag = (newTagName || selectedExistingTag || "").trim();
      if (!finalTag) {
        setTagError("Elegí un tag existente o crea uno nuevo");
        return;
      }
      setIsTagSaving(true);
      
      // Simular agregado de tags (en la versión real sería una llamada a la API)
      const productosActualizados = productosProyeccion.map(producto => {
        if (selectedKeys.has(producto._id)) {
          const tagsExistentes = producto.tags || [];
          const nuevasTags = [...tagsExistentes];
          if (!nuevasTags.includes(finalTag)) {
            nuevasTags.push(finalTag);
          }
          return { ...producto, tags: nuevasTags };
        }
        return producto;
      });
      
      setProductosProyeccion(productosActualizados);
      setSelectedKeys(new Set());
      setIsTagOpen(false);
      setSelectedExistingTag("");
      setNewTagName("");
      alert(`✅ Tag "${finalTag}" agregado a ${selectedKeys.size} producto(s)`);
    } catch (e) {
      console.error(e);
      setTagError("Error al guardar el tag");
    } finally {
      setIsTagSaving(false);
    }
  };

  const handleEliminarTags = async () => {
    try {
      setRemoveTagError("");
      setIsRemoveTagSaving(true);
      
      // Simular eliminación de tags (en la versión real sería una llamada a la API)
      const productosActualizados = productosProyeccion.map(producto => {
        if (selectedKeys.has(producto._id)) {
          return { ...producto, tags: [] };
        }
        return producto;
      });
      
      setProductosProyeccion(productosActualizados);
      setSelectedKeys(new Set());
      setIsRemoveTagOpen(false);
      alert(`✅ Tags eliminados de ${selectedKeys.size} producto(s)`);
    } catch (e) {
      console.error(e);
      setRemoveTagError("Error al eliminar los tags");
    } finally {
      setIsRemoveTagSaving(false);
    }
  };

  // Cargar tags disponibles para el selector
  const cargarTagsDisponibles = async () => {
    setIsTagLoading(true);
    try {
      // Simular carga de tags (en la versión real sería una llamada a la API)
      const todosLosTags = productosProyeccion.flatMap(p => p.tags || []);
      const tagsUnicos = [...new Set(todosLosTags)].sort();
      setAvailableTags(tagsUnicos);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTagLoading(false);
    }
  };

  const limpiarFormularioAgregarProductos = () => {
    setPedidoSeleccionado("");
    setContenedorSeleccionado("");
    setTipoContenedor("existente");
    setNuevoPedidoData({ numero: "", fechaEstimada: "", observaciones: "" });
    setNuevoContenedorData({ numero: "", fechaEstimada: "" });
    setCantidadesProductos({});
    setTipoAgregar("existente");
  };

  const agregarProductosAPedidoExistente = () => {
    if (!pedidoSeleccionado || selectedKeys.size === 0) return;

    const productosAgregar = obtenerProductosSeleccionados();
    const pedido = pedidos.find(p => p._id === pedidoSeleccionado);
    
    const totalUnidades = productosAgregar.reduce((total, producto) => 
      total + obtenerCantidadProducto(producto._id), 0
    );
    
    let mensajeContenedor = "";
    let contenedorId = contenedorSeleccionado;

    // Si se seleccionó crear nuevo contenedor
    if (tipoContenedor === "nuevo" && nuevoContenedorData.numero) {
      const nuevoContenedor = {
        _id: `CONT${Date.now()}`,
        numero: nuevoContenedorData.numero,
        estado: "pendiente",
        fechaCreacion: new Date().toISOString().split('T')[0],
        fechaEstimada: nuevoContenedorData.fechaEstimada,
        fechaReal: null,
        fechaUltimaModificacion: new Date().toISOString(),
        observaciones: `Contenedor creado para pedido ${pedido.numeroPedido}`
      };
      setContenedores(prev => [...prev, nuevoContenedor]);
      contenedorId = nuevoContenedor._id;
      mensajeContenedor = ` y asignados al nuevo contenedor ${nuevoContenedorData.numero}`;
    } else if (contenedorSeleccionado) {
      const contenedor = contenedores.find(c => c._id === contenedorSeleccionado);
      mensajeContenedor = ` y asignados al contenedor ${contenedor.numero}`;
    }
    
    alert(`✅ ${productosAgregar.length} producto(s) (${totalUnidades} unidades total) agregados al pedido ${pedido.numeroPedido}${mensajeContenedor}`);

    // Limpiar selección y cerrar modal
    setSelectedKeys(new Set());
    setIsAgregarProductosOpen(false);
    limpiarFormularioAgregarProductos();
  };

  const crearNuevoPedidoConProductos = () => {
    if (!nuevoPedidoData.numero || selectedKeys.size === 0) return;

    const productosAgregar = obtenerProductosSeleccionados();
    const totalUnidades = productosAgregar.reduce((total, producto) => 
      total + obtenerCantidadProducto(producto._id), 0
    );
    
    const nuevoPedido = {
      _id: `PED${Date.now()}`,
      numeroPedido: nuevoPedidoData.numero,
      fechaPedido: new Date().toISOString().split('T')[0],
      fechaEstimadaLlegada: nuevoPedidoData.fechaEstimada,
      observaciones: nuevoPedidoData.observaciones,
      productos: productosAgregar.map(p => ({
        productoId: p._id,
        codigo: p.codigo,
        descripcion: p.descripcion,
        cantidad: obtenerCantidadProducto(p._id)
      }))
    };

    setPedidos(prev => [...prev, nuevoPedido]);

    // Crear contenedor si se especificó uno nuevo
    let mensajeContenedor = "";
    if (tipoContenedor === "nuevo" && nuevoContenedorData.numero) {
      const nuevoContenedor = {
        _id: `CONT${Date.now()}`,
        numero: nuevoContenedorData.numero,
        estado: "pendiente",
        fechaCreacion: new Date().toISOString().split('T')[0],
        fechaEstimada: nuevoContenedorData.fechaEstimada,
        fechaReal: null,
        fechaUltimaModificacion: new Date().toISOString(),
        observaciones: `Contenedor creado para pedido ${nuevoPedidoData.numero}`
      };
      setContenedores(prev => [...prev, nuevoContenedor]);
      mensajeContenedor = ` y contenedor ${nuevoContenedorData.numero}`;
    } else if (tipoContenedor === "existente" && contenedorSeleccionado) {
      const contenedor = contenedores.find(c => c._id === contenedorSeleccionado);
      mensajeContenedor = ` y asignado al contenedor ${contenedor.numero}`;
    }

    alert(`✅ Nuevo pedido ${nuevoPedidoData.numero} creado con ${productosAgregar.length} producto(s) (${totalUnidades} unidades total)${mensajeContenedor}`);

    // Limpiar y cerrar
    setSelectedKeys(new Set());
    setIsAgregarProductosOpen(false);
    limpiarFormularioAgregarProductos();
  };

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

          {/* Controles y Filtros */}
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6">
                Productos ({productosFiltrados.length}{productosProyeccion.length !== productosFiltrados.length ? ` de ${productosProyeccion.length}` : ''})
              </Typography>
            </Stack>

            {/* Filtros */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" gap={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Filtros:
                </Typography>
                
                {/* Filtro Stock Críticos */}
                <Button
                  variant={filtros.stockCriticos ? "contained" : "outlined"}
                  color="warning"
                  startIcon={<WarningIcon />}
                  onClick={() => actualizarFiltroStockCriticos(!filtros.stockCriticos)}
                  size="small"
                >
                  Stock Críticos (&lt;60 días)
                </Button>

                {/* Filtro Pedidos Vencidos */}
                <Button
                  variant={filtros.pedidosVencidos ? "contained" : "outlined"}
                  color="error"
                  startIcon={<ErrorIcon />}
                  onClick={() => actualizarFiltroPedidosVencidos(!filtros.pedidosVencidos)}
                  size="small"
                >
                  Pedidos Vencidos
                </Button>

                {/* Selector de Tags */}
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Tags</InputLabel>
                  <Select
                    multiple
                    value={filtros.tags}
                    onChange={(e) => actualizarFiltroTags(e.target.value)}
                    label="Tags"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {tagsDisponibles.map((tag) => (
                      <MenuItem key={tag} value={tag}>
                        <Checkbox checked={filtros.tags.indexOf(tag) > -1} />
                        <ListItemText primary={tag} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Botón limpiar filtros */}
                {(filtros.stockCriticos || filtros.pedidosVencidos || filtros.tags.length > 0) && (
                  <Button
                    variant="text"
                    color="secondary"
                    onClick={limpiarFiltros}
                    size="small"
                    startIcon={<CloseIcon />}
                  >
                    Limpiar Filtros
                  </Button>
                )}
              </Stack>
            </Paper>
          </Box>

          {/* Controles de acciones */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Box />
            
            {/* Acciones */}
            <Stack direction="row" spacing={2}>
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
                    variant="outlined"
                    color="secondary"
                    onClick={async () => {
                      setIsTagOpen(true);
                      setSelectedExistingTag("");
                      setNewTagName("");
                      setTagError("");
                      await cargarTagsDisponibles();
                    }}
                    startIcon={<LabelIcon />}
                    size="small"
                  >
                    Agregar Tag
                  </Button>

                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => {
                      setIsRemoveTagOpen(true);
                      setRemoveTagError("");
                    }}
                    startIcon={<LabelOffIcon />}
                    size="small"
                  >
                    Eliminar Tags
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
                      indeterminate={selectedKeys.size > 0 && selectedKeys.size < productosFiltrados.length}
                      checked={productosFiltrados.length > 0 && selectedKeys.size === productosFiltrados.length}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedKeys(new Set(productosFiltrados.map(p => p._id)));
                        } else {
                          setSelectedKeys(new Set());
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>Código</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell align="center">Stock Actual</TableCell>
                  <TableCell align="center">Stock Proyectado</TableCell>
                  <TableCell align="center">Ventas Período</TableCell>
                  <TableCell align="center">Días hasta agotar stock</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productosFiltrados.map((producto) => {
                  const stockProyectadoInfo = formatStockProyectado(producto);
                  
                  return (
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
                      
                      {/* Tags */}
                      <TableCell>
                        {producto.tags && producto.tags.length > 0 ? (
                          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                            {producto.tags.map((tag, idx) => (
                              <Chip
                                key={`${producto._id}-tag-${idx}`}
                                label={tag}
                                size="small"
                                sx={{
                                  backgroundColor: getTagColor(tag),
                                  color: "text.primary",
                                  fontWeight: 500,
                                  fontSize: '0.75rem'
                                }}
                              />
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      
                      {/* Stock Actual con colores */}
                      <TableCell align="center">
                        {producto.cantidad === 0 ? (
                          <Chip 
                            label={producto.cantidad}
                            color="error"
                            variant="filled"
                            size="small"
                          />
                        ) : (
                          <Typography variant="body2">
                            {producto.cantidad}
                          </Typography>
                        )}
                      </TableCell>
                      
                      {/* Stock Proyectado con explicación */}
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                          <Typography variant="body2" fontWeight="bold">
                            {stockProyectadoInfo.total}
                          </Typography>
                          {stockProyectadoInfo.incremento && (
                            <Tooltip title={`Pedido llegando el ${stockProyectadoInfo.fecha}`}>
                              <Chip
                                icon={<TrendingUpIcon />}
                                label={`+${stockProyectadoInfo.incremento} ${stockProyectadoInfo.fecha}`}
                                color="info"
                                variant="outlined"
                                size="small"
                                sx={{ fontSize: '0.75rem' }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      
                      {/* Ventas Período con aclaración */}
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                          <Typography variant="body2" fontWeight="bold">
                            {producto.ventasPeriodo}
                          </Typography>
                          {producto.diasSinStockEnPeriodo > 0 && (
                            <Tooltip title={`${producto.diasSinStockEnPeriodo} días sin stock en período`}>
                              <Chip
                                icon={<WarningIcon />}
                                label={`${producto.diasSinStockEnPeriodo}d sin stock`}
                                color="warning"
                                variant="outlined"
                                size="small"
                                sx={{ fontSize: '0.75rem' }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      
                      {/* Días hasta agotar stock */}
                      <TableCell align="center">
                        <Chip 
                          label={producto.diasSinStock}
                          color={getDiasSinStockColor(producto.diasSinStock)}
                          variant="filled"
                          size="small"
                        />
                      </TableCell>
                      
                      {/* Acciones */}
                      <TableCell align="center">
                        {producto.proximoPedido && !pedidosEntregados.has(producto.proximoPedido.numeroPedido) && (
                          <Button
                            variant="outlined"
                            color="success"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmarEntregaPedido(producto.proximoPedido.numeroPedido);
                            }}
                            startIcon={<CheckCircleIcon />}
                          >
                            Confirmar Llegada
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Box>

      {/* Modal para Agregar Productos a Pedidos/Contenedores */}
      <Dialog open={isAgregarProductosOpen} onClose={() => {
        setIsAgregarProductosOpen(false);
        limpiarFormularioAgregarProductos();
      }} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Agregar Productos a Pedido</Typography>
            <IconButton onClick={() => {
              setIsAgregarProductosOpen(false);
              limpiarFormularioAgregarProductos();
            }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {/* Mostrar productos seleccionados con cantidades */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              📦 Productos a agregar ({selectedKeys.size}):
            </Typography>
            <Grid container spacing={2}>
              {obtenerProductosSeleccionados().map(producto => (
                <Grid item xs={12} md={6} key={producto._id}>
                  <Box 
                    sx={{ 
                      p: 2, 
                      border: 1, 
                      borderColor: 'divider', 
                      borderRadius: 1,
                      bgcolor: 'background.paper'
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight="bold">
                          {producto.codigo}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {producto.descripcion}
                        </Typography>
                      </Box>
                      <TextField
                        size="small"
                        label="Cantidad"
                        type="number"
                        value={obtenerCantidadProducto(producto._id)}
                        onChange={(e) => actualizarCantidadProducto(producto._id, e.target.value)}
                        inputProps={{ min: 1, step: 1 }}
                        sx={{ width: 80 }}
                      />
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
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
                      onChange={(e) => setPedidoSeleccionado(e.target.value)}
                    >
                      {pedidos.map(pedido => (
                        <MenuItem key={pedido._id} value={pedido._id}>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {pedido.numeroPedido}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Creado: {pedido.fechaPedido} | Llegada: {pedido.fechaEstimadaLlegada}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* Contenedor opcional con opción de crear nuevo */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, mb: 1 }}>
                    🚢 Contenedor (Opcional)
                  </Typography>
                  
                  <Tabs 
                    value={tipoContenedor} 
                    onChange={(e, newValue) => setTipoContenedor(newValue)}
                    sx={{ mb: 2 }}
                  >
                    <Tab label="Contenedor Existente" value="existente" />
                    <Tab label="Crear Nuevo Contenedor" value="nuevo" />
                  </Tabs>

                  {tipoContenedor === "existente" ? (
                    <FormControl fullWidth>
                      <InputLabel>Seleccionar Contenedor</InputLabel>
                      <Select
                        value={contenedorSeleccionado}
                        label="Seleccionar Contenedor"
                        onChange={(e) => setContenedorSeleccionado(e.target.value)}
                      >
                        <MenuItem value="">
                          <Typography variant="body2" color="text.secondary">
                            Sin contenedor asignado
                          </Typography>
                        </MenuItem>
                        {contenedores.map(contenedor => (
                          <MenuItem key={contenedor._id} value={contenedor._id}>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {contenedor.numero}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Estado: {contenedor.estado} | Llegada: {contenedor.fechaEstimada}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Código del Contenedor"
                          value={nuevoContenedorData.numero}
                          onChange={(e) => setNuevoContenedorData(prev => ({
                            ...prev,
                            numero: e.target.value.toUpperCase()
                          }))}
                          placeholder="Ej: TCLU123456"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Fecha Estimada de Llegada"
                          type="date"
                          value={nuevoContenedorData.fechaEstimada}
                          onChange={(e) => setNuevoContenedorData(prev => ({
                            ...prev,
                            fechaEstimada: e.target.value
                          }))}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                    </Grid>
                  )}
                </Grid>
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
                    label="Fecha Estimada"
                    type="date"
                    value={nuevoPedidoData.fechaEstimada}
                    onChange={(e) => setNuevoPedidoData(prev => ({
                      ...prev,
                      fechaEstimada: e.target.value
                    }))}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
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

              <Divider sx={{ my: 3 }} />

              {/* Sección de Contenedor */}
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
                🚢 Contenedor (Opcional)
              </Typography>
              
              <Tabs 
                value={tipoContenedor} 
                onChange={(e, newValue) => setTipoContenedor(newValue)}
                sx={{ mb: 3 }}
              >
                <Tab label="Contenedor Existente" value="existente" />
                <Tab label="Crear Nuevo Contenedor" value="nuevo" />
              </Tabs>

              {tipoContenedor === "existente" ? (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Seleccionar Contenedor</InputLabel>
                      <Select
                        value={contenedorSeleccionado}
                        label="Seleccionar Contenedor"
                        onChange={(e) => setContenedorSeleccionado(e.target.value)}
                      >
                        <MenuItem value="">
                          <Typography variant="body2" color="text.secondary">
                            Sin contenedor asignado
                          </Typography>
                        </MenuItem>
                        {contenedores.map(contenedor => (
                          <MenuItem key={contenedor._id} value={contenedor._id}>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {contenedor.numero}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Estado: {contenedor.estado} | Llegada: {contenedor.fechaEstimada}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Código del Contenedor"
                      value={nuevoContenedorData.numero}
                      onChange={(e) => setNuevoContenedorData(prev => ({
                        ...prev,
                        numero: e.target.value
                      }))}
                      placeholder="Ej: TCLU123456"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Fecha Estimada de Llegada"
                      type="date"
                      value={nuevoContenedorData.fechaEstimada}
                      onChange={(e) => setNuevoContenedorData(prev => ({
                        ...prev,
                        fechaEstimada: e.target.value
                      }))}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
              )}
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
              (tipoAgregar === "existente" && !pedidoSeleccionado) ||
              (tipoAgregar === "nuevo" && (!nuevoPedidoData.numero || !nuevoPedidoData.fechaEstimada))
            }
            startIcon={<AddIcon />}
          >
            {tipoAgregar === "existente" ? "Agregar a Pedido" : "Crear y Agregar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Agregar Tags */}
      <Dialog
        open={isTagOpen}
        onClose={isTagSaving ? undefined : () => setIsTagOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Agregar tag a productos seleccionados</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Productos seleccionados: {selectedKeys.size}
            </Typography>
            
            <FormControl fullWidth size="small">
              <InputLabel>Tag existente</InputLabel>
              <Select
                value={selectedExistingTag}
                label="Tag existente"
                onChange={(e) => setSelectedExistingTag(e.target.value)}
                disabled={isTagLoading}
              >
                <MenuItem value="">
                  <em>Ninguno</em>
                </MenuItem>
                {availableTags.map((tag) => (
                  <MenuItem key={tag} value={tag}>
                    <Chip
                      label={tag}
                      size="small"
                      sx={{
                        backgroundColor: getTagColor(tag),
                        color: "text.primary",
                        fontWeight: 500,
                      }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Typography variant="caption" color="text.secondary">
              O crear uno nuevo:
            </Typography>
            
            <TextField
              size="small"
              label="Nuevo tag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Ej: ARTICULOS PARA REPOSICION, ARTICULOS SIN REPOSICION"
            />
            
            {tagError && (
              <Typography variant="caption" color="error">
                {tagError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setIsTagOpen(false)} 
            disabled={isTagSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAgregarTag}
            variant="contained"
            disabled={isTagSaving}
            startIcon={isTagSaving ? <CircularProgress size={16} color="inherit" /> : <LabelIcon />}
          >
            {isTagSaving ? "Guardando..." : "Agregar Tag"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Eliminar Tags */}
      <Dialog
        open={isRemoveTagOpen}
        onClose={isRemoveTagSaving ? undefined : () => setIsRemoveTagOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Eliminar todos los tags</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              ¿Estás seguro que deseas eliminar todos los tags de los {selectedKeys.size} productos seleccionados?
            </Typography>
            
            <Typography variant="caption" color="text.secondary">
              Esta acción no se puede deshacer.
            </Typography>
            
            {removeTagError && (
              <Typography variant="caption" color="error">
                {removeTagError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setIsRemoveTagOpen(false)} 
            disabled={isRemoveTagSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleEliminarTags}
            variant="contained"
            color="error"
            disabled={isRemoveTagSaving}
            startIcon={isRemoveTagSaving ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            {isRemoveTagSaving ? "Eliminando..." : "Eliminar Tags"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para Confirmar Llegada de Contenedor */}
      <Dialog
        open={isConfirmarLlegadaOpen}
        onClose={() => {
          setIsConfirmarLlegadaOpen(false);
          setContenedorAConfirmar(null);
          setProductosEnContenedor([]);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Confirmar Llegada de Contenedor</Typography>
            <IconButton onClick={() => {
              setIsConfirmarLlegadaOpen(false);
              setContenedorAConfirmar(null);
              setProductosEnContenedor([]);
            }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Alert severity="info">
              <Typography variant="body2">
                El contenedor <strong>{contenedorAConfirmar}</strong> contiene {productosEnContenedor.length} producto(s).
                Al confirmar la llegada, se actualizará el stock proyectado de todos los productos del contenedor.
              </Typography>
            </Alert>

            <Box>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Productos en el contenedor:
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align="center">Pedido</TableCell>
                      <TableCell align="right">Stock Actual</TableCell>
                      <TableCell align="right">Cantidad en Pedido</TableCell>
                      <TableCell align="right">Stock Proyectado Actual</TableCell>
                      <TableCell align="right">Nuevo Stock Proyectado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productosEnContenedor.map((producto) => (
                      <TableRow key={producto._id}>
                        <TableCell>{producto.codigo}</TableCell>
                        <TableCell>{producto.descripcion}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={producto.proximoPedido.numeroPedido} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">{producto.cantidad}</TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={`+${producto.proximoPedido.cantidad}`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight="bold">
                            {producto.stockProyectado}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight="bold" color="error">
                            {producto.cantidad}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Alert severity="warning">
              <Typography variant="body2" fontWeight="bold">
                ⚠️ Esta acción eliminará los pedidos pendientes de la proyección
              </Typography>
              <Typography variant="caption">
                El stock proyectado de cada producto será igual a su stock actual.
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsConfirmarLlegadaOpen(false);
            setContenedorAConfirmar(null);
            setProductosEnContenedor([]);
          }}>
            Cancelar
          </Button>
          <Button
            onClick={confirmarLlegadaContenedor}
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
          >
            Confirmar Llegada de Contenedor
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

ProyeccionMockPage.getLayout = (page) => page;