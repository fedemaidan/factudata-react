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
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useRouter } from 'next/router';
import { useAuthContext } from 'src/contexts/auth-context';
import presupuestoService from 'src/services/presupuestoService';
import MonedasService from 'src/services/monedasService';
import { getEmpresaById, getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { formatCurrency, formatTimestamp } from 'src/utils/formatters';
import PresupuestoDrawer from 'src/components/PresupuestoDrawer';
import Tooltip from '@mui/material/Tooltip';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

// Helper: calcular totales de un resumen multimoneda (para ProyectoCard)
const calcularTotalesResumen = (resumen, tipoCambio = null, monedaVista = 'ARS') => {
  if (!resumen) return { egresosTotal: 0, egresosEjecutado: 0 };
  
  const cacIndice = resumen.cotizacionActual?.cac_indice || null;
  
  const convertir = (monto, monedaOriginal) => {
    if (monedaVista === monedaOriginal) return monto;
    if (!tipoCambio && monedaOriginal !== 'CAC') return monto;
    // ARS ↔ USD
    if (monedaVista === 'USD' && monedaOriginal === 'ARS') return tipoCambio ? monto / tipoCambio : monto;
    if (monedaVista === 'ARS' && monedaOriginal === 'USD') return tipoCambio ? monto * tipoCambio : monto;
    // CAC → ARS: monto_cac * cac_indice
    if (monedaOriginal === 'CAC' && monedaVista === 'ARS') return cacIndice ? monto * cacIndice : monto;
    // CAC → USD: (monto_cac * cac_indice) / tipoCambio
    if (monedaOriginal === 'CAC' && monedaVista === 'USD') return (cacIndice && tipoCambio) ? (monto * cacIndice) / tipoCambio : monto;
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
const PresupuestoItem = ({ label, presupuesto, ejecutado, formatMonto, onCrear, onAdicional, onEditar, onVerHistorial, historial, moneda, indexacion, baseCalculo }) => {
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
          <Tooltip title={moneda === 'USD' ? 'Dólares' : 'Pesos argentinos'} arrow>
            <Chip label={monedaLabel} size="small" variant="outlined" sx={{ minWidth: 32 }} />
          </Tooltip>
          {indexacion && (
            <Tooltip title={indexacion === 'CAC' ? 'Indexado por CAC (construcción)' : 'Indexado por dólar blue'} arrow>
              <Chip label={`idx ${indexacion}`} size="small" color="secondary" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
            </Tooltip>
          )}
          {baseCalculo === 'subtotal' && (
            <Tooltip title="Calcula ejecutado por subtotal neto (sin impuestos)" arrow>
              <Chip label="neto" size="small" color="default" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
            </Tooltip>
          )}
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
  
  // Estado de moneda y cotización
  const [moneda, setMoneda] = useState('ARS');
  const [tipoCambio, setTipoCambio] = useState(null);
  const [tipoCambioManual, setTipoCambioManual] = useState('');
  const [cotizacionCargada, setCotizacionCargada] = useState(false);
  
  // Categorías, etapas y proveedores configurados
  const [categorias, setCategorias] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [proveedoresAgregados, setProveedoresAgregados] = useState([]);
  const [proveedoresEmpresa, setProveedoresEmpresa] = useState([]);
  
  // Drawer de presupuesto (reemplaza todos los modals de presupuesto)
  const [drawerPresupuesto, setDrawerPresupuesto] = useState({
    open: false,
    mode: 'crear', // 'crear' | 'editar'
    tipoAgrupacion: null,
    valorAgrupacion: null,
    tipoDefault: 'egreso',
    presupuesto: null,
  });
  
  // Modal agregar proveedor (se mantiene como dialog simple)
  const [proveedorModal, setProveedorModal] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState('');
  
  // Modal de presupuesto general (se mantiene como dialog simple)
  const [presupuestoGeneralModal, setPresupuestoGeneralModal] = useState(false);
  const [nuevoPresupuestoGeneral, setNuevoPresupuestoGeneral] = useState('');
  const [monedaPresupuestoGeneral, setMonedaPresupuestoGeneral] = useState('ARS');

  // Cargar cotización del dólar
  useEffect(() => {
    const cargarCotizacion = async () => {
      try {
        const data = await MonedasService.listarDolar({ limit: 1 });
        if (data && data.length > 0) {
          const ultimo = data[0];
          // Usar blue promedio si existe, si no oficial
          const valor = ultimo.blue?.promedio || ultimo.blue?.venta || ultimo.oficial?.venta || null;
          if (valor) {
            setTipoCambio(valor);
            setCotizacionCargada(true);
          }
        }
      } catch (err) {
        console.error('No se pudo cargar cotización del dólar:', err);
      }
    };
    cargarCotizacion();
  }, []);

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

  // Helper: obtener todos los items de ingresos de todas las monedas
  const obtenerTodosLosItemsIngresos = () => {
    if (!resumen?.ingresosPorMoneda) return [];
    return Object.values(resumen.ingresosPorMoneda).flatMap(m => m.items || []);
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
  const cacIndiceActual = resumen?.cotizacionActual?.cac_indice || null;

  const convertir = (monto, monedaOriginal = 'ARS') => {
    // Si la moneda de visualización y la original son iguales, no convertir
    if (moneda === monedaOriginal) return monto;
    
    // ARS ↔ USD
    if (moneda === 'USD' && monedaOriginal === 'ARS') return tipoCambio ? monto / tipoCambio : monto;
    if (moneda === 'ARS' && monedaOriginal === 'USD') return tipoCambio ? monto * tipoCambio : monto;
    
    // CAC → ARS: monto_cac * cac_indice (presupuestos indexados por CAC vistos en ARS)
    if (monedaOriginal === 'CAC' && moneda === 'ARS') return cacIndiceActual ? monto * cacIndiceActual : monto;
    // CAC → USD: (monto_cac * cac_indice) / tipoCambio
    if (monedaOriginal === 'CAC' && moneda === 'USD') return (cacIndiceActual && tipoCambio) ? (monto * cacIndiceActual) / tipoCambio : monto;
    
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
      moneda: item.moneda || 'ARS',
      moneda_display: item.moneda_display || item.moneda || 'ARS',
      indexacion: item.indexacion || null,
      monto_ingresado: item.monto_ingresado || item.monto,
      base_calculo: item.base_calculo || 'total',
      cotizacion_snapshot: item.cotizacion_snapshot || null,
    };
  };

  // Handler unificado: cuando el drawer completa una operación
  const handleDrawerSuccess = (message) => {
    setAlert({ open: true, message, severity: 'success' });
    cargarResumen();
  };

  // Helper: abrir drawer para crear
  const abrirDrawerCrear = (tipoAgrupacion, valor, tipoDefault = 'egreso') => {
    setDrawerPresupuesto({
      open: true,
      mode: 'crear',
      tipoAgrupacion,
      valorAgrupacion: valor,
      tipoDefault,
      presupuesto: null,
    });
  };

  // Helper: abrir drawer para editar
  const abrirDrawerEditar = (item, label) => {
    setDrawerPresupuesto({
      open: true,
      mode: 'editar',
      tipoAgrupacion: null,
      valorAgrupacion: null,
      tipoDefault: 'egreso',
      presupuesto: {
        id: item.id,
        monto: item.monto || item.presupuesto,
        moneda: item.moneda || 'ARS',
        moneda_display: item.moneda_display || item.moneda || 'ARS',
        indexacion: item.indexacion || null,
        monto_ingresado: item.monto_ingresado || item.monto || item.presupuesto,
        base_calculo: item.base_calculo || 'total',
        tipo: item.tipo || 'egreso',
        label: label,
        historial: item.historial || [],
        ejecutado: item.ejecutado || 0,
        cotizacion_snapshot: item.cotizacion_snapshot || null,
      },
    });
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

  // Handler para crear nuevo presupuesto (solo para presupuesto general y ajustes)
  const handleCrearPresupuestoGeneral = async (monto, monedaVal) => {
    try {
      await presupuestoService.crearPresupuesto({
        empresa_id: empresaId,
        proyecto_id: proyectoSeleccionado,
        tipo: 'egreso',
        monto: parseFloat(monto),
        moneda: monedaVal || 'ARS'
      });
      setAlert({ open: true, message: 'Presupuesto creado correctamente', severity: 'success' });
      await cargarResumen();
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
        await handleCrearPresupuestoGeneral(ajusteGeneralModal.sumaHijos);
      }
      setAlert({ open: true, message: 'Presupuesto general ajustado', severity: 'success' });
      setAjusteGeneralModal({ open: false, sumaHijos: 0, origen: '' });
      cargarResumen();
    } catch (err) {
      setAlert({ open: true, message: 'Error al ajustar presupuesto', severity: 'error' });
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
              
              <Stack direction="row" spacing={2} alignItems="center">
                <ToggleButtonGroup
                  value={moneda}
                  exclusive
                  onChange={(e, val) => val && setMoneda(val)}
                  size="small"
                >
                  <ToggleButton value="ARS">ARS</ToggleButton>
                  <ToggleButton value="USD">USD</ToggleButton>
                </ToggleButtonGroup>

                {/* Indicadores de cotización */}
                <Stack direction="row" spacing={1} alignItems="center">
                  {cotizacionCargada && tipoCambio ? (
                    <Chip
                      label={`USD Blue: $${Number(tipoCambio).toLocaleString('es-AR')}`}
                      size="small"
                      color="info"
                      variant="outlined"
                      icon={<AttachMoneyIcon />}
                    />
                  ) : (
                    <TextField
                      label="Cotización USD"
                      type="number"
                      size="small"
                      sx={{ width: 160 }}
                      value={tipoCambioManual}
                      onChange={(e) => {
                        setTipoCambioManual(e.target.value);
                        const val = parseFloat(e.target.value);
                        if (val > 0) setTipoCambio(val);
                      }}
                      placeholder="Ej: 1450"
                      InputProps={{
                        startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>$</Typography>,
                      }}
                      helperText={!tipoCambio ? 'Requerido para convertir' : ''}
                      error={!tipoCambio}
                    />
                  )}
                </Stack>
                
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

            {!loading && !resumen && (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <ReceiptLongIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Cargando presupuestos del proyecto...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Si tarda demasiado, probá actualizando la página.
                </Typography>
              </Box>
            )}

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

                {/* Sección de Ingresos */}
                {(() => {
                  const itemsIngreso = obtenerTodosLosItemsIngresos();
                  const totales = calcularTotales();
                  return (
                    <Paper sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TrendingUpIcon color="success" />
                          <Typography variant="h6">Ingresos</Typography>
                          {itemsIngreso.length > 0 && (
                            <Chip label={`${itemsIngreso.length} presupuesto${itemsIngreso.length > 1 ? 's' : ''}`} size="small" variant="outlined" />
                          )}
                        </Stack>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={<AddCircleIcon />}
                          onClick={() => abrirDrawerCrear(null, 'Ingreso', 'ingreso')}
                        >
                          Crear presupuesto de ingreso
                        </Button>
                      </Stack>
                      {itemsIngreso.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                          <TrendingUpIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                          <Typography color="text.secondary" variant="body2">
                            No hay ingresos presupuestados.
                          </Typography>
                          <Typography color="text.secondary" variant="caption" sx={{ display: 'block', mb: 2 }}>
                            Creá un presupuesto de ingreso para controlar cobros al cliente.
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<AddCircleIcon />}
                            onClick={() => abrirDrawerCrear(null, 'Ingreso', 'ingreso')}
                          >
                            Crear presupuesto de ingreso
                          </Button>
                        </Box>
                      ) : (
                        <Stack spacing={1.5}>
                          {itemsIngreso.map((item) => {
                            const porcentaje = item.monto > 0 ? (item.ejecutado / item.monto) * 100 : 0;
                            const monedaItem = item.moneda || 'ARS';
                            const monedaLabel = monedaItem === 'USD' ? '🇺🇸' : '🇦🇷';
                            const label = [item.categoria, item.etapa, item.proveedor].filter(Boolean).join(' · ') || 'Ingreso general';
                            return (
                              <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography fontWeight={500}>{label}</Typography>
                                    <Tooltip title={monedaItem === 'USD' ? 'Dólares' : 'Pesos argentinos'} arrow>
                                      <Chip label={monedaLabel} size="small" variant="outlined" sx={{ minWidth: 32 }} />
                                    </Tooltip>
                                    {item.indexacion && (
                                      <Tooltip title={item.indexacion === 'CAC' ? 'Indexado por CAC' : 'Indexado por USD'} arrow>
                                        <Chip label={`idx ${item.indexacion}`} size="small" color="secondary" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
                                      </Tooltip>
                                    )}
                                    {item.base_calculo === 'subtotal' && (
                                      <Tooltip title="Calcula ejecutado por subtotal neto" arrow>
                                        <Chip label="neto" size="small" color="default" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
                                      </Tooltip>
                                    )}
                                  </Stack>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip label={`Pres: ${formatMonto(item.monto, monedaItem)}`} size="small" variant="outlined" />
                                    <Chip
                                      label={`Cobrado: ${formatMonto(item.ejecutado || 0, monedaItem)}`}
                                      size="small"
                                      color={porcentaje > 100 ? 'error' : 'success'}
                                    />
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => abrirDrawerEditar({ ...item, tipo: 'ingreso' }, label)}
                                    >
                                      Editar
                                    </Button>
                                    {item.historial?.length > 0 && (
                                      <Chip
                                        label={`${item.historial.length} cambios`}
                                        size="small"
                                        color="info"
                                        variant="outlined"
                                        onClick={() => abrirDrawerEditar({ ...item, tipo: 'ingreso' }, label)}
                                        sx={{ cursor: 'pointer' }}
                                      />
                                    )}
                                  </Stack>
                                </Stack>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(porcentaje, 100)}
                                  sx={{ mt: 1.5, height: 8, borderRadius: 4 }}
                                  color={porcentaje > 100 ? 'error' : porcentaje > 80 ? 'warning' : 'success'}
                                />
                                <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {porcentaje.toFixed(1)}% cobrado
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Pendiente: {formatMonto(item.monto - (item.ejecutado || 0), monedaItem)}
                                  </Typography>
                                </Stack>
                              </Paper>
                            );
                          })}
                        </Stack>
                      )}
                    </Paper>
                  );
                })()}

                {/* Tabs de Egresos */}
                <Paper sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <TrendingDownIcon color="error" />
                    <Typography variant="h6">Egresos</Typography>
                  </Stack>
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
                                    const generalItem = obtenerTodosLosItemsEgresos().find(i => !i.categoria && !i.etapa && !i.proveedor);
                                    if (generalItem) abrirDrawerEditar(generalItem, 'General');
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
                                    onClick={() => {
                                      const generalItem = obtenerTodosLosItemsEgresos().find(i => !i.categoria && !i.etapa && !i.proveedor);
                                      if (generalItem) abrirDrawerEditar(generalItem, 'General');
                                    }}
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
                          <Box sx={{ py: 4, textAlign: 'center' }}>
                            <CategoryIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                            <Typography color="text.secondary">No hay categorías configuradas en la empresa.</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Agregá categorías desde la configuración de la empresa para asignar presupuestos.
                            </Typography>
                          </Box>
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
                                indexacion={data.indexacion}
                                baseCalculo={data.base_calculo}
                                onCrear={() => abrirDrawerCrear('categoria', catName)}
                                onAdicional={data.id ? () => abrirDrawerEditar(data, catName) : null}
                                onEditar={data.id ? () => abrirDrawerEditar(data, catName) : null}
                                onVerHistorial={data.id && data.historial?.length > 0 ? () => abrirDrawerEditar(data, catName) : null}
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
                          <Box sx={{ py: 4, textAlign: 'center' }}>
                            <TimelineIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                            <Typography color="text.secondary">No hay etapas configuradas.</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Agregá etapas desde la configuración de la empresa para asignar presupuestos por etapa.
                            </Typography>
                          </Box>
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
                                indexacion={data.indexacion}
                                baseCalculo={data.base_calculo}
                                onCrear={() => abrirDrawerCrear('etapa', etapaName)}
                                onAdicional={data.id ? () => abrirDrawerEditar(data, etapaName) : null}
                                onEditar={data.id ? () => abrirDrawerEditar(data, etapaName) : null}
                                onVerHistorial={data.id && data.historial?.length > 0 ? () => abrirDrawerEditar(data, etapaName) : null}
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
                          <Box sx={{ py: 4, textAlign: 'center' }}>
                            <StorefrontIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                            <Typography color="text.secondary">
                              No hay proveedores agregados a este proyecto.
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                              Agregá proveedores para asignarles presupuesto individual.
                            </Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AddCircleIcon />}
                              onClick={() => setProveedorModal(true)}
                            >
                              Agregar proveedor
                            </Button>
                          </Box>
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
                                indexacion={data.indexacion}
                                baseCalculo={data.base_calculo}
                                onCrear={() => abrirDrawerCrear('proveedor', proveedor)}
                                onAdicional={data.id ? () => abrirDrawerEditar(data, proveedor) : null}
                                onEditar={data.id ? () => abrirDrawerEditar(data, proveedor) : null}
                                onVerHistorial={data.id && data.historial?.length > 0 ? () => abrirDrawerEditar(data, proveedor) : null}
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

      {/* Drawer de Presupuesto (crear/editar/adicional/historial) */}
      <PresupuestoDrawer
        open={drawerPresupuesto.open}
        onClose={() => setDrawerPresupuesto(prev => ({ ...prev, open: false }))}
        onSuccess={handleDrawerSuccess}
        mode={drawerPresupuesto.mode}
        empresaId={empresaId}
        proyectoId={proyectoSeleccionado}
        userId={user?.uid}
        tipoAgrupacion={drawerPresupuesto.tipoAgrupacion}
        valorAgrupacion={drawerPresupuesto.valorAgrupacion}
        tipoDefault={drawerPresupuesto.tipoDefault}
        proveedoresEmpresa={proveedoresEmpresa}
        presupuesto={drawerPresupuesto.presupuesto}
        onRecalcular={async (id) => {
          try {
            const { success } = await presupuestoService.recalcularPresupuesto(id, empresaId);
            if (success) {
              setAlert({ open: true, message: 'Presupuesto recalculado correctamente', severity: 'success' });
              cargarResumen();
            } else {
              setAlert({ open: true, message: 'No se pudo recalcular', severity: 'warning' });
            }
          } catch (err) {
            setAlert({ open: true, message: 'Error al recalcular', severity: 'error' });
          }
        }}
      />

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
                await handleCrearPresupuestoGeneral(nuevoPresupuestoGeneral, monedaPresupuestoGeneral);
                setPresupuestoGeneralModal(false);
                setNuevoPresupuestoGeneral('');
                setMonedaPresupuestoGeneral('ARS');
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