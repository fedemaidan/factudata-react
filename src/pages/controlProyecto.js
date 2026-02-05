import { useEffect, useState, useMemo } from 'react';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import Head from 'next/head';
import {
  Box,
  Container,
  Stack,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActionArea,
  IconButton,
  TextField,
  Button,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Chip,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Autocomplete
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import RefreshIcon from '@mui/icons-material/Refresh';
import CategoryIcon from '@mui/icons-material/Category';
import TimelineIcon from '@mui/icons-material/Timeline';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useRouter } from 'next/router';
import { useAuthContext } from 'src/contexts/auth-context';
import presupuestoService from 'src/services/presupuestoService';
import { getEmpresaById, getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { formatCurrency, formatTimestamp } from 'src/utils/formatters';

// Helper: calcular totales de un resumen multimoneda (para ProyectoCard)
const calcularTotalesResumen = (resumen, tipoCambio = 1470, monedaVista = 'ARS') => {
  if (!resumen) return { egresosTotal: 0, egresosEjecutado: 0 };
  
  const convertir = (monto, monedaOriginal) => {
    if (monedaVista === monedaOriginal) return monto;
    if (monedaVista === 'USD' && monedaOriginal === 'ARS') return monto / tipoCambio;
    if (monedaVista === 'ARS' && monedaOriginal === 'USD') return monto * tipoCambio;
    return monto;
  };
  
  let egresosTotal = 0, egresosEjecutado = 0;
  Object.entries(resumen.egresosPorMoneda || {}).forEach(([mon, data]) => {
    egresosTotal += convertir(data.total || 0, mon);
    egresosEjecutado += convertir(data.ejecutado || 0, mon);
  });
  
  return { egresosTotal, egresosEjecutado };
};

// ============ COMPONENTE: CARD DE PROYECTO (VISTA GENERAL) ============
const ProyectoCard = ({ proyecto, resumen, onSelect, formatMonto, tipoCambio, moneda }) => {
  const { egresosTotal, egresosEjecutado } = calcularTotalesResumen(resumen, tipoCambio, moneda);
  const presupuestoTotal = egresosTotal;
  const ejecutado = egresosEjecutado;
  const porcentaje = presupuestoTotal > 0 ? (ejecutado / presupuestoTotal) * 100 : 0;
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={() => onSelect(proyecto.id)} sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom noWrap>{proyecto.nombre}</Typography>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Presupuesto:</Typography>
              <Typography variant="body2" fontWeight={600}>{formatMonto(presupuestoTotal)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Ejecutado:</Typography>
              <Typography variant="body2" fontWeight={600} color={porcentaje > 100 ? 'error.main' : 'success.main'}>
                {formatMonto(ejecutado)}
              </Typography>
            </Stack>
            <LinearProgress 
              variant="determinate" 
              value={Math.min(porcentaje, 100)}
              sx={{ height: 8, borderRadius: 4, mt: 1 }}
              color={porcentaje > 100 ? 'error' : porcentaje > 80 ? 'warning' : 'primary'}
            />
            <Typography variant="caption" color="text.secondary" align="center">
              {porcentaje.toFixed(1)}% consumido
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// ============ COMPONENTE: ITEM DE PRESUPUESTO ============
const PresupuestoItem = ({ label, presupuesto, ejecutado, formatMonto, onCrear, onAdicional, onEditar, onVerHistorial, historial, moneda }) => {
  const tienePresupuesto = presupuesto !== null && presupuesto !== undefined;
  const porcentaje = tienePresupuesto && presupuesto > 0 ? (ejecutado / presupuesto) * 100 : 0;
  const tieneHistorial = historial && historial.length > 0;
  const monedaLabel = moneda === 'USD' ? '🇺🇸' : '🇦🇷';
  
  if (!tienePresupuesto) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography>{label}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label="Sin presupuesto" size="small" variant="outlined" color="default" />
            <Button size="small" variant="outlined" onClick={onCrear} startIcon={<AddCircleIcon />}>
              Crear
            </Button>
          </Stack>
        </Stack>
      </Paper>
    );
  }
  
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography fontWeight={500}>{label}</Typography>
          <Chip label={monedaLabel} size="small" variant="outlined" sx={{ minWidth: 32 }} />
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={`Pres: ${formatMonto(presupuesto, moneda)}`} size="small" variant="outlined" />
          <Chip 
            label={`Ejec: ${formatMonto(ejecutado, moneda)}`} 
            size="small" 
            color={porcentaje > 100 ? 'error' : 'success'}
          />
          {onEditar && (
            <Button size="small" variant="outlined" onClick={onEditar}>Editar</Button>
          )}
          {onAdicional && (
            <Button size="small" onClick={onAdicional}>+ Adicional</Button>
          )}
          {tieneHistorial && onVerHistorial && (
            <Chip 
              label={`${historial.length} cambios`} 
              size="small" 
              color="info" 
              variant="outlined"
              onClick={onVerHistorial}
              sx={{ cursor: 'pointer' }}
            />
          )}
        </Stack>
      </Stack>
      <LinearProgress 
        variant="determinate" 
        value={Math.min(porcentaje, 100)}
        sx={{ mt: 1.5, height: 8, borderRadius: 4 }}
        color={porcentaje > 100 ? 'error' : porcentaje > 80 ? 'warning' : 'primary'}
      />
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {porcentaje.toFixed(1)}% ejecutado
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Saldo: {formatMonto(presupuesto - ejecutado, moneda)}
        </Typography>
      </Stack>
    </Paper>
  );
};

// ============ COMPONENTE PRINCIPAL ============
const ControlProyectoPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  
  // Estado principal
  const [proyectos, setProyectos] = useState([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [resumenesProyectos, setResumenesProyectos] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  
  // Tabs
  const [tabActivo, setTabActivo] = useState(0); // 0: Categoría, 1: Etapa, 2: Proveedor
  
  // Estado de moneda
  const [moneda, setMoneda] = useState('ARS');
  const [tipoCambio, setTipoCambio] = useState(1470);
  
  // Categorías, etapas y proveedores configurados
  const [categorias, setCategorias] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [proveedoresAgregados, setProveedoresAgregados] = useState([]);
  const [proveedoresEmpresa, setProveedoresEmpresa] = useState([]); // Proveedores cargados en la empresa
  
  // Modal de nuevo presupuesto
  const [nuevoPresupuestoModal, setNuevoPresupuestoModal] = useState({ 
    open: false, 
    tipoAgrupacion: null, // 'categoria' | 'etapa' | 'proveedor'
    valor: null 
  });
  const [nuevoPresupuesto, setNuevoPresupuesto] = useState({ monto: '', moneda: 'ARS' });
  
  // Modal de adicional
  const [adicionalModal, setAdicionalModal] = useState({ open: false, presupuestoId: null });
  const [nuevoAdicional, setNuevoAdicional] = useState({ concepto: '', monto: '' });
  
  // Modal agregar proveedor
  const [proveedorModal, setProveedorModal] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState('');
  
  // Modal de edición de presupuesto
  const [editarModal, setEditarModal] = useState({ open: false, presupuestoId: null, montoActual: 0, monedaActual: 'ARS', label: '' });
  const [edicionData, setEdicionData] = useState({ nuevoMonto: '', motivo: '', nuevaMoneda: 'ARS' });
  
  // Modal de historial
  const [historialModal, setHistorialModal] = useState({ open: false, historial: [], label: '' });
  
  // Modal de presupuesto general
  const [presupuestoGeneralModal, setPresupuestoGeneralModal] = useState(false);
  const [nuevoPresupuestoGeneral, setNuevoPresupuestoGeneral] = useState('');
  const [monedaPresupuestoGeneral, setMonedaPresupuestoGeneral] = useState('ARS');

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { proyectoId } = router.query;
        let empresaData;

        if (router.query.empresaId) {
          empresaData = await getEmpresaById(router.query.empresaId);
        } else {
          empresaData = await getEmpresaDetailsFromUser(user);
        }

        setEmpresa(empresaData);
        setEmpresaId(empresaData.id);
        setTipoCambio(empresaData.tipoCambio || 1470);
        setCategorias(empresaData.categorias || []);
        setEtapas(empresaData.etapas || ['Cimientos', 'Estructura', 'Cerramientos', 'Instalaciones', 'Terminaciones']);
        
        // Cargar proveedores de la empresa
        const proveedoresData = empresaData.proveedores_data || [];
        const proveedoresNombres = proveedoresData.length > 0 
          ? proveedoresData.map(p => p.nombre)
          : (empresaData.proveedores || []);
        setProveedoresEmpresa(proveedoresNombres);

        const proyectosUsuario = await getProyectosFromUser(user);
        setProyectos(proyectosUsuario);

        // Si viene proyectoId en query, seleccionarlo
        if (proyectoId) {
          setProyectoSeleccionado(proyectoId);
        }
      } catch (err) {
        console.error(err);
        setAlert({ open: true, message: 'Error al cargar datos', severity: 'error' });
      }
    };
    fetchData();
  }, [user]);

  // Sincronizar estado con URL (para navegación con botón atrás/adelante del browser)
  useEffect(() => {
    const proyectoIdFromQuery = router.query.proyectoId || null;
    if (proyectoIdFromQuery !== proyectoSeleccionado) {
      setProyectoSeleccionado(proyectoIdFromQuery);
      if (!proyectoIdFromQuery) {
        setResumen(null);
      }
    }
  }, [router.query.proyectoId]);

  // Cargar resúmenes de todos los proyectos cuando no hay selección
  useEffect(() => {
    if (!proyectoSeleccionado && proyectos.length > 0 && empresaId) {
      cargarResumenesTodosProyectos();
    }
  }, [proyectoSeleccionado, proyectos, empresaId]);

  // Cargar resumen cuando cambia el proyecto seleccionado
  useEffect(() => {
    if (proyectoSeleccionado && empresaId) {
      cargarResumen();
    }
  }, [proyectoSeleccionado, empresaId]);

  const cargarResumenesTodosProyectos = async () => {
    setLoading(true);
    try {
      const resumenes = {};
      for (const proyecto of proyectos) {
        try {
          const result = await presupuestoService.obtenerResumenProyecto(proyecto.id, empresaId);
          if (result.success) {
            resumenes[proyecto.id] = result.resumen;
          }
        } catch (e) {
          console.error(`Error cargando resumen proyecto ${proyecto.id}`, e);
        }
      }
      setResumenesProyectos(resumenes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Seleccionar proyecto y actualizar URL
  const handleSeleccionarProyecto = (proyectoId) => {
    setProyectoSeleccionado(proyectoId);
    router.push(
      { pathname: router.pathname, query: { ...router.query, proyectoId } },
      undefined,
      { shallow: true }
    );
  };

  // Volver a la vista general y limpiar URL
  const handleVolverAGeneral = () => {
    setProyectoSeleccionado(null);
    setResumen(null);
    const { proyectoId, ...restQuery } = router.query;
    router.push(
      { pathname: router.pathname, query: restQuery },
      undefined,
      { shallow: true }
    );
  };

  const cargarResumen = async () => {
    setLoading(true);
    try {
      const result = await presupuestoService.obtenerResumenProyecto(proyectoSeleccionado, empresaId);
      if (result.success) {
        setResumen(result.resumen);
        // Extraer proveedores únicos del resumen (de todas las monedas)
        const proveedores = new Set();
        const egresosPorMoneda = result.resumen.egresosPorMoneda || {};
        Object.values(egresosPorMoneda).forEach(monedaData => {
          (monedaData.items || []).forEach(item => {
            if (item.proveedor) proveedores.add(item.proveedor);
          });
        });
        setProveedoresAgregados(Array.from(proveedores));
      }
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al cargar resumen', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Helper: obtener todos los items de egresos de todas las monedas
  const obtenerTodosLosItemsEgresos = () => {
    if (!resumen?.egresosPorMoneda) return [];
    return Object.values(resumen.egresosPorMoneda).flatMap(m => m.items || []);
  };

  // Helper: calcular totales de ingresos/egresos sumando todas las monedas (convertidas a la moneda de visualización)
  const calcularTotales = () => {
    if (!resumen) return { ingresos: { total: 0, ejecutado: 0 }, egresos: { total: 0, ejecutado: 0 }, gananciaProyectada: 0, gananciaActual: 0 };
    
    let ingresosTotal = 0, ingresosEjecutado = 0;
    let egresosTotal = 0, egresosEjecutado = 0;
    
    // Sumar ingresos de todas las monedas
    Object.entries(resumen.ingresosPorMoneda || {}).forEach(([mon, data]) => {
      ingresosTotal += convertir(data.total || 0, mon);
      ingresosEjecutado += convertir(data.ejecutado || 0, mon);
    });
    
    // Sumar egresos de todas las monedas
    Object.entries(resumen.egresosPorMoneda || {}).forEach(([mon, data]) => {
      egresosTotal += convertir(data.total || 0, mon);
      egresosEjecutado += convertir(data.ejecutado || 0, mon);
    });
    
    return {
      ingresos: { total: ingresosTotal, ejecutado: ingresosEjecutado },
      egresos: { total: egresosTotal, ejecutado: egresosEjecutado },
      gananciaProyectada: ingresosTotal - egresosTotal,
      gananciaActual: ingresosEjecutado - egresosEjecutado
    };
  };

  // Función para convertir montos según la moneda del presupuesto y la moneda de visualización
  const convertir = (monto, monedaOriginal = 'ARS') => {
    // Si la moneda de visualización y la original son iguales, no convertir
    if (moneda === monedaOriginal) return monto;
    
    // Convertir de ARS a USD
    if (moneda === 'USD' && monedaOriginal === 'ARS') {
      return monto / tipoCambio;
    }
    // Convertir de USD a ARS
    if (moneda === 'ARS' && monedaOriginal === 'USD') {
      return monto * tipoCambio;
    }
    return monto;
  };

  // formatMonto acepta moneda original opcional para mostrar en la moneda del presupuesto
  const formatMonto = (monto, monedaOriginal) => {
    if (monto === null || monto === undefined) return '-';
    
    // Si se especifica moneda original, usar esa para mostrar sin convertir
    const monedaMostrar = monedaOriginal || moneda;
    const valor = monedaOriginal ? monto : convertir(monto);
    
    if (monedaMostrar === 'USD') {
      return `USD ${valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return formatCurrency(valor);
  };

  // Obtener presupuesto por agrupación
  const getPresupuestoPorAgrupacion = (tipoAgrupacion, valor) => {
    const allItems = obtenerTodosLosItemsEgresos();
    if (allItems.length === 0) return { presupuesto: null, ejecutado: 0, id: null, historial: [], moneda: 'ARS' };
    
    const items = allItems.filter(item => {
      if (tipoAgrupacion === 'categoria') return item.categoria === valor && !item.etapa && !item.proveedor;
      if (tipoAgrupacion === 'etapa') return item.etapa === valor && !item.categoria && !item.proveedor;
      if (tipoAgrupacion === 'proveedor') return item.proveedor === valor && !item.categoria && !item.etapa;
      return false;
    });
    
    if (items.length === 0) {
      // Buscar ejecutado aunque no haya presupuesto (buscar en porCategoria de cada moneda)
      let ejecutadoTotal = 0;
      Object.values(resumen?.egresosPorMoneda || {}).forEach(monedaData => {
        ejecutadoTotal += monedaData.porCategoria?.[valor]?.ejecutado || 0;
      });
      return { presupuesto: null, ejecutado: ejecutadoTotal, id: null, historial: [], moneda: 'ARS' };
    }
    
    const item = items[0];
    return { 
      presupuesto: item.monto, 
      ejecutado: item.ejecutado || 0, 
      id: item.id,
      historial: item.historial || [],
      moneda: item.moneda || 'ARS'
    };
  };

  // Handler para editar presupuesto
  const handleEditarPresupuesto = async () => {
    try {
      const result = await presupuestoService.editarPresupuesto(editarModal.presupuestoId, {
        nuevoMonto: parseFloat(edicionData.nuevoMonto),
        motivo: edicionData.motivo,
        creadoPor: user?.uid,
        nuevaMoneda: edicionData.nuevaMoneda
      });
      
      if (result.success) {
        setAlert({ open: true, message: 'Presupuesto editado correctamente', severity: 'success' });
        setEditarModal({ open: false, presupuestoId: null, montoActual: 0, monedaActual: 'ARS', label: '' });
        setEdicionData({ nuevoMonto: '', motivo: '', nuevaMoneda: 'ARS' });
        await cargarResumen();
      }
    } catch (err) {
      setAlert({ open: true, message: 'Error al editar presupuesto', severity: 'error' });
    }
  };

  // Handler para eliminar presupuesto
  const handleEliminarPresupuesto = async () => {
    try {
      const result = await presupuestoService.eliminarPresupuestoPorId(editarModal.presupuestoId);
      
      if (result.success) {
        setAlert({ open: true, message: 'Presupuesto eliminado correctamente', severity: 'success' });
        setEditarModal({ open: false, presupuestoId: null, montoActual: 0, monedaActual: 'ARS', label: '' });
        setEdicionData({ nuevoMonto: '', motivo: '', nuevaMoneda: 'ARS' });
        await cargarResumen();
      }
    } catch (err) {
      setAlert({ open: true, message: 'Error al eliminar presupuesto', severity: 'error' });
    }
  };

  // Calcular sumas por cada agrupación (son 3 formas de ver el MISMO presupuesto)
  const calcularSumas = useMemo(() => {
    if (!resumen) return { porCategoria: 0, porEtapa: 0, porProveedor: 0, general: 0 };
    
    const items = obtenerTodosLosItemsEgresos();
    
    // Presupuesto general (sin categoria, etapa ni proveedor)
    const general = items
      .filter(i => !i.categoria && !i.etapa && !i.proveedor)
      .reduce((sum, i) => sum + (i.monto || 0), 0);
    
    // ID del presupuesto general
    const generalItem = items.find(i => !i.categoria && !i.etapa && !i.proveedor);
    const generalId = generalItem?.id || null;
    const generalHistorial = generalItem?.historial || [];
    
    // Suma de presupuestos por categoría
    const porCategoria = items
      .filter(i => i.categoria && !i.etapa && !i.proveedor)
      .reduce((sum, i) => sum + (i.monto || 0), 0);
    
    // Suma de presupuestos por etapa
    const porEtapa = items
      .filter(i => i.etapa && !i.categoria && !i.proveedor)
      .reduce((sum, i) => sum + (i.monto || 0), 0);
    
    // Suma de presupuestos por proveedor
    const porProveedor = items
      .filter(i => i.proveedor && !i.categoria && !i.etapa)
      .reduce((sum, i) => sum + (i.monto || 0), 0);
    
    return { porCategoria, porEtapa, porProveedor, general, generalId, generalHistorial };
  }, [resumen]);

  // Obtener el presupuesto general del proyecto
  const presupuestoGeneral = calcularSumas.general || 0;

  // Verificar si alguna suma de hijos excede el presupuesto general
  const verificarExcesoHijos = () => {
    if (presupuestoGeneral <= 0) return;
    
    const maximo = Math.max(calcularSumas.porCategoria, calcularSumas.porEtapa, calcularSumas.porProveedor);
    
    if (maximo > presupuestoGeneral) {
      let origen = '';
      if (maximo === calcularSumas.porCategoria) origen = 'categorías';
      else if (maximo === calcularSumas.porEtapa) origen = 'etapas';
      else origen = 'proveedores';
      
      setAjusteGeneralModal({
        open: true,
        sumaHijos: maximo,
        origen: origen
      });
    }
  };

  // Estado para modal de ajuste del general
  const [ajusteGeneralModal, setAjusteGeneralModal] = useState({
    open: false,
    sumaHijos: 0,
    origen: ''
  });

  // Handler para crear nuevo presupuesto
  const handleCrearPresupuesto = async () => {
    try {
      const data = {
        empresa_id: empresaId,
        proyecto_id: proyectoSeleccionado,
        tipo: 'egreso',
        monto: parseFloat(nuevoPresupuesto.monto),
        moneda: nuevoPresupuesto.moneda || 'ARS'
      };
      
      if (nuevoPresupuestoModal.tipoAgrupacion === 'categoria') {
        data.categoria = nuevoPresupuestoModal.valor;
      } else if (nuevoPresupuestoModal.tipoAgrupacion === 'etapa') {
        data.etapa = nuevoPresupuestoModal.valor;
      } else if (nuevoPresupuestoModal.tipoAgrupacion === 'proveedor') {
        data.proveedor = nuevoPresupuestoModal.valor;
      }
      
      await presupuestoService.crearPresupuesto(data);
      
      setAlert({ open: true, message: 'Presupuesto creado correctamente', severity: 'success' });
      setNuevoPresupuestoModal({ open: false, tipoAgrupacion: null, valor: null });
      setNuevoPresupuesto({ monto: '', moneda: 'ARS' });
      
      // Recargar y luego verificar si excede el general
      await cargarResumen();
      // La verificación se hace en un useEffect
    } catch (err) {
      setAlert({ open: true, message: 'Error al crear presupuesto', severity: 'error' });
    }
  };

  // Verificar exceso después de que cambie calcularSumas
  useEffect(() => {
    if (presupuestoGeneral > 0) {
      const maximo = Math.max(calcularSumas.porCategoria, calcularSumas.porEtapa, calcularSumas.porProveedor);
      if (maximo > presupuestoGeneral) {
        let origen = '';
        if (maximo === calcularSumas.porCategoria) origen = 'categorías';
        else if (maximo === calcularSumas.porEtapa) origen = 'etapas';
        else origen = 'proveedores';
        
        setAjusteGeneralModal({
          open: true,
          sumaHijos: maximo,
          origen: origen
        });
      }
    }
  }, [calcularSumas.porCategoria, calcularSumas.porEtapa, calcularSumas.porProveedor]);

  // Handler para ajustar presupuesto general
  const handleAjustarGeneral = async () => {
    try {
      if (calcularSumas.generalId) {
        await presupuestoService.editarPresupuesto(calcularSumas.generalId, {
          nuevoMonto: ajusteGeneralModal.sumaHijos,
          motivo: `Ajuste automático por suma de ${ajusteGeneralModal.origen}`,
          creadoPor: user?.uid
        });
      } else {
        await presupuestoService.crearPresupuesto({
          empresa_id: empresaId,
          proyecto_id: proyectoSeleccionado,
          tipo: 'egreso',
          monto: ajusteGeneralModal.sumaHijos
        });
      }
      setAlert({ open: true, message: 'Presupuesto general ajustado', severity: 'success' });
      setAjusteGeneralModal({ open: false, sumaHijos: 0, origen: '' });
      cargarResumen();
    } catch (err) {
      setAlert({ open: true, message: 'Error al ajustar presupuesto', severity: 'error' });
    }
  };

  // Handler para agregar adicional
  const handleAgregarAdicional = async () => {
    try {
      const result = await presupuestoService.agregarAdicional(adicionalModal.presupuestoId, {
        concepto: nuevoAdicional.concepto,
        monto: parseFloat(nuevoAdicional.monto),
        creadoPor: user?.uid
      });
      
      if (result.success) {
        setAlert({ open: true, message: 'Adicional agregado correctamente', severity: 'success' });
        setAdicionalModal({ open: false, presupuestoId: null });
        setNuevoAdicional({ concepto: '', monto: '' });
        cargarResumen();
      }
    } catch (err) {
      setAlert({ open: true, message: 'Error al agregar adicional', severity: 'error' });
    }
  };

  // Agregar proveedor a la lista
  const handleAgregarProveedor = () => {
    if (nuevoProveedor && !proveedoresAgregados.includes(nuevoProveedor)) {
      setProveedoresAgregados(prev => [...prev, nuevoProveedor]);
      setNuevoProveedor('');
      setProveedorModal(false);
    }
  };

  const proyectoActual = proyectos.find(p => p.id === proyectoSeleccionado);

  // ============ VISTA: TODOS LOS PROYECTOS ============
  if (!proyectoSeleccionado) {
    return (
      <>
        <Head><title>Control de Proyectos</title></Head>
        <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
          <Container maxWidth={false} sx={{ px: 4 }}>
            <Stack spacing={3}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h4">Control de Proyectos</Typography>
                <Stack direction="row" spacing={2}>
                  <ToggleButtonGroup
                    value={moneda}
                    exclusive
                    onChange={(e, val) => val && setMoneda(val)}
                    size="small"
                  >
                    <ToggleButton value="ARS">ARS</ToggleButton>
                    <ToggleButton value="USD">USD</ToggleButton>
                  </ToggleButtonGroup>
                  <Button 
                    variant="outlined" 
                    startIcon={<RefreshIcon />}
                    onClick={cargarResumenesTodosProyectos}
                    disabled={loading}
                  >
                    Actualizar
                  </Button>
                </Stack>
              </Stack>

              {loading && <LinearProgress />}

              {proyectos.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">No hay proyectos configurados</Typography>
                </Paper>
              ) : (
                <Grid container spacing={3}>
                  {proyectos.map((proyecto) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={proyecto.id}>
                      <ProyectoCard 
                        proyecto={proyecto}
                        resumen={resumenesProyectos[proyecto.id]}
                        onSelect={handleSeleccionarProyecto}
                        formatMonto={formatMonto}
                        tipoCambio={tipoCambio}
                        moneda={moneda}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Stack>
          </Container>
        </Box>
      </>
    );
  }

  // ============ VISTA: PROYECTO SELECCIONADO ============
  return (
    <>
      <Head><title>Control - {proyectoActual?.nombre || 'Proyecto'}</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth={false} sx={{ px: 4 }}>
          <Stack spacing={3}>
            
            {/* Header */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={2} alignItems="center">
                <IconButton onClick={handleVolverAGeneral}>
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4">{proyectoActual?.nombre}</Typography>
              </Stack>
              
              <Stack direction="row" spacing={2}>
                <ToggleButtonGroup
                  value={moneda}
                  exclusive
                  onChange={(e, val) => val && setMoneda(val)}
                  size="small"
                >
                  <ToggleButton value="ARS">ARS</ToggleButton>
                  <ToggleButton value="USD">USD</ToggleButton>
                </ToggleButtonGroup>
                
                <Button 
                  variant="outlined" 
                  startIcon={<RefreshIcon />}
                  onClick={cargarResumen}
                  disabled={loading}
                >
                  Actualizar
                </Button>
              </Stack>
            </Stack>

            {loading && <LinearProgress />}

            {resumen && (
              <>
                {/* Resumen General */}
                {(() => {
                  const totales = calcularTotales();
                  return (
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <Card>
                          <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
                              <Box>
                                <Typography variant="body2" color="text.secondary">Ingresos Proyectados</Typography>
                                <Typography variant="h5">{formatMonto(totales.ingresos.total)}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Recibido: {formatMonto(totales.ingresos.ejecutado)}
                                </Typography>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Card>
                          <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <TrendingDownIcon color="error" sx={{ fontSize: 40 }} />
                              <Box>
                                <Typography variant="body2" color="text.secondary">Egresos Proyectados</Typography>
                                <Typography variant="h5">{formatMonto(totales.egresos.total)}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Gastado: {formatMonto(totales.egresos.ejecutado)}
                                </Typography>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Card sx={{ bgcolor: totales.gananciaProyectada >= 0 ? 'success.light' : 'error.light' }}>
                          <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <AccountBalanceWalletIcon sx={{ fontSize: 40, color: 'white' }} />
                              <Box>
                                <Typography variant="body2" sx={{ color: 'white' }}>Ganancia Proyectada</Typography>
                                <Typography variant="h5" sx={{ color: 'white' }}>{formatMonto(totales.gananciaProyectada)}</Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                  Actual: {formatMonto(totales.gananciaActual)}
                                </Typography>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  );
                })()}

                {/* Tabs */}
                <Paper sx={{ p: 2 }}>
                  <Tabs value={tabActivo} onChange={(e, v) => setTabActivo(v)}>
                    <Tab icon={<CategoryIcon />} iconPosition="start" label="Por Categoría" />
                    <Tab icon={<TimelineIcon />} iconPosition="start" label="Por Etapa" />
                    <Tab icon={<StorefrontIcon />} iconPosition="start" label="Por Proveedor" />
                  </Tabs>
                  
                  {/* Resumen de asignación del tab activo */}
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                      <Stack direction="row" spacing={3} alignItems="center">
                        <Box>
                          <Typography variant="caption" color="text.secondary">Presupuesto General</Typography>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {presupuestoGeneral > 0 ? (
                              <>
                                <Typography variant="h6">{formatMonto(presupuestoGeneral)}</Typography>
                                <Button 
                                  size="small" 
                                  onClick={() => {
                                    setEditarModal({ 
                                      open: true, 
                                      presupuestoId: calcularSumas.generalId, 
                                      montoActual: presupuestoGeneral, 
                                      label: 'General' 
                                    });
                                    setEdicionData({ nuevoMonto: presupuestoGeneral, motivo: '' });
                                  }}
                                >
                                  Editar
                                </Button>
                                {calcularSumas.generalHistorial?.length > 0 && (
                                  <Chip 
                                    label={`${calcularSumas.generalHistorial.length} cambios`} 
                                    size="small" 
                                    color="info" 
                                    variant="outlined"
                                    onClick={() => setHistorialModal({ 
                                      open: true, 
                                      historial: calcularSumas.generalHistorial, 
                                      label: 'General' 
                                    })}
                                    sx={{ cursor: 'pointer' }}
                                  />
                                )}
                              </>
                            ) : (
                              <Button size="small" variant="outlined" onClick={() => setPresupuestoGeneralModal(true)}>
                                Definir presupuesto
                              </Button>
                            )}
                          </Stack>
                        </Box>
                        <Divider orientation="vertical" flexItem />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Asignado por {tabActivo === 0 ? 'Categoría' : tabActivo === 1 ? 'Etapa' : 'Proveedor'}
                          </Typography>
                          <Typography variant="h6" color={
                            (tabActivo === 0 ? calcularSumas.porCategoria : tabActivo === 1 ? calcularSumas.porEtapa : calcularSumas.porProveedor) > presupuestoGeneral 
                              ? 'error.main' 
                              : 'text.primary'
                          }>
                            {formatMonto(tabActivo === 0 ? calcularSumas.porCategoria : tabActivo === 1 ? calcularSumas.porEtapa : calcularSumas.porProveedor)}
                          </Typography>
                        </Box>
                        <Divider orientation="vertical" flexItem />
                        <Box>
                          <Typography variant="caption" color="text.secondary">Sin asignar</Typography>
                          <Typography variant="h6" color={
                            presupuestoGeneral - (tabActivo === 0 ? calcularSumas.porCategoria : tabActivo === 1 ? calcularSumas.porEtapa : calcularSumas.porProveedor) < 0 
                              ? 'error.main' 
                              : 'success.main'
                          }>
                            {formatMonto(presupuestoGeneral - (tabActivo === 0 ? calcularSumas.porCategoria : tabActivo === 1 ? calcularSumas.porEtapa : calcularSumas.porProveedor))}
                          </Typography>
                        </Box>
                      </Stack>
                      {presupuestoGeneral > 0 && (
                        <Chip 
                          label={`${(((tabActivo === 0 ? calcularSumas.porCategoria : tabActivo === 1 ? calcularSumas.porEtapa : calcularSumas.porProveedor) / presupuestoGeneral) * 100).toFixed(0)}% asignado`}
                          color={(tabActivo === 0 ? calcularSumas.porCategoria : tabActivo === 1 ? calcularSumas.porEtapa : calcularSumas.porProveedor) > presupuestoGeneral ? 'error' : 'primary'}
                        />
                      )}
                    </Stack>
                  </Box>
                  
                  <Box sx={{ mt: 3 }}>
                    {/* TAB: POR CATEGORÍA */}
                    {tabActivo === 0 && (
                      <Stack spacing={2}>
                        {categorias.length === 0 ? (
                          <Typography color="text.secondary">No hay categorías configuradas en la empresa</Typography>
                        ) : (
                          categorias.map((cat) => {
                            const catName = cat.name || cat;
                            const data = getPresupuestoPorAgrupacion('categoria', catName);
                            return (
                              <PresupuestoItem 
                                key={catName}
                                label={catName}
                                presupuesto={data.presupuesto}
                                ejecutado={data.ejecutado}
                                formatMonto={formatMonto}
                                historial={data.historial}
                                moneda={data.moneda}
                                onCrear={() => setNuevoPresupuestoModal({ open: true, tipoAgrupacion: 'categoria', valor: catName })}
                                onAdicional={data.id ? () => setAdicionalModal({ open: true, presupuestoId: data.id }) : null}
                                onEditar={data.id ? () => {
                                  setEditarModal({ open: true, presupuestoId: data.id, montoActual: data.presupuesto, monedaActual: data.moneda || 'ARS', label: catName });
                                  setEdicionData({ nuevoMonto: data.presupuesto, motivo: '', nuevaMoneda: data.moneda || 'ARS' });
                                } : null}
                                onVerHistorial={data.historial?.length > 0 ? () => setHistorialModal({ open: true, historial: data.historial, label: catName }) : null}
                              />
                            );
                          })
                        )}
                      </Stack>
                    )}

                    {/* TAB: POR ETAPA */}
                    {tabActivo === 1 && (
                      <Stack spacing={2}>
                        {etapas.length === 0 ? (
                          <Typography color="text.secondary">No hay etapas configuradas</Typography>
                        ) : (
                          etapas.map((etapa) => {
                            const etapaName = etapa.nombre || etapa.name || etapa;
                            const data = getPresupuestoPorAgrupacion('etapa', etapaName);
                            return (
                              <PresupuestoItem 
                                key={etapaName}
                                label={etapaName}
                                presupuesto={data.presupuesto}
                                ejecutado={data.ejecutado}
                                formatMonto={formatMonto}
                                historial={data.historial}
                                moneda={data.moneda}
                                onCrear={() => setNuevoPresupuestoModal({ open: true, tipoAgrupacion: 'etapa', valor: etapaName })}
                                onAdicional={data.id ? () => setAdicionalModal({ open: true, presupuestoId: data.id }) : null}
                                onEditar={data.id ? () => {
                                  setEditarModal({ open: true, presupuestoId: data.id, montoActual: data.presupuesto, monedaActual: data.moneda || 'ARS', label: etapaName });
                                  setEdicionData({ nuevoMonto: data.presupuesto, motivo: '', nuevaMoneda: data.moneda || 'ARS' });
                                } : null}
                                onVerHistorial={data.historial?.length > 0 ? () => setHistorialModal({ open: true, historial: data.historial, label: etapaName }) : null}
                              />
                            );
                          })
                        )}
                      </Stack>
                    )}

                    {/* TAB: POR PROVEEDOR */}
                    {tabActivo === 2 && (
                      <Stack spacing={2}>
                        <Button 
                          variant="outlined" 
                          startIcon={<AddCircleIcon />}
                          onClick={() => setProveedorModal(true)}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          Agregar Proveedor
                        </Button>
                        
                        {proveedoresAgregados.length === 0 ? (
                          <Typography color="text.secondary">
                            No hay proveedores agregados. Usa el botón para agregar uno.
                          </Typography>
                        ) : (
                          proveedoresAgregados.map((proveedor) => {
                            const data = getPresupuestoPorAgrupacion('proveedor', proveedor);
                            return (
                              <PresupuestoItem 
                                key={proveedor}
                                label={proveedor}
                                presupuesto={data.presupuesto}
                                ejecutado={data.ejecutado}
                                formatMonto={formatMonto}
                                historial={data.historial}
                                moneda={data.moneda}
                                onCrear={() => setNuevoPresupuestoModal({ open: true, tipoAgrupacion: 'proveedor', valor: proveedor })}
                                onAdicional={data.id ? () => setAdicionalModal({ open: true, presupuestoId: data.id }) : null}
                                onEditar={data.id ? () => {
                                  setEditarModal({ open: true, presupuestoId: data.id, montoActual: data.presupuesto, monedaActual: data.moneda || 'ARS', label: proveedor });
                                  setEdicionData({ nuevoMonto: data.presupuesto, motivo: '', nuevaMoneda: data.moneda || 'ARS' });
                                } : null}
                                onVerHistorial={data.historial?.length > 0 ? () => setHistorialModal({ open: true, historial: data.historial, label: proveedor }) : null}
                              />
                            );
                          })
                        )}
                      </Stack>
                    )}
                  </Box>
                </Paper>
              </>
            )}

          </Stack>
        </Container>
      </Box>

      {/* Modal de Nuevo Presupuesto */}
      <Dialog open={nuevoPresupuestoModal.open} onClose={() => setNuevoPresupuestoModal({ open: false, tipoAgrupacion: null, valor: null })}>
        <DialogTitle>
          Crear Presupuesto: {nuevoPresupuestoModal.valor}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, minWidth: 300 }}>
            <Typography variant="body2" color="text.secondary">
              {nuevoPresupuestoModal.tipoAgrupacion === 'categoria' && 'Presupuesto para la categoría'}
              {nuevoPresupuestoModal.tipoAgrupacion === 'etapa' && 'Presupuesto para la etapa'}
              {nuevoPresupuestoModal.tipoAgrupacion === 'proveedor' && 'Presupuesto para el proveedor'}
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Monto"
                type="number"
                fullWidth
                value={nuevoPresupuesto.monto}
                onChange={(e) => setNuevoPresupuesto(prev => ({ ...prev, monto: e.target.value }))}
                autoFocus
              />
              <ToggleButtonGroup
                value={nuevoPresupuesto.moneda}
                exclusive
                onChange={(e, val) => val && setNuevoPresupuesto(prev => ({ ...prev, moneda: val }))}
                size="small"
              >
                <ToggleButton value="ARS">ARS</ToggleButton>
                <ToggleButton value="USD">USD</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNuevoPresupuestoModal({ open: false, tipoAgrupacion: null, valor: null })}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleCrearPresupuesto}>
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Adicional */}
      <Dialog open={adicionalModal.open} onClose={() => setAdicionalModal({ open: false, presupuestoId: null })}>
        <DialogTitle>Agregar Adicional</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, minWidth: 300 }}>
            <TextField
              label="Concepto"
              fullWidth
              value={nuevoAdicional.concepto}
              onChange={(e) => setNuevoAdicional(prev => ({ ...prev, concepto: e.target.value }))}
            />
            <TextField
              label="Monto"
              type="number"
              fullWidth
              value={nuevoAdicional.monto}
              onChange={(e) => setNuevoAdicional(prev => ({ ...prev, monto: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdicionalModal({ open: false, presupuestoId: null })}>Cancelar</Button>
          <Button variant="contained" onClick={handleAgregarAdicional}>Agregar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Agregar Proveedor */}
      <Dialog open={proveedorModal} onClose={() => setProveedorModal(false)}>
        <DialogTitle>Agregar Proveedor al Proyecto</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, minWidth: 350 }}>
            <Typography variant="body2" color="text.secondary">
              Seleccioná un proveedor de la empresa o escribí uno nuevo
            </Typography>
            <Autocomplete
              freeSolo
              options={proveedoresEmpresa.filter(p => p && !proveedoresAgregados.includes(p))}
              value={nuevoProveedor || ''}
              onChange={(e, newValue) => setNuevoProveedor(newValue || '')}
              onInputChange={(e, newInputValue) => setNuevoProveedor(newInputValue || '')}
              getOptionLabel={(option) => option || ''}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Proveedor"
                  placeholder="Buscar o escribir nuevo..."
                  autoFocus
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <StorefrontIcon fontSize="small" color="action" />
                    <Typography>{option}</Typography>
                  </Stack>
                </li>
              )}
              noOptionsText="No hay proveedores. Escribí para crear uno nuevo."
            />
            {nuevoProveedor && !proveedoresEmpresa.includes(nuevoProveedor) && (
              <Alert severity="info" icon={<AddCircleIcon />}>
                Se creará un nuevo proveedor: <strong>{nuevoProveedor}</strong>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProveedorModal(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAgregarProveedor} disabled={!nuevoProveedor.trim()}>Agregar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Presupuesto General */}
      <Dialog open={presupuestoGeneralModal} onClose={() => setPresupuestoGeneralModal(false)}>
        <DialogTitle>Definir Presupuesto General del Proyecto</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, minWidth: 350 }}>
            <Alert severity="info">
              El presupuesto general es el monto total destinado al proyecto. 
              Luego podrás distribuirlo por categoría, etapa o proveedor.
            </Alert>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Monto del Presupuesto General"
                type="number"
                fullWidth
                value={nuevoPresupuestoGeneral}
                onChange={(e) => setNuevoPresupuestoGeneral(e.target.value)}
                autoFocus
              />
              <ToggleButtonGroup
                value={monedaPresupuestoGeneral}
                exclusive
                onChange={(e, val) => val && setMonedaPresupuestoGeneral(val)}
                size="small"
              >
                <ToggleButton value="ARS">ARS</ToggleButton>
                <ToggleButton value="USD">USD</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresupuestoGeneralModal(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              try {
                await presupuestoService.crearPresupuesto({
                  empresa_id: empresaId,
                  proyecto_id: proyectoSeleccionado,
                  tipo: 'egreso',
                  monto: parseFloat(nuevoPresupuestoGeneral),
                  moneda: monedaPresupuestoGeneral
                });
                setAlert({ open: true, message: 'Presupuesto general creado', severity: 'success' });
                setPresupuestoGeneralModal(false);
                setNuevoPresupuestoGeneral('');
                setMonedaPresupuestoGeneral('ARS');
                cargarResumen();
              } catch (err) {
                setAlert({ open: true, message: 'Error al crear presupuesto', severity: 'error' });
              }
            }}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Ajuste del Presupuesto General */}
      <Dialog open={ajusteGeneralModal.open} onClose={() => setAjusteGeneralModal({ open: false, sumaHijos: 0, origen: '' })}>
        <DialogTitle>⚠️ Presupuesto excedido</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, minWidth: 380 }}>
            <Alert severity="warning">
              La suma de presupuestos por <strong>{ajusteGeneralModal.origen}</strong> supera el presupuesto general del proyecto.
            </Alert>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Presupuesto general actual:</Typography>
              <Typography fontWeight={600}>{formatMonto(presupuestoGeneral)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Suma por {ajusteGeneralModal.origen}:</Typography>
              <Typography fontWeight={600} color="error">{formatMonto(ajusteGeneralModal.sumaHijos)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Exceso:</Typography>
              <Typography fontWeight={600} color="error">
                +{formatMonto(ajusteGeneralModal.sumaHijos - presupuestoGeneral)}
              </Typography>
            </Stack>
            <Divider />
            <Typography variant="body2">
              ¿Desea ajustar el presupuesto general a {formatMonto(ajusteGeneralModal.sumaHijos)}?
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAjusteGeneralModal({ open: false, sumaHijos: 0, origen: '' })}>
            No, mantener actual
          </Button>
          <Button variant="contained" color="warning" onClick={handleAjustarGeneral}>
            Sí, ajustar a {formatMonto(ajusteGeneralModal.sumaHijos)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Edición de Presupuesto */}
      <Dialog open={editarModal.open} onClose={() => setEditarModal({ open: false, presupuestoId: null, montoActual: 0, monedaActual: 'ARS', label: '' })}>
        <DialogTitle>Editar Presupuesto: {editarModal.label}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, minWidth: 350 }}>
            <Alert severity="info">
              Monto actual: <strong>{formatMonto(editarModal.montoActual, editarModal.monedaActual)}</strong>
              {editarModal.monedaActual === 'USD' ? ' 🇺🇸' : ' 🇦🇷'}
            </Alert>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Nuevo Monto"
                type="number"
                fullWidth
                value={edicionData.nuevoMonto}
                onChange={(e) => setEdicionData(prev => ({ ...prev, nuevoMonto: e.target.value }))}
                autoFocus
              />
              <ToggleButtonGroup
                value={edicionData.nuevaMoneda}
                exclusive
                onChange={(e, val) => val && setEdicionData(prev => ({ ...prev, nuevaMoneda: val }))}
                size="small"
              >
                <ToggleButton value="ARS">ARS</ToggleButton>
                <ToggleButton value="USD">USD</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <TextField
              label="Motivo del cambio"
              fullWidth
              multiline
              rows={2}
              value={edicionData.motivo}
              onChange={(e) => setEdicionData(prev => ({ ...prev, motivo: e.target.value }))}
              placeholder="Ej: Ajuste por inflación, cambio de alcance, etc."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Button color="error" onClick={handleEliminarPresupuesto}>
            Eliminar
          </Button>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setEditarModal({ open: false, presupuestoId: null, montoActual: 0, monedaActual: 'ARS', label: '' })}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleEditarPresupuesto}>
              Guardar
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Modal de Historial */}
      <Dialog 
        open={historialModal.open} 
        onClose={() => setHistorialModal({ open: false, historial: [], label: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Historial de cambios: {historialModal.label}</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Concepto</TableCell>
                <TableCell align="right">Monto Anterior</TableCell>
                <TableCell align="right">Monto Nuevo</TableCell>
                <TableCell align="right">Diferencia</TableCell>
                <TableCell align="center">Moneda</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historialModal.historial
                .sort((a, b) => new Date(b.fecha?._seconds ? b.fecha._seconds * 1000 : b.fecha) - new Date(a.fecha?._seconds ? a.fecha._seconds * 1000 : a.fecha))
                .map((item, idx) => {
                  const fecha = item.fecha?._seconds 
                    ? new Date(item.fecha._seconds * 1000).toLocaleDateString('es-AR') 
                    : new Date(item.fecha).toLocaleDateString('es-AR');
                  const diferencia = (item.montoNuevo || 0) - (item.montoAnterior || 0);
                  const cambioMoneda = item.monedaAnterior && item.monedaNueva && item.monedaAnterior !== item.monedaNueva;
                  return (
                    <TableRow key={idx}>
                      <TableCell>{fecha}</TableCell>
                      <TableCell>
                        <Chip 
                          label={item.tipo === 'adicional' ? 'Adicional' : 'Edición'} 
                          size="small" 
                          color={item.tipo === 'adicional' ? 'primary' : 'secondary'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{item.concepto}</TableCell>
                      <TableCell align="right">{formatMonto(item.montoAnterior, item.monedaAnterior)}</TableCell>
                      <TableCell align="right">{formatMonto(item.montoNuevo, item.monedaNueva)}</TableCell>
                      <TableCell align="right" sx={{ color: diferencia >= 0 ? 'success.main' : 'error.main' }}>
                        {diferencia >= 0 ? '+' : ''}{formatMonto(diferencia, item.monedaNueva || item.monedaAnterior)}
                      </TableCell>
                      <TableCell align="center">
                        {cambioMoneda ? (
                          <Chip 
                            label={`${item.monedaAnterior} → ${item.monedaNueva}`}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {item.monedaNueva || item.monedaAnterior || '-'}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              {historialModal.historial.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">No hay cambios registrados</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistorialModal({ open: false, historial: [], label: '' })}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={alert.open} 
        autoHideDuration={4000} 
        onClose={() => setAlert(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={alert.severity}>{alert.message}</Alert>
      </Snackbar>
    </>
  );
};

ControlProyectoPage.getLayout = (page) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default ControlProyectoPage;
