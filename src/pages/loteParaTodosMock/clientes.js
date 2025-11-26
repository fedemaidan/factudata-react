import Head from 'next/head';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TextField, Tooltip, Typography, Divider, MenuItem,
  TableSortLabel, Menu, ListItemIcon, ListItemText, InputAdornment, Drawer,
  Stepper, Step, StepLabel, Autocomplete, StepContent,
  Grid,
  Alert,
  Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import DownloadIcon from '@mui/icons-material/Download';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import GavelIcon from '@mui/icons-material/Gavel';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import LinkIcon from '@mui/icons-material/Link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';

import * as XLSX from 'xlsx';
import LoteParaTodosLayout from 'src/components/layouts/LoteParaTodosLayout';
import ClienteResumenDrawer from 'src/components/loteParaTodos/ClienteResumenDrawer';
import VentaWizard from 'src/components/loteParaTodos/ventas/VentaWizard';
import { 
  mockClientes, 
  getClienteById, 
  getClientesPorEmprendimiento, 
  getClientesPorEstado,
  getEstadisticasClientes,
  mockEmprendimientos,
  getEmprendimientosActivos,
  mockLotes,
  getLotesByEmprendimiento,
  getLotesByEstado,
  mockPlanes,
  getPlanesActivos,
  calcularFinanciacion,
  getClienteCompleto,
  getLoteCompleto
} from 'src/data/loteParaTodos/index';
import {
  ESTADO_CONTRATO,
  ESTADO_CONTRATO_LABELS,
  ESTADO_CONTRATO_COLORS,
  ESTADO_LEGAL,
  ESTADO_LEGAL_LABELS,
  ESTADO_LEGAL_COLORS
} from 'src/data/loteParaTodos/constantes';
import { 
  mockServicios, 
  getServiciosContratadosByCliente 
} from 'src/data/loteParaTodos/mockServicios';

const SERVICIO_CATALOGO_MAP = mockServicios.reduce((acc, servicio) => {
  acc[servicio.id] = servicio;
  return acc;
}, {});

const ESTADO_CONTRATO_OPTIONS = Object.entries(ESTADO_CONTRATO_LABELS).map(([value, label]) => ({ value, label }));
const ESTADO_LEGAL_OPTIONS = Object.entries(ESTADO_LEGAL_LABELS).map(([value, label]) => ({ value, label }));
const MONEDA_OPTIONS = [
  { value: 'ARS', label: 'Pesos (ARS)' },
  { value: 'USD', label: 'Dólares (USD)' }
];
const SERVICIO_CATEGORIAS_OPTIONS = [
  { value: 'agua', label: 'Agua' },
  { value: 'alambrado', label: 'Alambrado' },
  { value: 'corte_cesped', label: 'Corte de Césped' },
  { value: 'gas', label: 'Gas' },
  { value: 'instalacion', label: 'Instalación' },
  { value: 'mejoras', label: 'Mejoras' },
  { value: 'mantenimiento', label: 'Mantenimiento' }
];
const CATEGORIA_SERVICIO_LABELS = {
  agua: 'Agua',
  alambrado: 'Alambrado',
  corte_cesped: 'Corte de Césped',
  gas: 'Gas',
  instalacion: 'Instalación',
  mejoras: 'Mejoras',
  mantenimiento: 'Mantenimiento'
};

const colorForEstado = (estado) => {
  if (estado === 'PAGADO') return 'success.main';
  if (estado === 'AL_DIA') return 'info.main';
  if (estado === 'MORA') return 'error.main';
  if (estado === 'RESERVADO') return 'warning.main';
  if (estado === 'POTENCIAL') return 'text.secondary';
  return 'text.secondary';
};

const ClientesPage = () => {
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  
  // Cargar clientes al montar el componente
  React.useEffect(() => {
    // Cargar clientes con sus datos relacionales completos
    const clientesCompletos = mockClientes.map(cliente => {
      const clienteCompleto = getClienteCompleto(cliente.id);
      
      // Calcular datos agregados desde los contratos
      const contratos = clienteCompleto?.contratos || [];
      const lotesIds = contratos.map(c => c.lote_id);
      const lotesDetalle = lotesIds
        .map(id => mockLotes.find(l => l.id === id))
        .filter(Boolean);
      const emprendimientosIds = [...new Set(contratos.map(c => {
        const lote = mockLotes.find(l => l.id === c.lote_id);
        return lote?.emprendimiento_id;
      }).filter(Boolean))];
      const serviciosCliente = getServiciosContratadosByCliente(cliente.id).map(servicio => {
        const definicion = SERVICIO_CATALOGO_MAP[servicio.servicio_id] || {};
        return {
          ...servicio,
          categoria: definicion.categoria || 'otros',
          nombre_servicio: definicion.nombre || `Servicio ${servicio.servicio_id}`
        };
      });
      const serviciosCategoriasCliente = [...new Set(serviciosCliente.map(s => s.categoria).filter(Boolean))];
      const serviciosActivos = serviciosCliente.filter(s => ['activo', 'en_proceso'].includes(s.estado));
      const estadosLegales = lotesDetalle.map(lote => lote.estado_legal).filter(Boolean);
      const estadoLegalGeneral = estadosLegales.includes(ESTADO_LEGAL.BLOQUEADO)
        ? ESTADO_LEGAL.BLOQUEADO
        : estadosLegales.includes(ESTADO_LEGAL.EN_LEGALES)
          ? ESTADO_LEGAL.EN_LEGALES
          : estadosLegales.length > 0
            ? ESTADO_LEGAL.NORMAL
            : 'sin_info';
      const bloqueadoPorLegal = estadoLegalGeneral === ESTADO_LEGAL.BLOQUEADO;
      
      // Generar saldo realista basado en contratos
      let saldoTotal = 0;
      let estadoCuenta = 'POTENCIAL';
      
      // Determinar estado comercial principal (prioridad: Mora > Legales > Activo > Reserva > etc)
      let estadoContratoPrincipal = ESTADO_CONTRATO.PRE_RESERVA; // Default
      const estadosContratos = contratos.map(c => c.estado.toLowerCase());
      
      if (estadosContratos.some(e => ['mora', 'en_mora'].includes(e))) estadoContratoPrincipal = ESTADO_CONTRATO.MORA;
      else if (estadosContratos.some(e => ['legales', 'en_legales', 'bloqueado'].includes(e))) estadoContratoPrincipal = ESTADO_CONTRATO.LEGALES;
      else if (estadosContratos.some(e => ['activo'].includes(e))) estadoContratoPrincipal = ESTADO_CONTRATO.ACTIVO;
      else if (estadosContratos.some(e => ['reserva'].includes(e))) estadoContratoPrincipal = ESTADO_CONTRATO.RESERVA;
      else if (estadosContratos.some(e => ['pre_reserva', 'pre-reserva'].includes(e))) estadoContratoPrincipal = ESTADO_CONTRATO.PRE_RESERVA;
      else if (estadosContratos.some(e => ['rescindido'].includes(e))) estadoContratoPrincipal = ESTADO_CONTRATO.RESCINDIDO;
      else if (estadosContratos.some(e => ['cancelado'].includes(e))) estadoContratoPrincipal = ESTADO_CONTRATO.CANCELADO;
      else if (estadosContratos.some(e => ['finalizado', 'completado'].includes(e))) estadoContratoPrincipal = ESTADO_CONTRATO.FINALIZADO;
      else if (contratos.length === 0) estadoContratoPrincipal = 'sin_contrato';

      // Alertas
      const alertas = {
        mora: estadosContratos.some(e => ['mora', 'en_mora'].includes(e)),
        legales: estadosContratos.some(e => ['legales', 'en_legales', 'bloqueado'].includes(e)) || bloqueadoPorLegal,
        servicios: serviciosCliente.some(s => s.estado === 'mora' || s.estado === 'deuda'),
        sin_contrato: contratos.length === 0
      };

      if (contratos.length > 0) {
        // Generar saldos realistas para cada contrato
        contratos.forEach(contrato => {
          if (!contrato.saldo_pendiente || contrato.saldo_pendiente === 0) {
            // Generar saldo basado en el estado del contrato
            if (contrato.estado === 'ACTIVO') {
              // Entre 20% y 80% del precio acordado
              contrato.saldo_pendiente = Math.floor(contrato.precio_acordado * (0.2 + Math.random() * 0.6));
            } else if (contrato.estado === 'MORA') {
              // Entre 30% y 90% del precio acordado (más alto en mora)
              contrato.saldo_pendiente = Math.floor(contrato.precio_acordado * (0.3 + Math.random() * 0.6));
            } else if (contrato.estado === 'COMPLETADO') {
              contrato.saldo_pendiente = 0;
            } else if (contrato.estado === 'RESERVADO') {
              // Entre 80% y 95% del precio acordado
              contrato.saldo_pendiente = Math.floor(contrato.precio_acordado * (0.8 + Math.random() * 0.15));
            } else if (contrato.estado === 'CAIDO') {
              // Los caídos pueden tener deuda pendiente
              contrato.saldo_pendiente = Math.floor(contrato.precio_acordado * (0.1 + Math.random() * 0.4));
            }
          }
        });

        // Calcular saldo total desde contratos que generan deuda
        saldoTotal = contratos
          .filter(c => ['ACTIVO', 'MORA', 'RESERVADO', 'CAIDO'].includes(c.estado))
          .reduce((total, c) => total + (c.saldo_pendiente || 0), 0);
        
        // Determinar estado basado en contratos (Legacy para compatibilidad visual anterior)
        const tieneActivos = contratos.some(c => c.estado === 'ACTIVO');
        const tieneMora = contratos.some(c => c.estado === 'MORA');
        const todosPagados = contratos.every(c => c.saldo_pendiente === 0);
        
        if (tieneMora) estadoCuenta = 'MORA';
        else if (todosPagados && tieneActivos) estadoCuenta = 'PAGADO';  
        else if (tieneActivos) estadoCuenta = 'AL_DIA';
        else if (contratos.some(c => c.estado === 'RESERVADO')) estadoCuenta = 'RESERVADO';
      } else {
        // Clientes sin contratos pero que podrían tener saldo (por servicios, etc.)
        // Generar un saldo aleatorio pequeño para algunos clientes
        if (Math.random() > 0.7) { // 30% de clientes sin contratos tienen algo de saldo
          saldoTotal = Math.floor(Math.random() * 50000) + 5000; // Entre 5K y 55K
          estadoCuenta = 'POTENCIAL';
        }
      }
      
      return {
        ...cliente,
        contratos,
        lotes_ids: lotesIds,
        emprendimientos_ids: emprendimientosIds,
        emprendimiento_id: emprendimientosIds[0] || null, // Primer emprendimiento para compatibilidad
        lote_id: lotesIds[0] || null, // Primer lote para compatibilidad
        saldo_cuenta_corriente: saldoTotal,
        estado_cuenta: estadoCuenta,
        estado_contrato_principal: estadoContratoPrincipal,
        alertas,
        moneda: 'ARS', // Mockeado por ahora
        ultimo_pago: contratos
          .filter(c => c.ultimo_pago)
          .sort((a, b) => new Date(b.ultimo_pago) - new Date(a.ultimo_pago))[0]?.ultimo_pago || null,
        estado_legal_general: estadoLegalGeneral,
        legal_bloqueado: bloqueadoPorLegal,
        servicios_categorias: serviciosCategoriasCliente,
        servicios_detalle: serviciosCliente,
        servicios_activos_count: serviciosActivos.length
      };
    });
    
    setClientes(clientesCompletos);
  }, []);
  const [emprendimientos] = useState(mockEmprendimientos);
  const [lotes] = useState(mockLotes);
  const [planes] = useState(mockPlanes);
  const [filters, setFilters] = useState({
    global: '',
    nombre: '',
    dni: '',
    email: '',
    telefono: '',
    emprendimiento_id: '',
    estado_cuenta: '', // Legacy
    estado_contrato: '', // Nuevo
    moneda: '', // Nuevo
    lote_id: '',
    estado_legal: '',
    servicio_categoria: ''
  });
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [openCuenta, setOpenCuenta] = useState(false);
  const [openClienteDrawer, setOpenClienteDrawer] = useState(false);
  const [openVentaDrawer, setOpenVentaDrawer] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [openResumenDrawer, setOpenResumenDrawer] = useState(false);
  const [clienteResumenSeleccionado, setClienteResumenSeleccionado] = useState(null);
  const [anchorMenu, setAnchorMenu] = useState(null);
  const [menuCliente, setMenuCliente] = useState(null);
  const [lotesDisponibles, setLotesDisponibles] = useState([]);
  const [emprendimientoSeleccionado, setEmprendimientoSeleccionado] = useState(null);

  const emprendimientosActivos = useMemo(() => getEmprendimientosActivos(), []);
  const planesActivos = useMemo(() => getPlanesActivos(), []);
  const estados = ['PAGADO', 'AL_DIA', 'MORA', 'RESERVADO', 'POTENCIAL'];
  
  // Datos para el formulario de contrato
  const barrios = ['Centro', 'Norte', 'Sur', 'Este', 'Oeste'];
  const titulares = clientes.map(c => ({ id: c.id, nombre: c.nombre }));
  const vendedores = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Martínez'];
  const gremios = ['Construcción', 'Comercio', 'Docentes', 'Bancarios'];
  const frecuenciasActualizacion = ['Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual'];
  const frecuenciasRevision = ['12 meses', '24 meses', '36 meses'];
  const opcionesIndiceRevision = ['IPC', 'UVA', 'Dólar', 'Fijo'];
  
  // --- FILTROS ---
  const handleChangeFilter = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));
  const clearFilters = () => {
    setFilters({
      global: '',
      nombre: '',
      dni: '',
      email: '',
      telefono: '',
      emprendimiento_id: '',
      estado_cuenta: '',
      estado_contrato: '',
      moneda: '',
      lote_id: '',
      estado_legal: '',
      servicio_categoria: ''
    });
  };

  const filtered = useMemo(() => clientes.filter(c => {
    const match = (field) => !filters[field] || (c[field] || '').toLowerCase().includes(filters[field].toLowerCase());
    const matchEstado = () => !filters.estado_cuenta || c.estado_cuenta === filters.estado_cuenta;
    const matchEstadoContrato = () => !filters.estado_contrato || c.estado_contrato_principal === filters.estado_contrato;
    const matchMoneda = () => !filters.moneda || c.moneda === filters.moneda;
    const matchEstadoLegal = () => !filters.estado_legal || c.estado_legal_general === filters.estado_legal;
    const matchServicioCategoria = () => !filters.servicio_categoria ||
      ((c.servicios_categorias || []).includes(filters.servicio_categoria));

    // Filtros específicos para emprendimiento y lote (buscar en arrays)
    const matchEmprendimiento = !filters.emprendimiento_id || 
      (c.emprendimientos_ids && c.emprendimientos_ids.includes(parseInt(filters.emprendimiento_id)));
    
    const matchLote = !filters.lote_id || 
      (c.lotes_ids && c.lotes_ids.includes(parseInt(filters.lote_id)));

    const normalizedGlobal = filters.global.trim().toLowerCase();
    const matchGlobal = () => {
      if (!normalizedGlobal) return true;
      const baseFields = [
        c.id,
        c.nombre,
        c.apellido,
        c.dni,
        c.email,
        c.telefono,
        c.telefonoFijo,
        c.telefonoMovil2,
        c.ocupacion,
        c.estado_cuenta,
        c.ultimo_pago
      ];

      const contratoFields = (c.contratos || []).flatMap((contrato) => [
        contrato.id,
        contrato.estado,
        contrato.vendedor,
        contrato.plan_nombre,
        contrato.numero_contrato
      ]);

      const relacionCampos = (c.lotes_ids || []).flatMap((loteId) => {
        const lote = lotes.find((l) => l.id === loteId);
        if (!lote) return [];
        const emprendimiento = emprendimientos.find((e) => e.id === lote.emprendimiento_id);
        return [
          lote.numero,
          lote.manzana,
          lote.estado,
          emprendimiento?.nombre,
          emprendimiento?.ubicacion
        ];
      });

      return [...baseFields, ...contratoFields, ...relacionCampos]
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(normalizedGlobal));
    };

    return matchGlobal() &&
      match('nombre') && 
      match('dni') && 
      match('email') && 
      match('telefono') && 
      matchEmprendimiento && 
      matchLote && 
      matchEstado() &&
      matchEstadoContrato() &&
      matchMoneda() &&
      matchEstadoLegal() &&
      matchServicioCategoria();
  }), [clientes, filters, emprendimientos, lotes]);  // --- ORDENAMIENTO ---
  const sorted = useMemo(() => {
    if (!sortConfig.field) return filtered;
    return [...filtered].sort((a, b) => {
      const valA = (a[sortConfig.field] || '').toString().toLowerCase();
      const valB = (b[sortConfig.field] || '').toString().toLowerCase();
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortConfig]);

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // --- PAGINACIÓN ---
  const totalRows = sorted.length;
  const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  // --- ACCIONES ---
  const openEstadoCuenta = (c) => { setClienteSeleccionado(c); setOpenCuenta(true); };
  const openResumenCliente = (cliente) => { 
    setClienteResumenSeleccionado(cliente); 
    setOpenResumenDrawer(true); 
  };
  const deleteCliente = (id) => { if (confirm('¿Eliminar este cliente definitivamente?')) setClientes(prev => prev.filter(c => c.id !== id)); };
  const exportToExcel = () => {
    const data = filtered.map(({ id, ...rest }) => rest);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'clientes.xlsx');
  };

  // --- MENU ACCIONES ---
  const openMenu = (event, cliente) => { setAnchorMenu(event.currentTarget); setMenuCliente(cliente); };
  const closeMenu = () => { setAnchorMenu(null); setMenuCliente(null); };

  // --- INDICADORES ---
  const stats = useMemo(() => {
    // Contar estados desde los clientes procesados (no desde función externa)
    const conteos = clientes.reduce((acc, cliente) => {
      const estado = cliente.estado_cuenta;
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    return {
      total: clientes.length,
      pagado: conteos.PAGADO || 0,
      alDia: conteos.AL_DIA || 0,
      mora: conteos.MORA || 0,
      reservado: conteos.RESERVADO || 0,
      potencial: conteos.POTENCIAL || 0
    };
  }, [clientes]);
  const legalStats = useMemo(() => (
    clientes.reduce((acc, cliente) => {
      const estado = cliente.estado_legal_general || 'sin_info';
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {})
  ), [clientes]);
  const toggleEstadoFilter = (estado) => setFilters(prev => ({ ...prev, estado_cuenta: prev.estado_cuenta === estado ? '' : estado }));

  // --- FORMULARIO NUEVO / EDITAR ---
  const initialForm = { 
    nombre: '', apellido: '', dni: '', nroCuitCuil: '', ocupacion: '',
    telefonoFijo: '', telefono: '', telefonoMovil2: '', 
    domicilio: '', direccion: '', localidad: '', codPostal: '',
    email: '', claveWeb: '', fecha_nacimiento: '', estado_civil: '',
    // Datos de contacto de emergencia
    nombreContacto: '', apellidoContacto: '', domicilioContacto: '', 
    localidadContacto: '', codPostalContacto: '', telContacto: '',
    emailContacto: '', parentescoContacto: '',
    aceptaPromoADL: 'NO'
  };
  const [formData, setFormData] = useState(initialForm);

  const openNuevoCliente = () => {
    setEditingCliente(null);
    setFormData(initialForm);
    setOpenClienteDrawer(true);
  };

  const openEditarCliente = (cliente) => {
    setEditingCliente(cliente);
    // Separar nombre y apellido si es posible
    const nombreCompleto = cliente.nombre || '';
    const partesNombre = nombreCompleto.split(' ');
    const nombre = partesNombre[0] || '';
    const apellido = partesNombre.slice(1).join(' ') || '';
    
    setFormData({
      ...initialForm,
      ...cliente,
      nombre,
      apellido
    });
    setOpenClienteDrawer(true);
  };

  const saveCliente = () => {
    if (!formData.nombre || !formData.dni) return alert('Nombre y DNI son obligatorios');
    
    // Combinar nombre y apellido para mantener compatibilidad con la tabla
    const clienteData = {
      ...formData,
      nombre: formData.apellido ? `${formData.nombre} ${formData.apellido}` : formData.nombre
    };
    
    if (editingCliente) {
      setClientes(prev => prev.map(c => c.id === editingCliente.id ? { ...clienteData, id: editingCliente.id } : c));
    } else {
      const id = Math.max(...clientes.map(c => c.id)) + 1;
      setClientes(prev => [...prev, { id, ...clienteData }]);
    }
    setOpenClienteDrawer(false);
    setEditingCliente(null);
    setFormData(initialForm);
  };



  return (
    <LoteParaTodosLayout currentModule="clientes" pageTitle="Gestión de Clientes">
      <Head><title>Clientes - Lote Para Todos</title></Head>
          {/* HEADER */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" rowGap={2}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Listado de Clientes</Typography>
                <Typography variant="body2" color="text.secondary">
                  Administra todos los clientes y sus contratos
                </Typography>
              </Box>
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  size="small"
                  placeholder="Buscar por nombre, contrato, lote o vendedor"
                  value={filters.global}
                  onChange={(e) => handleChangeFilter('global', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color={filters.global ? 'primary' : 'action'} />
                      </InputAdornment>
                    )
                  }}
                  sx={{ minWidth: { xs: '100%', sm: 260, md: 320 } }}
                />
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenClienteDrawer(true)}>Nuevo cliente</Button>
                <Button variant="contained" color="secondary" onClick={() => { setOpenVentaDrawer(true); setActiveStep(0); }}>Venta de Lote</Button>
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportToExcel}>EXCEL</Button>
                <Button variant="text" startIcon={<FilterAltOffIcon />} onClick={clearFilters}>Limpiar</Button>
              </Stack>
            </Stack>
          </Paper>

          {/* INDICADORES */}
          <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap">
            <Chip color="default" label={`Total: ${stats.total}`} />
            <Chip color="success" clickable onClick={() => toggleEstadoFilter('PAGADO')} 
                  label={`Pagado: ${stats.pagado}`} 
                  variant={filters.estado_cuenta === 'PAGADO' ? 'filled' : 'outlined'} />
            <Chip color="info" clickable onClick={() => toggleEstadoFilter('AL_DIA')} 
                  label={`Al día: ${stats.alDia}`} 
                  variant={filters.estado_cuenta === 'AL_DIA' ? 'filled' : 'outlined'} />
            <Chip color="error" clickable onClick={() => toggleEstadoFilter('MORA')} 
                  label={`Mora: ${stats.mora}`} 
                  variant={filters.estado_cuenta === 'MORA' ? 'filled' : 'outlined'} />
            <Chip color="warning" clickable onClick={() => toggleEstadoFilter('RESERVADO')} 
                  label={`Reservado: ${stats.reservado}`} 
                  variant={filters.estado_cuenta === 'RESERVADO' ? 'filled' : 'outlined'} />
            <Chip color="default" clickable onClick={() => toggleEstadoFilter('POTENCIAL')} 
                  label={`Potencial: ${stats.potencial}`} 
                  variant={filters.estado_cuenta === 'POTENCIAL' ? 'filled' : 'outlined'} />
    <Chip
      icon={<GavelIcon />}
      color="success"
      variant={filters.estado_legal === ESTADO_LEGAL.NORMAL ? 'filled' : 'outlined'}
      onClick={() => handleChangeFilter('estado_legal', filters.estado_legal === ESTADO_LEGAL.NORMAL ? '' : ESTADO_LEGAL.NORMAL)}
      label={`Legal OK: ${legalStats[ESTADO_LEGAL.NORMAL] || 0}`}
    />
    <Chip
      icon={<GavelIcon />}
      color="warning"
      variant={filters.estado_legal === ESTADO_LEGAL.EN_LEGALES ? 'filled' : 'outlined'}
      onClick={() => handleChangeFilter('estado_legal', filters.estado_legal === ESTADO_LEGAL.EN_LEGALES ? '' : ESTADO_LEGAL.EN_LEGALES)}
      label={`En legales: ${legalStats[ESTADO_LEGAL.EN_LEGALES] || 0}`}
    />
    <Chip
      icon={<GavelIcon />}
      color="error"
      variant={filters.estado_legal === ESTADO_LEGAL.BLOQUEADO ? 'filled' : 'outlined'}
      onClick={() => handleChangeFilter('estado_legal', filters.estado_legal === ESTADO_LEGAL.BLOQUEADO ? '' : ESTADO_LEGAL.BLOQUEADO)}
      label={`Bloqueado: ${legalStats[ESTADO_LEGAL.BLOQUEADO] || 0}`}
    />
          </Stack>

          {/* TABLA */}
          <Paper sx={{ p: 1 }}>
            <Box sx={{ px: 1.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Estado Contrato"
                    value={filters.estado_contrato}
                    onChange={(e) => handleChangeFilter('estado_contrato', e.target.value)}
                    size="small"
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {ESTADO_CONTRATO_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Moneda"
                    value={filters.moneda}
                    onChange={(e) => handleChangeFilter('moneda', e.target.value)}
                    size="small"
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {MONEDA_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Estado legal"
                    value={filters.estado_legal}
                    onChange={(e) => handleChangeFilter('estado_legal', e.target.value)}
                    size="small"
                  >
                    {ESTADO_LEGAL_OPTIONS.map((option) => (
                      <MenuItem key={option.value || 'all-legal'} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Servicios contratados"
                    helperText="Filtra por categoría clave"
                    value={filters.servicio_categoria}
                    onChange={(e) => handleChangeFilter('servicio_categoria', e.target.value)}
                    size="small"
                  >
                    <MenuItem value="">Todos los servicios</MenuItem>
                    {SERVICIO_CATEGORIAS_OPTIONS.map((categoria) => (
                      <MenuItem key={categoria.value} value={categoria.value}>
                        {categoria.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Box>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {['nombre', 'contacto', 'emprendimiento', 'lotes', 'saldo', 'estado_contrato'].map((field) => (
                      <TableCell key={field} sx={{ py: 0.5 }}>
                        <TableSortLabel
                          active={sortConfig.field === field}
                          direction={sortConfig.field === field ? sortConfig.direction : 'asc'}
                          onClick={() => handleSort(field)}
                        >
                          {field === 'nombre' && 'Cliente'}
                          {field === 'contacto' && 'Contacto'}
                          {field === 'emprendimiento' && 'Emprendimiento'}
                          {field === 'lotes' && 'Lotes'}
                          {field === 'saldo' && 'Saldo CC'}
                          {field === 'estado_contrato' && 'Estado'}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={{ py: 0.5 }}>Acciones</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><TextField size="small" value={filters.nombre} onChange={(e) => handleChangeFilter('nombre', e.target.value)} fullWidth placeholder="Nombre o DNI" /></TableCell>
                    <TableCell><TextField size="small" value={filters.telefono} onChange={(e) => handleChangeFilter('telefono', e.target.value)} fullWidth placeholder="Tel / Email" /></TableCell>
                    <TableCell>
                      <TextField size="small" select fullWidth value={filters.emprendimiento_id} onChange={(e) => handleChangeFilter('emprendimiento_id', e.target.value)}>
                        <MenuItem value="">Todos</MenuItem>
                        {emprendimientosActivos.map((e) => <MenuItem key={e.id} value={e.id}>{e.nombre}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      {/* Filtro por lotes */}
                    </TableCell>
                    <TableCell>
                       <TextField size="small" select fullWidth value={filters.moneda} onChange={(e) => handleChangeFilter('moneda', e.target.value)}>
                        <MenuItem value="">Todas</MenuItem>
                        {MONEDA_OPTIONS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField size="small" select fullWidth value={filters.estado_contrato} onChange={(e) => handleChangeFilter('estado_contrato', e.target.value)}>
                        <MenuItem value="">Todos</MenuItem>
                        {ESTADO_CONTRATO_OPTIONS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginated.map((c) => {
                    // Obtener primer emprendimiento del cliente (puede tener varios)
                    const emprendimiento = emprendimientos.find(e => e.id === c.emprendimiento_id);
                    
                    return (
                      <TableRow 
                        key={c.id} 
                        hover 
                        onClick={() => openResumenCliente(c)}
                        sx={{ '& td': { py: 0.6, fontSize: '0.85rem' }, cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{c.nombre}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {c.dni}
                            </Typography>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" mt={0.5} useFlexGap>
                              <Chip
                                size="small"
                                icon={<GavelIcon sx={{ fontSize: 14 }} />}
                                label={c.estado_legal_general === 'sin_info'
                                  ? 'Legal pendiente'
                                  : `Legal: ${ESTADO_LEGAL_LABELS[c.estado_legal_general] || 'Sin dato'}`}
                                color={ESTADO_LEGAL_COLORS[c.estado_legal_general] || 'default'}
                                variant={c.estado_legal_general === ESTADO_LEGAL.NORMAL ? 'outlined' : 'filled'}
                              />
                              {(c.servicios_categorias || []).slice(0, 2).map((categoria) => (
                                <Chip
                                  key={`${c.id}-${categoria}`}
                                  size="small"
                                  icon={<BuildCircleIcon sx={{ fontSize: 14 }} />}
                                  label={CATEGORIA_SERVICIO_LABELS[categoria] || categoria}
                                  variant="outlined"
                                  color={c.servicios_activos_count > 0 ? 'info' : 'default'}
                                />
                              ))}
                            </Stack>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{c.telefono}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {emprendimiento ? (
                            <Box>
                              <Typography variant="body2">{emprendimiento.nombre}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {emprendimiento.ubicacion}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.lotes_ids && c.lotes_ids.length > 0 ? (
                            <Box>
                              {c.lotes_ids.slice(0, 2).map((loteId, index) => {
                                const lote = lotes.find(l => l.id === loteId);
                                return lote ? (
                                  <Typography key={loteId} variant="body2" fontWeight={600}>
                                    {lote.numero}{index === 0 && c.lotes_ids.length > 1 ? ', ' : ''}
                                  </Typography>
                                ) : null;
                              })}
                              {c.lotes_ids.length > 2 && (
                                <Typography variant="caption" color="text.secondary">
                                  +{c.lotes_ids.length - 2} más
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">Sin lotes</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            fontWeight={600}
                            color={
                              c.estado_contrato_principal === ESTADO_CONTRATO.ACTIVO ? 'success.main' :
                              c.estado_contrato_principal === ESTADO_CONTRATO.MORA ? 'error.main' :
                              'text.primary'
                            }
                          >
                            ${c.saldo_cuenta_corriente?.toLocaleString('es-AR') || '0'}
                          </Typography>
                          <Chip size="small" label={c.moneda || 'ARS'} variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Chip 
                              size="small"
                              label={ESTADO_CONTRATO_LABELS[c.estado_contrato_principal] || c.estado_contrato_principal}
                              color={ESTADO_CONTRATO_COLORS[c.estado_contrato_principal] || 'default'}
                            />
                            <Stack direction="row" spacing={0.5}>
                              {c.alertas?.mora && (
                                <Tooltip title="Cliente en Mora">
                                  <WarningIcon color="error" fontSize="small" />
                                </Tooltip>
                              )}
                              {c.alertas?.legales && (
                                <Tooltip title="En proceso legal">
                                  <GavelIcon color="warning" fontSize="small" />
                                </Tooltip>
                              )}
                              {c.alertas?.sin_contrato && (
                                <Tooltip title="Sin contrato activo">
                                  <InfoIcon color="info" fontSize="small" />
                                </Tooltip>
                              )}
                            </Stack>
                          </Stack>
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Button 
                              size="small" 
                              variant="contained" 
                              onClick={() => openResumenCliente(c)}
                              sx={{ minWidth: 'auto', px: 1 }}
                            >
                              Ir a Ficha
                            </Button>
                            <IconButton size="small" onClick={(e) => openMenu(e, c)}>
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {totalRows === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 2 }}>
                        <Typography variant="body2" color="text.secondary">No hay clientes con estos filtros.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={totalRows}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 15, 25, 50]}
              labelRowsPerPage="Filas"
            />
          </Paper>

          {/* MENU ACCIONES */}
          <Menu anchorEl={anchorMenu} open={Boolean(anchorMenu)} onClose={closeMenu}>
            <MenuItem onClick={() => { openResumenCliente(menuCliente); closeMenu(); }}>
              <ListItemIcon><AssignmentIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Ver resumen completo</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { 
              navigator.clipboard.writeText(`https://portal.loteparatodos.com/cliente/${menuCliente?.id}`);
              alert('Enlace copiado al portapapeles');
              closeMenu(); 
            }}>
              <ListItemIcon><LinkIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Copiar enlace Portal</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { openEstadoCuenta(menuCliente); closeMenu(); }}>
              <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Ver estado de cuenta</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { openEditarCliente(menuCliente); closeMenu(); }}>
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Editar</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { deleteCliente(menuCliente.id); closeMenu(); }}>
              <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
              <ListItemText sx={{ color: 'error.main' }}>Eliminar</ListItemText>
            </MenuItem>
          </Menu>

          {/* MODAL ESTADO DE CUENTA */}
          <Dialog open={openCuenta} onClose={() => setOpenCuenta(false)} fullWidth maxWidth="lg">
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6">
                  Estado de Cuenta - {clienteSeleccionado?.nombre} {clienteSeleccionado?.apellido}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  DNI: {clienteSeleccionado?.dni} | Tel: {clienteSeleccionado?.telefono}
                </Typography>
              </Box>
              <Chip 
                label={clienteSeleccionado?.estado_cuenta} 
                color={
                  clienteSeleccionado?.estado_cuenta === 'PAGADO' ? 'success' :
                  clienteSeleccionado?.estado_cuenta === 'AL_DIA' ? 'info' :
                  clienteSeleccionado?.estado_cuenta === 'MORA' ? 'error' :
                  clienteSeleccionado?.estado_cuenta === 'RESERVADO' ? 'warning' : 'default'
                }
                size="small"
              />
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
              {clienteSeleccionado && (
                <Box>
                  {/* RESUMEN GENERAL */}
                  <Box sx={{ bgcolor: 'grey.50', p: 3, borderBottom: '1px solid #e0e0e0' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
                          <Typography variant="h6" color="info.main">
                            Saldo Total
                          </Typography>
                          <Typography 
                            variant="h4" 
                            fontWeight="bold"
                            color={
                              clienteSeleccionado.estado_cuenta === 'PAGADO' || clienteSeleccionado.estado_cuenta === 'AL_DIA' ? 'success.main' :
                              clienteSeleccionado.estado_cuenta === 'MORA' ? 'error.main' :
                              'text.primary'
                            }
                          >
                            ${clienteSeleccionado.saldo_cuenta_corriente?.toLocaleString('es-AR') || '0'}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h6" color="text.secondary">
                            Contratos Activos
                          </Typography>
                          <Typography variant="h4" fontWeight="bold" color="primary.main">
                            {clienteSeleccionado.contratos?.length || 0}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h6" color="text.secondary">
                            Último Pago
                          </Typography>
                          <Typography variant="h4" fontWeight="bold">
                            {clienteSeleccionado.ultimo_pago || 'N/A'}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* CONTRATOS DEL CLIENTE */}
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                      📋 Contratos y Relación con Saldo
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      El saldo total se calcula sumando los saldos pendientes de todos los contratos activos del cliente.
                    </Typography>
                    
                    {clienteSeleccionado.contratos && clienteSeleccionado.contratos.length > 0 ? (
                      <TableContainer component={Paper} variant="outlined">
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                              <TableCell><strong>Contrato #</strong></TableCell>
                              <TableCell><strong>Lote</strong></TableCell>
                              <TableCell><strong>Emprendimiento</strong></TableCell>
                              <TableCell><strong>Estado Contrato</strong></TableCell>
                              <TableCell><strong>Precio Total</strong></TableCell>
                              <TableCell><strong>Saldo Pendiente</strong></TableCell>
                              <TableCell><strong>Acciones</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {clienteSeleccionado.contratos.map((contrato) => {
                              const lote = lotes.find(l => l.id === contrato.lote_id);
                              const emprendimiento = emprendimientos.find(e => e.id === lote?.emprendimiento_id);
                              return (
                                <TableRow key={contrato.id}>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight="bold">
                                      #{contrato.id}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {lote ? `${lote.numero} - Mza. ${lote.manzana}` : 'N/A'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {emprendimiento?.nombre || 'N/A'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={contrato.estado} 
                                      size="small"
                                      color={
                                        contrato.estado === 'ACTIVO' ? 'success' :
                                        contrato.estado === 'COMPLETADO' ? 'info' :
                                        contrato.estado === 'MORA' ? 'error' :
                                        'default'
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight="500">
                                      ${contrato.precio_acordado?.toLocaleString('es-AR')}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography 
                                      variant="body2" 
                                      fontWeight="500"
                                      color={contrato.saldo_pendiente > 0 ? 'error.main' : 'success.main'}
                                    >
                                      ${contrato.saldo_pendiente?.toLocaleString('es-AR')}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Button 
                                      size="small" 
                                      variant="outlined"
                                      onClick={() => {
                                        setOpenCuenta(false);
                                        router.push(`/loteParaTodosMock/contratos/${contrato.id}`);
                                      }}
                                    >
                                      Ver Detalle
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          Este cliente no tiene contratos registrados.
                        </Typography>
                      </Alert>
                    )}
                  </Box>

                  {/* EXPLICACIÓN DEL CÁLCULO */}
                  <Box sx={{ p: 3, bgcolor: 'info.light' }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      ℹ️ ¿Cómo se calcula el estado de cuenta?
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Estado AL_DIA:</strong> Todos los contratos están al día con sus pagos.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Estado MORA:</strong> Al menos un contrato tiene pagos vencidos.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Estado PAGADO:</strong> Todos los contratos están completamente pagados.
                    </Typography>
                    <Typography variant="body2">
                      <strong>Saldo Total:</strong> Suma de todos los saldos pendientes de contratos activos.
                    </Typography>
                  </Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenCuenta(false)}>Cerrar</Button>
            </DialogActions>
          </Dialog>

          {/* DRAWER NUEVO / EDITAR CLIENTE */}
          <Drawer 
            anchor="right" 
            open={openClienteDrawer} 
            onClose={() => setOpenClienteDrawer(false)}
            PaperProps={{ sx: { width: 800 } }}
          >
            <Box sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h4" sx={{ mb: 4, fontWeight: 600, color: 'primary.main' }}>
                {editingCliente ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}
              </Typography>
              <Box sx={{ flex: 1, overflow: 'auto' }}>
              <Stack spacing={4}>
                
                {/* DATOS PERSONALES */}
                <Paper sx={{ p: 3, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
                  <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 600 }}>
                    👤 Datos Personales
                  </Typography>
                  
                  <Stack spacing={3}>
                    <Stack direction="row" spacing={3}>
                      <TextField 
                        label="Nombre (*)" 
                        value={formData.nombre} 
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
                        required 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                      <TextField 
                        label="Apellido (*)" 
                        value={formData.apellido} 
                        onChange={(e) => setFormData({ ...formData, apellido: e.target.value })} 
                        required 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                    </Stack>

                    <Stack direction="row" spacing={3}>
                      <TextField 
                        label="D.N.I (*)" 
                        value={formData.dni} 
                        onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '') })} 
                        required 
                        fullWidth 
                        helperText="Solo números, sin puntos"
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                      <TextField 
                        label="Nro. CUIT/CUIL" 
                        value={formData.nroCuitCuil} 
                        onChange={(e) => setFormData({ ...formData, nroCuitCuil: e.target.value })} 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                    </Stack>

                    <Stack direction="row" spacing={3}>
                      <TextField 
                        label="Ocupación" 
                        value={formData.ocupacion} 
                        onChange={(e) => setFormData({ ...formData, ocupacion: e.target.value })} 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                      <TextField 
                        label="Estado Civil" 
                        select
                        value={formData.estado_civil} 
                        onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value })} 
                        fullWidth
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      >
                        <MenuItem value="">Seleccionar</MenuItem>
                        <MenuItem value="Soltero/a">Soltero/a</MenuItem>
                        <MenuItem value="Casado/a">Casado/a</MenuItem>
                        <MenuItem value="Divorciado/a">Divorciado/a</MenuItem>
                        <MenuItem value="Viudo/a">Viudo/a</MenuItem>
                        <MenuItem value="Unión Convivencial">Unión Convivencial</MenuItem>
                      </TextField>
                    </Stack>

                    <TextField 
                      label="Fecha de Nacimiento" 
                      type="date"
                      value={formData.fecha_nacimiento} 
                      onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })} 
                      InputLabelProps={{ shrink: true }}
                      sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                    />
                  </Stack>
                </Paper>

                {/* CONTACTO */}
                <Paper sx={{ p: 3, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                  <Typography variant="h6" sx={{ mb: 3, color: 'info.main', fontWeight: 600 }}>
                    📞 Datos de Contacto
                  </Typography>
                  
                  <Stack spacing={3}>
                    <Stack direction="row" spacing={3}>
                      <TextField 
                        label="Teléfono Fijo" 
                        value={formData.telefonoFijo} 
                        onChange={(e) => setFormData({ ...formData, telefonoFijo: e.target.value })} 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                      <TextField 
                        label="Teléfono Móvil (*)" 
                        value={formData.telefono} 
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} 
                        required 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }} 
                      />
                      <TextField 
                        label="Teléfono Móvil 2" 
                        value={formData.telefonoMovil2} 
                        onChange={(e) => setFormData({ ...formData, telefonoMovil2: e.target.value })} 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                    </Stack>

                    <Stack direction="row" spacing={3}>
                      <TextField 
                        label="Email" 
                        type="email"
                        value={formData.email} 
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                      <TextField 
                        label="Clave Web" 
                        value={formData.claveWeb} 
                        onChange={(e) => setFormData({ ...formData, claveWeb: e.target.value })} 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                    </Stack>
                  </Stack>
                </Paper>

                {/* DOMICILIO */}
                <Paper sx={{ p: 3, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                  <Typography variant="h6" sx={{ mb: 3, color: 'warning.main', fontWeight: 600 }}>
                    🏠 Domicilio
                  </Typography>
                  
                  <Stack spacing={3}>
                    <TextField 
                      label="Domicilio (*)" 
                      value={formData.domicilio} 
                      onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })} 
                      required 
                      fullWidth 
                      sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                    />
                    
                    <Stack direction="row" spacing={3}>
                      <TextField 
                        label="Localidad (*)" 
                        value={formData.localidad} 
                        onChange={(e) => setFormData({ ...formData, localidad: e.target.value })} 
                        required 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                      <TextField 
                        label="Código Postal" 
                        value={formData.codPostal} 
                        onChange={(e) => setFormData({ ...formData, codPostal: e.target.value })} 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                    </Stack>
                  </Stack>
                </Paper>

                {/* CONTACTO DE EMERGENCIA */}
                <Paper sx={{ p: 3, bgcolor: 'secondary.50', border: '1px solid', borderColor: 'secondary.200' }}>
                  <Typography variant="h6" sx={{ mb: 3, color: 'secondary.main', fontWeight: 600 }}>
                    👥 Contacto de Emergencia (Opcional)
                  </Typography>
                  
                  <Stack spacing={3}>
                    <Stack direction="row" spacing={3}>
                      <TextField 
                        label="Nombre Contacto" 
                        value={formData.nombreContacto} 
                        onChange={(e) => setFormData({ ...formData, nombreContacto: e.target.value })} 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                      <TextField 
                        label="Apellido Contacto" 
                        value={formData.apellidoContacto} 
                        onChange={(e) => setFormData({ ...formData, apellidoContacto: e.target.value })} 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                    </Stack>

                    <TextField 
                      label="Domicilio Contacto" 
                      value={formData.domicilioContacto} 
                      onChange={(e) => setFormData({ ...formData, domicilioContacto: e.target.value })} 
                      fullWidth 
                      sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                    />

                    <Stack direction="row" spacing={3}>
                      <TextField 
                        label="Localidad Contacto" 
                        value={formData.localidadContacto} 
                        onChange={(e) => setFormData({ ...formData, localidadContacto: e.target.value })} 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                      <TextField 
                        label="Código Postal Contacto" 
                        value={formData.codPostalContacto} 
                        onChange={(e) => setFormData({ ...formData, codPostalContacto: e.target.value })} 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                    </Stack>

                    <Stack direction="row" spacing={3}>
                      <TextField 
                        label="Teléfono Contacto" 
                        value={formData.telContacto} 
                        onChange={(e) => setFormData({ ...formData, telContacto: e.target.value })} 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                      <TextField 
                        label="Email Contacto" 
                        type="email"
                        value={formData.emailContacto} 
                        onChange={(e) => setFormData({ ...formData, emailContacto: e.target.value })} 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      />
                    </Stack>

                    <Stack direction="row" spacing={3}>
                      <TextField 
                        label="Parentesco" 
                        select
                        value={formData.parentescoContacto} 
                        onChange={(e) => setFormData({ ...formData, parentescoContacto: e.target.value })} 
                        fullWidth 
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      >
                        <MenuItem value="">Seleccionar</MenuItem>
                        <MenuItem value="Padre/Madre">Padre/Madre</MenuItem>
                        <MenuItem value="Hijo/a">Hijo/a</MenuItem>
                        <MenuItem value="Esposo/a">Esposo/a</MenuItem>
                        <MenuItem value="Hermano/a">Hermano/a</MenuItem>
                        <MenuItem value="Amigo/a">Amigo/a</MenuItem>
                        <MenuItem value="Otro">Otro</MenuItem>
                      </TextField>
                      <TextField 
                        label="Acepta Promociones ADL" 
                        select
                        value={formData.aceptaPromoADL} 
                        onChange={(e) => setFormData({ ...formData, aceptaPromoADL: e.target.value })} 
                        fullWidth
                        sx={{ '& .MuiInputBase-root': { bgcolor: 'white' } }}
                      >
                        <MenuItem value="NO">NO</MenuItem>
                        <MenuItem value="SI">SI</MenuItem>
                      </TextField>
                    </Stack>
                  </Stack>
                </Paper>


              </Stack>
              </Box>
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 2 }}>
                <Button onClick={() => setOpenClienteDrawer(false)} color="inherit" fullWidth>
                  CANCELAR
                </Button>
                <Button onClick={saveCliente} variant="contained" fullWidth>
                  ACEPTAR
                </Button>
              </Box>
            </Box>
          </Drawer>

          {/* DRAWER VENTA DE LOTE (Reutilizado) */}
          <VentaWizard 
            open={openVentaDrawer} 
            onClose={() => setOpenVentaDrawer(false)}
            onSuccess={(contrato) => {
              alert(`¡Venta realizada exitosamente!\n\nContrato creado.`);
              setOpenVentaDrawer(false);
            }}
          />
          {/* Nuevo componente de resumen completo del cliente */}
          <ClienteResumenDrawer
            cliente={clienteResumenSeleccionado}
            open={openResumenDrawer}
            onClose={() => {
              setOpenResumenDrawer(false);
              setClienteResumenSeleccionado(null);
            }}
          />
          
    </LoteParaTodosLayout>
  );
};

export default ClientesPage;
