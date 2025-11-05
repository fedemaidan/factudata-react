import Head from 'next/head';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TextField, Tooltip, Typography, Divider, MenuItem,
  TableSortLabel, Menu, ListItemIcon, ListItemText, InputAdornment, Drawer,
  Stepper, Step, StepLabel, Autocomplete, StepContent,
  Grid
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

import * as XLSX from 'xlsx';
import LoteParaTodosLayout from 'src/components/layouts/LoteParaTodosLayout';
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
  
  // Cargar clientes al montar el componente
  React.useEffect(() => {
    // Cargar clientes con sus datos relacionales completos
    const clientesCompletos = mockClientes.map(cliente => {
      const clienteCompleto = getClienteCompleto(cliente.id);
      
      // Calcular datos agregados desde los contratos
      const contratos = clienteCompleto?.contratos || [];
      const lotesIds = contratos.map(c => c.lote_id);
      const emprendimientosIds = [...new Set(contratos.map(c => {
        const lote = mockLotes.find(l => l.id === c.lote_id);
        return lote?.emprendimiento_id;
      }).filter(Boolean))];
      
      // Generar saldo realista basado en contratos
      let saldoTotal = 0;
      let estadoCuenta = 'POTENCIAL';
      
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
        
        // Determinar estado basado en contratos
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
        ultimo_pago: contratos
          .filter(c => c.ultimo_pago)
          .sort((a, b) => new Date(b.ultimo_pago) - new Date(a.ultimo_pago))[0]?.ultimo_pago || null
      };
    });
    
    setClientes(clientesCompletos);
  }, []);
  const [emprendimientos] = useState(mockEmprendimientos);
  const [lotes] = useState(mockLotes);
  const [planes] = useState(mockPlanes);
  const [filters, setFilters] = useState({ nombre: '', dni: '', email: '', telefono: '', emprendimiento_id: '', estado_cuenta: '', lote_id: '' });
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [openCuenta, setOpenCuenta] = useState(false);
  const [openClienteDrawer, setOpenClienteDrawer] = useState(false);
  const [openVentaDrawer, setOpenVentaDrawer] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [clienteSeleccionadoVenta, setClienteSeleccionadoVenta] = useState(null);
  const [showCreateClienteForm, setShowCreateClienteForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
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
  
  // Pasos del proceso de venta
  const ventaSteps = [
    'Buscar o Crear Cliente',
    'Seleccionar Proyecto y Lote', 
    'Configurar Modo de Pago',
    'Datos Adicionales'
  ];

  // --- FILTROS ---
  const handleChangeFilter = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));
  const clearFilters = () => {
    setFilters({ nombre: '', dni: '', email: '', telefono: '', emprendimiento_id: '', estado_cuenta: '', lote_id: '' });
  };

  const filtered = useMemo(() => clientes.filter(c => {
    const match = (field) => !filters[field] || (c[field] || '').toLowerCase().includes(filters[field].toLowerCase());
    const matchSelect = (field) => !filters[field] || c[field] === parseInt(filters[field]);
    const matchEstado = () => !filters.estado_cuenta || c.estado_cuenta === filters.estado_cuenta;

    // Filtros específicos para emprendimiento y lote (buscar en arrays)
    const matchEmprendimiento = !filters.emprendimiento_id || 
      (c.emprendimientos_ids && c.emprendimientos_ids.includes(parseInt(filters.emprendimiento_id)));
    
    const matchLote = !filters.lote_id || 
      (c.lotes_ids && c.lotes_ids.includes(parseInt(filters.lote_id)));

    return match('nombre') && 
           match('dni') && 
           match('email') && 
           match('telefono') && 
           matchEmprendimiento && 
           matchLote && 
           matchEstado();
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

  // --- FORMULARIO CONTRATO ---
  const initialContrato = {
    emprendimiento_id: '',
    lote_id: '',
    plan_financiacion_id: '',
    precio_acordado: 0,
    entrega_inicial: 0,
    cuotas_cantidad: 0,
    cuota_mensual: 0,
    pago_contado_hoy: 0,
    fecha_contrato: new Date().toISOString().slice(0, 10),
    vendedor: '',
    observaciones: '',
    condiciones_especiales: []
  };
  const [contratoData, setContratoData] = useState(initialContrato);

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

  // Funciones para el stepper de venta
  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);
  const handleReset = () => {
    setActiveStep(0);
    setClienteSeleccionadoVenta(null);
    setContratoData(initialContrato);
    setShowCreateClienteForm(false);
  };

  const selectClienteForVenta = (cliente) => {
    setClienteSeleccionadoVenta(cliente);
    handleNext();
  };

  const createNewClienteInVenta = () => {
    setFormData(initialForm);
    setShowCreateClienteForm(true);
  };

  const saveClienteInVenta = () => {
    if (!formData.nombre || !formData.dni) return alert('Nombre y DNI son obligatorios');
    
    const clienteData = {
      ...formData,
      nombre: formData.apellido ? `${formData.nombre} ${formData.apellido}` : formData.nombre,
      id: Math.max(...clientes.map(c => c.id)) + 1,
      estado_cuenta: 'POTENCIAL'
    };
    
    setClientes(prev => [...prev, clienteData]);
    setClienteSeleccionadoVenta(clienteData);
    setShowCreateClienteForm(false);
    handleNext();
  };

  // Función para actualizar lotes disponibles cuando se selecciona un emprendimiento
  const handleEmprendimientoChange = (emprendimientoId) => {
    setEmprendimientoSeleccionado(emprendimientoId);
    if (emprendimientoId) {
      const lotesDelEmprendimiento = getLotesByEmprendimiento(parseInt(emprendimientoId));
      const disponibles = lotesDelEmprendimiento.filter(lote => lote.estado === 'DISPONIBLE');
      setLotesDisponibles(disponibles);
    } else {
      setLotesDisponibles([]);
    }
    setContratoData(prev => ({ ...prev, emprendimiento_id: emprendimientoId, lote_id: '' }));
  };

  // Función para calcular financiación cuando se selecciona lote y plan
  const calcularResumenVenta = (precioPersonalizado = null) => {
    if (contratoData.lote_id && contratoData.plan_financiacion_id) {
      const lote = lotes.find(l => l.id === parseInt(contratoData.lote_id));
      const precioBase = precioPersonalizado || lote?.precio_base || 0;
      
      const calculoFinanciacion = calcularFinanciacion(
        precioBase, 
        parseInt(contratoData.plan_financiacion_id)
      );
      
      if (calculoFinanciacion) {
        setContratoData(prev => ({
          ...prev,
          precio_acordado: calculoFinanciacion.precio_final,
          entrega_inicial: calculoFinanciacion.entrega_inicial,
          cuotas_cantidad: calculoFinanciacion.plan.cuotas_cantidad,
          cuota_mensual: calculoFinanciacion.cuota_mensual,
          pago_contado_hoy: 0 // Reset pago al contado cuando se recalcula
        }));
      }
    }
  };

  // Función para recalcular basado en precio acordado manual
  const recalcularConPrecioManual = (nuevoPrecio) => {
    if (contratoData.plan_financiacion_id && nuevoPrecio > 0) {
      const calculoFinanciacion = calcularFinanciacion(
        nuevoPrecio, 
        parseInt(contratoData.plan_financiacion_id)
      );
      
      if (calculoFinanciacion) {
        setContratoData(prev => ({
          ...prev,
          precio_acordado: nuevoPrecio,
          entrega_inicial: calculoFinanciacion.entrega_inicial,
          cuotas_cantidad: calculoFinanciacion.plan.cuotas_cantidad,
          cuota_mensual: calculoFinanciacion.cuota_mensual
        }));
      }
    }
  };

  return (
    <LoteParaTodosLayout currentModule="clientes" pageTitle="Gestión de Clientes">
      <Head><title>Clientes - Lote Para Todos</title></Head>
          {/* HEADER */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6" fontWeight={700}>Listado de Clientes</Typography>
                <Typography variant="body2" color="text.secondary">
                  Administra todos los clientes y sus contratos
                </Typography>
              </Box>
              <Stack direction="row" spacing={2} alignItems="center">
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
          </Stack>

          {/* TABLA */}
          <Paper sx={{ p: 1 }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {['nombre', 'dni', 'telefono', 'email', 'emprendimiento', 'lotes', 'saldo', 'estado_cuenta', 'ultimo_pago'].map((field) => (
                      <TableCell key={field} sx={{ py: 0.5 }}>
                        <TableSortLabel
                          active={sortConfig.field === field}
                          direction={sortConfig.field === field ? sortConfig.direction : 'asc'}
                          onClick={() => handleSort(field)}
                        >
                          {field === 'nombre' && 'Cliente'}
                          {field === 'dni' && 'DNI/CUIT'}
                          {field === 'telefono' && 'Teléfono'}
                          {field === 'email' && 'Email'}
                          {field === 'emprendimiento' && 'Emprendimiento'}
                          {field === 'lotes' && 'Lotes'}
                          {field === 'saldo' && 'Saldo CC'}
                          {field === 'estado_cuenta' && 'Estado'}
                          {field === 'ultimo_pago' && 'Último pago'}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={{ py: 0.5 }}>⋮</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><TextField size="small" value={filters.nombre} onChange={(e) => handleChangeFilter('nombre', e.target.value)} fullWidth /></TableCell>
                    <TableCell><TextField size="small" value={filters.dni} onChange={(e) => handleChangeFilter('dni', e.target.value)} fullWidth /></TableCell>
                    <TableCell><TextField size="small" value={filters.telefono} onChange={(e) => handleChangeFilter('telefono', e.target.value)} fullWidth /></TableCell>
                    <TableCell><TextField size="small" value={filters.email} onChange={(e) => handleChangeFilter('email', e.target.value)} fullWidth /></TableCell>
                    <TableCell>
                      <TextField size="small" select fullWidth value={filters.emprendimiento_id} onChange={(e) => handleChangeFilter('emprendimiento_id', e.target.value)}>
                        <MenuItem value="">Todos</MenuItem>
                        {emprendimientosActivos.map((e) => <MenuItem key={e.id} value={e.id}>{e.nombre}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      {/* Filtro por múltiples lotes - se puede mejorar */}
                    </TableCell>
                    <TableCell>
                      {/* Filtro por saldo - opcional */}
                    </TableCell>
                    <TableCell>
                      <TextField size="small" select fullWidth value={filters.estado_cuenta} onChange={(e) => handleChangeFilter('estado_cuenta', e.target.value)}>
                        <MenuItem value="">Todos</MenuItem>
                        {estados.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell /><TableCell />
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginated.map((c) => {
                    // Obtener primer emprendimiento del cliente (puede tener varios)
                    const emprendimiento = emprendimientos.find(e => e.id === c.emprendimiento_id);
                    // Los lotes del cliente están en lotes_ids (array)
                    const clienteLotes = c.lotes_ids ? c.lotes_ids.map(id => lotes.find(l => l.id === id)).filter(Boolean) : [];
                    
                    return (
                      <TableRow key={c.id} hover sx={{ '& td': { py: 0.6, fontSize: '0.85rem' } }}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{c.nombre}</Typography>
                            {c.ocupacion && (
                              <Typography variant="caption" color="text.secondary">{c.ocupacion}</Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{c.dni}</TableCell>
                        <TableCell>{c.telefono}</TableCell>
                        <TableCell>{c.email}</TableCell>
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
                              // Usar el estado de la cuenta en lugar del signo del saldo
                              c.estado_cuenta === 'PAGADO' || c.estado_cuenta === 'AL_DIA' ? 'success.main' :
                              c.estado_cuenta === 'MORA' ? 'error.main' :
                              'text.primary'
                            }
                          >
                            ${c.saldo_cuenta_corriente?.toLocaleString('es-AR') || '0'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            size="small"
                            label={c.estado_cuenta}
                            color={
                              c.estado_cuenta === 'PAGADO' ? 'success' :
                              c.estado_cuenta === 'AL_DIA' ? 'info' :
                              c.estado_cuenta === 'MORA' ? 'error' :
                              c.estado_cuenta === 'RESERVADO' ? 'warning' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>{c.ultimo_pago || '-'}</TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={(e) => openMenu(e, c)}>
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {totalRows === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 2 }}>
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

          {/* DRAWER VENTA DE LOTE */}
          <Drawer 
            anchor="right" 
            open={openVentaDrawer} 
            onClose={() => { setOpenVentaDrawer(false); handleReset(); }}
            PaperProps={{ sx: { width: 800 } }}
          >
            <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                Venta de Lote
              </Typography>
              
              <Stepper activeStep={activeStep} orientation="horizontal" sx={{ mb: 3 }}>
                {ventaSteps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {/* PASO 1: BUSCAR O CREAR CLIENTE */}
                {activeStep === 0 && (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>Paso 1: Seleccionar Cliente</Typography>
                    {!showCreateClienteForm ? (
                      <Stack spacing={3}>
                        <Autocomplete
                          options={clientes}
                          getOptionLabel={(option) => `${option.nombre} - ${option.dni}`}
                          renderInput={(params) => (
                            <TextField 
                              {...params} 
                              label="Buscar cliente existente" 
                              placeholder="Escriba el nombre o DNI del cliente"
                              fullWidth
                            />
                          )}
                          onChange={(event, value) => {
                            if (value) selectClienteForVenta(value);
                          }}
                        />
                        
                        <Divider sx={{ my: 2 }}>
                          <Typography variant="body2" color="text.secondary">O</Typography>
                        </Divider>
                        
                        <Button 
                          variant="outlined" 
                          onClick={createNewClienteInVenta}
                          fullWidth
                        >
                          Crear Nuevo Cliente
                        </Button>
                      </Stack>
                    ) : (
                      <Stack spacing={3}>
                        <Typography variant="subtitle1">Datos del Nuevo Cliente</Typography>
                        <Stack direction="row" spacing={2}>
                          <TextField 
                            label="Nombre (*)" 
                            value={formData.nombre} 
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
                            required 
                            fullWidth 
                          />
                          <TextField 
                            label="Apellido (*)" 
                            value={formData.apellido} 
                            onChange={(e) => setFormData({ ...formData, apellido: e.target.value })} 
                            required 
                            fullWidth 
                          />
                        </Stack>
                        <Stack direction="row" spacing={2}>
                          <TextField 
                            label="DNI (*)" 
                            value={formData.dni} 
                            onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '') })} 
                            required 
                            fullWidth 
                          />
                          <TextField 
                            label="Teléfono (*)" 
                            value={formData.telefono} 
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} 
                            required 
                            fullWidth 
                          />
                        </Stack>
                        <TextField 
                          label="Email" 
                          value={formData.email} 
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                          fullWidth 
                        />
                        
                        <Stack direction="row" spacing={2}>
                          <Button 
                            onClick={() => setShowCreateClienteForm(false)} 
                            color="inherit"
                            fullWidth
                          >
                            Volver a Buscar
                          </Button>
                          <Button 
                            onClick={saveClienteInVenta} 
                            variant="contained"
                            fullWidth
                          >
                            Crear y Continuar
                          </Button>
                        </Stack>
                      </Stack>
                    )}
                  </Box>
                )}

                {/* PASO 2: PROYECTO Y LOTE */}
                {activeStep === 1 && (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>Paso 2: Proyecto y Lote</Typography>
                    <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                      Cliente seleccionado: <strong>{clienteSeleccionadoVenta?.nombre}</strong>
                    </Typography>
                    
                    <Stack spacing={3}>
                      <TextField 
                        label="Emprendimiento" 
                        select
                        value={contratoData.emprendimiento_id} 
                        onChange={(e) => handleEmprendimientoChange(e.target.value)} 
                        fullWidth
                        required
                      >
                        <MenuItem value="">Seleccionar emprendimiento</MenuItem>
                        {emprendimientosActivos.map((e) => (
                          <MenuItem key={e.id} value={e.id}>
                            <Box>
                              <Typography variant="body2">{e.nombre}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {e.ubicacion} • {e.lotes_disponibles} disponibles
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </TextField>
                      
                      <TextField 
                        label="Lote" 
                        select
                        value={contratoData.lote_id} 
                        onChange={(e) => {
                          setContratoData({ ...contratoData, lote_id: e.target.value });
                          calcularResumenVenta();
                        }} 
                        fullWidth
                        required
                        disabled={!emprendimientoSeleccionado}
                        helperText={emprendimientoSeleccionado ? `${lotesDisponibles.length} lotes disponibles` : "Selecciona un emprendimiento primero"}
                      >
                        <MenuItem value="">Seleccionar lote</MenuItem>
                        {lotesDisponibles.map((lote) => (
                          <MenuItem key={lote.id} value={lote.id}>
                            <Box>
                              <Typography variant="body2">
                                {lote.numero} - Manzana {lote.manzana}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {lote.superficie}m² • ${lote.precio_base?.toLocaleString()}
                                {lote.observaciones && ` • ${lote.observaciones}`}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </TextField>

                      {contratoData.lote_id && (
                        <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>Resumen del Lote</Typography>
                          {(() => {
                            const loteSeleccionado = lotes.find(l => l.id === parseInt(contratoData.lote_id));
                            return loteSeleccionado && (
                              <Stack spacing={1}>
                                <Typography variant="body2">
                                  <strong>Lote:</strong> {loteSeleccionado.numero} - Manzana {loteSeleccionado.manzana}
                                </Typography>
                                <Typography variant="body2">
                                  <strong>Superficie:</strong> {loteSeleccionado.superficie} m²
                                </Typography>
                                <Typography variant="body2">
                                  <strong>Precio base:</strong> ${loteSeleccionado.precio_base?.toLocaleString()}
                                </Typography>
                                {loteSeleccionado.observaciones && (
                                  <Typography variant="body2">
                                    <strong>Observaciones:</strong> {loteSeleccionado.observaciones}
                                  </Typography>
                                )}
                              </Stack>
                            );
                          })()}
                        </Paper>
                      )}
                    </Stack>
                  </Box>
                )}

                {/* PASO 3: MODO DE PAGO */}
                {activeStep === 2 && (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>Paso 3: Configuración de Pago</Typography>
                    
                    <Stack spacing={3}>
                      <TextField 
                        label="Plan de Financiación" 
                        select
                        value={contratoData.plan_financiacion_id} 
                        onChange={(e) => {
                          setContratoData({ ...contratoData, plan_financiacion_id: e.target.value });
                          calcularResumenVenta();
                        }} 
                        fullWidth
                        required
                      >
                        <MenuItem value="">Seleccionar plan</MenuItem>
                        {planesActivos.map((plan) => (
                          <MenuItem key={plan.id} value={plan.id}>
                            <Box>
                              <Typography variant="body2">{plan.nombre}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {plan.cuotas_cantidad} cuotas • {plan.interes_mensual}% mensual
                                {plan.descuento_porcentaje !== 0 && 
                                  ` • ${plan.descuento_porcentaje > 0 ? 'Desc.' : 'Rec.'} ${Math.abs(plan.descuento_porcentaje)}%`
                                }
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </TextField>

                      {contratoData.plan_financiacion_id && contratoData.lote_id && (() => {
                        const lote = lotes.find(l => l.id === parseInt(contratoData.lote_id));
                        // Usar precio acordado si está disponible, sino el precio base del lote
                        const precioACalcular = contratoData.precio_acordado > 0 ? contratoData.precio_acordado : (lote?.precio_base || 0);
                        const calculacion = calcularFinanciacion(precioACalcular, parseInt(contratoData.plan_financiacion_id));
                        

                        
                        return calculacion && (
                          <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, color: 'success.800' }}>💰 Resumen Financiero</Typography>
                            <Stack spacing={1}>
                              {/* Mostrar precio original vs precio acordado */}
                              {(() => {
                                const precioOriginal = lote?.precio_base || 0;
                                const precioAcordado = contratoData.precio_acordado || precioOriginal;
                                const hayDiferencia = precioOriginal !== precioAcordado;
                                
                                return (
                                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" color="text.primary">Precio:</Typography>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      {hayDiferencia && (
                                        <Typography 
                                          variant="body2" 
                                          color="text.secondary" 
                                          sx={{ textDecoration: 'line-through' }}
                                        >
                                          ${precioOriginal.toLocaleString('es-AR')}
                                        </Typography>
                                      )}
                                      <Typography 
                                        variant="body2" 
                                        fontWeight={600} 
                                        color={hayDiferencia ? "error.700" : "success.800"}
                                      >
                                        ${precioAcordado.toLocaleString('es-AR')}
                                      </Typography>
                                      {hayDiferencia && (() => {
                                        const diferencia = Math.abs(precioOriginal - precioAcordado);
                                        const porcentaje = ((diferencia / precioOriginal) * 100).toFixed(1);
                                        const esDescuento = precioAcordado < precioOriginal;
                                        
                                        return (
                                          <Chip 
                                            label={`${esDescuento ? 'DESC' : 'REC'} ${porcentaje}% ($${diferencia.toLocaleString('es-AR')})`}
                                            size="small" 
                                            color={esDescuento ? "success" : "warning"}
                                            sx={{ fontSize: '0.6rem', height: 20 }}
                                          />
                                        );
                                      })()}
                                    </Stack>
                                  </Stack>
                                );
                              })()}
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.primary">Entrega inicial:</Typography>
                                <Typography variant="body2" fontWeight={600} color="info.700">
                                  ${(calculacion.entrega_inicial || 0).toLocaleString('es-AR')}
                                </Typography>
                              </Stack>
                              {calculacion.cuota_mensual > 0 && (
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" color="text.primary">Cuota mensual:</Typography>
                                  <Typography variant="body2" fontWeight={600} color="info.700">
                                    ${calculacion.cuota_mensual.toLocaleString('es-AR')} x {calculacion.plan.cuotas_cantidad} cuotas
                                  </Typography>
                                </Stack>
                              )}
                              <Stack direction="row" justifyContent="space-between" sx={{ pt: 1, borderTop: 1, borderColor: 'success.200' }}>
                                <Typography variant="body2" fontWeight={600} color="text.primary">Total a pagar:</Typography>
                                <Typography variant="body2" fontWeight={700} color="success.800">
                                  ${(calculacion.total_a_pagar || 0).toLocaleString('es-AR')}
                                </Typography>
                              </Stack>
                              {calculacion.descuento_aplicado > 0 && (
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="body2" color="success.700">✅ Descuento aplicado:</Typography>
                                  <Typography variant="body2" fontWeight={600} color="success.700">
                                    {calculacion.descuento_aplicado.toFixed(1)}%
                                  </Typography>
                                </Stack>
                              )}
                              {calculacion.total_intereses > 0 && (
                                <Stack direction="row" justifyContent="space-between">
                                  <Typography variant="caption" color="text.secondary">Intereses totales:</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ${calculacion.total_intereses.toLocaleString('es-AR')}
                                  </Typography>
                                </Stack>
                              )}
                            </Stack>
                          </Paper>
                        );
                      })()}

                      <TextField 
                        label="Precio Acordado (manual)" 
                        type="number"
                        value={contratoData.precio_acordado} 
                        onChange={(e) => {
                          const nuevoPrecio = parseFloat(e.target.value) || 0;
                          setContratoData({ ...contratoData, precio_acordado: nuevoPrecio });
                          // Recalcular automáticamente cuando se cambia el precio
                          if (nuevoPrecio > 0) {
                            recalcularConPrecioManual(nuevoPrecio);
                          }
                        }}
                        fullWidth
                        helperText="Se calcula automáticamente, editar solo si es necesario"
                      />
                    </Stack>
                  </Box>
                )}

                {/* PASO 4: DATOS ADICIONALES */}
                {activeStep === 3 && (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>Paso 4: Finalizar Venta</Typography>
                    
                    <Stack spacing={3}>
                      <Stack direction="row" spacing={2}>
                        <TextField 
                          label="Vendedor" 
                          select
                          value={contratoData.vendedor} 
                          onChange={(e) => setContratoData({ ...contratoData, vendedor: e.target.value })} 
                          fullWidth
                        >
                          <MenuItem value="">Seleccionar</MenuItem>
                          {vendedores.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                        </TextField>
                        <TextField 
                          label="Fecha de Contrato" 
                          type="date"
                          value={contratoData.fecha_contrato} 
                          onChange={(e) => setContratoData({ ...contratoData, fecha_contrato: e.target.value })} 
                          fullWidth 
                          InputLabelProps={{ shrink: true }}
                        />
                      </Stack>
                      
                      <TextField 
                        label="Pago al Contado Hoy" 
                        type="number"
                        value={contratoData.pago_contado_hoy || ''} 
                        onChange={(e) => setContratoData({ ...contratoData, pago_contado_hoy: parseFloat(e.target.value) || 0 })} 
                        fullWidth
                        helperText="Monto que paga en efectivo en este momento"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                      />

                      <TextField 
                        label="Observaciones" 
                        multiline
                        rows={4}
                        value={contratoData.observaciones} 
                        onChange={(e) => setContratoData({ ...contratoData, observaciones: e.target.value })} 
                        fullWidth
                        placeholder="Notas adicionales sobre el contrato..."
                      />

                      {/* RESUMEN FINAL */}
                      <Paper sx={{ p: 3, bgcolor: 'grey.50', border: '2px solid', borderColor: 'success.300' }}>
                        <Typography variant="h6" sx={{ mb: 2, color: 'success.700' }}>
                          📋 Resumen de la Venta
                        </Typography>
                        <Stack spacing={1}>
                          <Typography variant="body1" color="text.primary">
                            <strong>Cliente:</strong> {clienteSeleccionadoVenta?.nombre} ({clienteSeleccionadoVenta?.dni})
                          </Typography>
                          <Typography variant="body1" color="text.primary">
                            <strong>Emprendimiento:</strong> {emprendimientos.find(e => e.id === parseInt(contratoData.emprendimiento_id))?.nombre}
                          </Typography>
                          <Typography variant="body1" color="text.primary">
                            <strong>Lote:</strong> {lotes.find(l => l.id === parseInt(contratoData.lote_id))?.numero}
                          </Typography>
                          <Typography variant="body1" color="text.primary">
                            <strong>Plan:</strong> {planes.find(p => p.id === parseInt(contratoData.plan_financiacion_id))?.nombre}
                          </Typography>
                          {(() => {
                            const lote = lotes.find(l => l.id === parseInt(contratoData.lote_id));
                            const precioOriginal = lote?.precio_base || 0;
                            const precioAcordado = contratoData.precio_acordado || precioOriginal;
                            const hayDiferencia = precioOriginal !== precioAcordado;
                            
                            return (
                              <Box>
                                {hayDiferencia ? (
                                  <>
                                    <Typography variant="body1" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                                      <strong>Precio original:</strong> ${precioOriginal.toLocaleString('es-AR')}
                                    </Typography>
                                    <Typography variant="body1" color="error.700" fontWeight={600}>
                                      <strong>Precio acordado:</strong> ${precioAcordado.toLocaleString('es-AR')} 
                                      {(() => {
                                        const diferencia = Math.abs(precioOriginal - precioAcordado);
                                        const porcentaje = ((diferencia / precioOriginal) * 100).toFixed(1);
                                        const esDescuento = precioAcordado < precioOriginal;
                                        
                                        return (
                                          <Chip 
                                            label={`${esDescuento ? 'DESCUENTO' : 'RECARGO'} ${porcentaje}% ($${diferencia.toLocaleString('es-AR')})`}
                                            size="small" 
                                            color={esDescuento ? "success" : "warning"}
                                            sx={{ ml: 1, fontSize: '0.6rem', height: 20 }}
                                          />
                                        );
                                      })()}
                                    </Typography>
                                  </>
                                ) : (
                                  <Typography variant="body1" color="success.700" fontWeight={600}>
                                    <strong>Precio acordado:</strong> ${precioAcordado.toLocaleString('es-AR')}
                                  </Typography>
                                )}
                              </Box>
                            );
                          })()}
                          <Typography variant="body1" color="info.700">
                            <strong>Entrega inicial:</strong> ${contratoData.entrega_inicial?.toLocaleString('es-AR')}
                          </Typography>
                          {contratoData.pago_contado_hoy > 0 && (
                            <Typography variant="body1" color="warning.700" fontWeight={600}>
                              <strong>💰 Pago al contado hoy:</strong> ${contratoData.pago_contado_hoy?.toLocaleString('es-AR')}
                            </Typography>
                          )}
                          {contratoData.cuotas_cantidad > 1 && (
                            <Typography variant="body1" color="text.primary">
                              <strong>Cuotas:</strong> {contratoData.cuotas_cantidad} x ${contratoData.cuota_mensual?.toLocaleString('es-AR')}
                            </Typography>
                          )}
                        </Stack>
                      </Paper>
                    </Stack>
                  </Box>
                )}
              </Box>

              {/* BOTONES DE NAVEGACIÓN */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Stack direction="row" spacing={2}>
                  <Button 
                    onClick={() => { setOpenVentaDrawer(false); handleReset(); }} 
                    color="inherit"
                    fullWidth
                  >
                    CANCELAR
                  </Button>
                  
                  {activeStep > 0 && (
                    <Button 
                      onClick={handleBack} 
                      color="inherit"
                      fullWidth
                    >
                      ANTERIOR
                    </Button>
                  )}
                  
                  {activeStep < ventaSteps.length - 1 ? (
                    <Button 
                      onClick={handleNext} 
                      variant="contained"
                      fullWidth
                      disabled={
                        (activeStep === 0 && !clienteSeleccionadoVenta) ||
                        (activeStep === 1 && (!contratoData.emprendimiento_id || !contratoData.lote_id)) ||
                        (activeStep === 2 && (!contratoData.plan_financiacion_id))
                      }
                    >
                      SIGUIENTE
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => {
                        // Actualizar cliente con los datos de la venta
                        const clienteActualizado = {
                          ...clienteSeleccionadoVenta,
                          emprendimiento_id: parseInt(contratoData.emprendimiento_id),
                          lote_id: parseInt(contratoData.lote_id),
                          plan_financiacion_id: parseInt(contratoData.plan_financiacion_id),
                          estado_cuenta: 'RESERVADO',
                          fecha_compra: contratoData.fecha_contrato,
                          observaciones: contratoData.observaciones
                        };
                        
                        setClientes(prev => 
                          prev.map(c => c.id === clienteSeleccionadoVenta.id ? clienteActualizado : c)
                        );
                        
                        alert(`¡Venta realizada exitosamente!\n\nCliente: ${clienteSeleccionadoVenta.nombre}\nLote: ${lotes.find(l => l.id === parseInt(contratoData.lote_id))?.numero}\nPrecio: $${contratoData.precio_acordado?.toLocaleString()}`);
                        setOpenVentaDrawer(false); 
                        handleReset(); 
                      }} 
                      variant="contained"
                      fullWidth
                    >
                      FINALIZAR VENTA
                    </Button>
                  )}
                </Stack>
              </Box>
            </Box>
          </Drawer>
          
    </LoteParaTodosLayout>
  );
};

export default ClientesPage;
