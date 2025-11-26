// src/pages/loteParaTodosMock/contratos/[id].js
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Container, Typography, Box, Grid, Card, CardContent, 
  Tabs, Tab, Button, Chip, Paper, Divider, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputAdornment, MenuItem, Checkbox, FormControlLabel,
  IconButton, Tooltip, Switch
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  Payment as PaymentIcon,
  Description as DescriptionIcon,
  Edit as EditIcon,
  PictureAsPdf as PdfIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  Close as CloseIcon,
  Add as AddIcon,
  AccessTime as AccessTimeIcon,
  Comment as CommentIcon,
  Warning as WarningIcon,
  Build as BuildIcon,
  MonetizationOn as MoneyIcon,
  ReceiptLong as ReceiptIcon,
  CloudDownload as CloudDownloadIcon,
  SwapHoriz as SwapHorizIcon,
  Gavel as GavelIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';

// Importar datos
import { mockContratos } from '../../../data/loteParaTodos/mockContratos';
import { mockClientes } from '../../../data/loteParaTodos/mockClientes';
import { mockLotes } from '../../../data/loteParaTodos/mockLotes';
import { mockVendedores } from '../../../data/loteParaTodos/mockVendedores';
import { mockEmprendimientos } from '../../../data/loteParaTodos/mockEmprendimientos';
import { mockPlanes } from '../../../data/loteParaTodos/mockPlanes';
import { getPagosByContrato } from '../../../data/loteParaTodos/mockPagos';
import { 
  getServiciosContratadosByContrato,
  mockServicios,
  CATEGORIA_SERVICIO_LABELS
} from '../../../data/loteParaTodos/mockServicios';
import {
  getPrestamosByContrato,
  getCuotasPrestamo,
  ESTADO_PRESTAMO_LABELS,
  TIPO_PRESTAMO_LABELS
} from '../../../data/loteParaTodos/mockPrestamos';
import {
  getDocumentosByContrato,
  getPlantillasByEmprendimiento,
  TIPO_DOCUMENTO_LABELS,
  ESTADO_DOCUMENTO_LABELS,
  generarUrlDocumento
} from '../../../data/loteParaTodos/mockDocumentos';
import {
  TIPO_PAGO,
  TIPO_PAGO_LABELS,
  METODO_PAGO,
  METODO_PAGO_LABELS,
  ESTADO_CONTRATO_LABELS,
  ESTADO_CONTRATO_COLORS,
  ESTADO_CONTRATO
} from '../../../data/loteParaTodos/constantes';
import LoteParaTodosLayout from '../../../components/layouts/LoteParaTodosLayout';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`contrato-tabpanel-${index}`}
      aria-labelledby={`contrato-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ContratoDetalle() {
  const router = useRouter();
  const { id } = router.query;
  const [tabActivo, setTabActivo] = useState(0);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [contratoEditando, setContratoEditando] = useState(null);
  
  // Estados para generación de documentos
  const [openGenerarDocDialog, setOpenGenerarDocDialog] = useState(false);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState('');
  
  // Estados para comentarios
  const [comentarios, setComentarios] = useState([]);
  const [openComentarioDialog, setOpenComentarioDialog] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState('');

  // Estados para pagos
  const [openPagoDialog, setOpenPagoDialog] = useState(false);
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null);

  // Estados para re-financiación
  const [openRefinanciacionDialog, setOpenRefinanciacionDialog] = useState(false);
  const [datosRefinanciacion, setDatosRefinanciacion] = useState({
    tipo: 'CAMBIO_CICLO',
    motivo: '',
    nuevo_ciclo: 1,
    nuevo_indice: 0,
    nuevas_cuotas: 0,
    nueva_cuota_mensual: 0,
    fecha_aplicacion: new Date().toISOString().split('T')[0],
    observaciones: ''
  });
  const [subTabServicios, setSubTabServicios] = useState(0);
  const [estadoCuentaFiltro, setEstadoCuentaFiltro] = useState('todos');
  const [documentoVisibilidad, setDocumentoVisibilidad] = useState({});
  const [pagoForm, setPagoForm] = useState({
    tipoMovimiento: TIPO_PAGO.CUOTA,
    imputacion: 'cuota_mes',
    monto: 0,
    metodo: METODO_PAGO.TRANSFERENCIA,
    medioDetalle: '',
    adjuntoRef: '',
    notas: '',
    enviarRecibo: true,
    aplicarAdelanto: false
  });
  const reglasImputacion = [
    { value: 'cuota_mes', label: 'Cuota del mes' },
    { value: 'cuotas_vencidas', label: 'Cuotas vencidas' },
    { value: 'cuotas_futuras', label: 'Cuotas futuras / plan libre' },
    { value: 'gastos_administrativos', label: 'Gastos Administrativos' },
    { value: 'servicios', label: 'Servicios contratados' },
    { value: 'prestamos', label: 'Préstamos asociados' }
  ];

  const contrato = useMemo(() => {
    if (!id) return null;
    return mockContratos.find(c => c.id === parseInt(id));
  }, [id]);

  const cliente = useMemo(() => {
    if (!contrato) return null;
    return mockClientes.find(c => c.id === contrato.cliente_id);
  }, [contrato]);

  const lote = useMemo(() => {
    if (!contrato) return null;
    return mockLotes.find(l => l.id === contrato.lote_id);
  }, [contrato]);

  const emprendimiento = useMemo(() => {
    if (!lote) return null;
    return mockEmprendimientos.find(e => e.id === lote.emprendimiento_id);
  }, [lote]);

  const vendedor = useMemo(() => {
    if (!contrato) return null;
    return mockVendedores.find(v => v.id === contrato.vendedor_id);
  }, [contrato]);

  const plan = useMemo(() => {
    if (!contrato) return null;
    return mockPlanes.find(p => p.id === contrato.plan_financiacion_id);
  }, [contrato]);
  const pagosContrato = useMemo(() => {
    if (!contrato) return [];
    return getPagosByContrato(contrato.id);
  }, [contrato]);
  const serviciosContrato = useMemo(() => {
    if (!contrato) return [];
    return getServiciosContratadosByContrato(contrato.id, contrato.lote_id).map(servicio => {
      const catalogo = mockServicios.find(s => s.id === servicio.servicio_id);
      return {
        ...servicio,
        catalogo,
        categoria_label: catalogo ? CATEGORIA_SERVICIO_LABELS[catalogo.categoria] : 'Servicio'
      };
    });
  }, [contrato]);
  const prestamosContrato = useMemo(() => {
    if (!contrato) return [];
    return getPrestamosByContrato(contrato.id, contrato.lote_id).map(prestamo => ({
      ...prestamo,
      cuotas: getCuotasPrestamo(prestamo.id)
    }));
  }, [contrato]);
  const documentosContrato = useMemo(() => {
    if (!contrato) return [];
    return getDocumentosByContrato(contrato.id);
  }, [contrato]);

  const plantillasDisponibles = useMemo(() => {
    if (!lote) return [];
    return getPlantillasByEmprendimiento(lote.emprendimiento_id);
  }, [lote]);

  const evaluarAlerta = (fecha, estado) => {
    if (!fecha) return null;
    if (typeof estado === 'string' && estado.toLowerCase().includes('venc')) {
      return 'vencido';
    }
    const hoy = new Date();
    const fechaObj = new Date(fecha);
    const diffDias = (fechaObj - hoy) / (1000 * 60 * 60 * 24);
    if (diffDias >= 0 && diffDias <= 7) {
      return 'proximo';
    }
    return null;
  };


  // Sistema de cuotas organizadas por ciclos
  const cuotasYCiclos = useMemo(() => {
    if (!contrato) return { ciclos: [], entregaInicial: null, pagoContado: null };
    
    const fechaInicio = new Date(contrato.fecha_contrato);
    const ciclos = [];
    
    // Entrega inicial
    const entregaInicial = contrato.entrega_inicial > 0 ? {
      id: 'entrega_inicial',
      fecha: contrato.fecha_contrato,
      tipo: 'ENTREGA INICIAL',
      monto: contrato.entrega_inicial,
      estado: 'PAGADO',
      metodo_pago: 'TRANSFERENCIA'
    } : null;

    // Pago al contado adicional
    const pagoContado = contrato.pago_contado_hoy > 0 ? {
      id: 'pago_contado',
      fecha: contrato.fecha_contrato,
      tipo: 'PAGO AL CONTADO',
      monto: contrato.pago_contado_hoy,
      estado: 'PAGADO',
      metodo_pago: 'EFECTIVO'
    } : null;

    // Generar ciclos de cuotas (cada ciclo = 6 cuotas)
    const cuotasPorCiclo = 6;
    const totalCiclos = Math.ceil(contrato.cuotas_cantidad / cuotasPorCiclo);
    
    for (let ciclo = 1; ciclo <= totalCiclos; ciclo++) {
      const cuotasDelCiclo = [];
      const inicioDelCiclo = (ciclo - 1) * cuotasPorCiclo + 1;
      const finDelCiclo = Math.min(ciclo * cuotasPorCiclo, contrato.cuotas_cantidad);
      
      for (let numCuota = inicioDelCiclo; numCuota <= finDelCiclo; numCuota++) {
        const fechaCuota = new Date(fechaInicio);
        fechaCuota.setMonth(fechaCuota.getMonth() + numCuota);
        
        const hoy = new Date();
        const yaVencio = fechaCuota < hoy;
        
        // Lógica para determinar el estado de la cuota
        let estado = 'PENDIENTE';
        if (contrato.estado === 'COMPLETADO') {
          estado = 'PAGADO';
        } else if (contrato.estado === 'ACTIVO') {
          // Simular algunos pagos realizados y cuotas vencidas
          if (numCuota <= 2) estado = 'PAGADO';
          else if (numCuota >= 3 && numCuota <= 5 && yaVencio) estado = 'VENCIDO';
          else if (numCuota >= 3 && numCuota <= 5 && !yaVencio) estado = 'PENDIENTE';
          else estado = yaVencio ? 'VENCIDO' : 'PENDIENTE';
        }
        
        cuotasDelCiclo.push({
          id: `cuota_${numCuota}`,
          numero: numCuota,
          fecha: fechaCuota.toISOString().split('T')[0],
          monto: contrato.cuota_mensual,
          estado,
          metodo_pago: estado === 'PAGADO' ? 'TRANSFERENCIA' : null,
          fecha_pago: estado === 'PAGADO' ? fechaCuota.toISOString().split('T')[0] : null
        });
      }
      
      // Calcular estado del ciclo
      const cuotasPagadas = cuotasDelCiclo.filter(c => c.estado === 'PAGADO').length;
      const cuotasVencidas = cuotasDelCiclo.filter(c => c.estado === 'VENCIDO').length;
      
      let estadoCiclo = 'PENDIENTE';
      if (cuotasPagadas === cuotasDelCiclo.length) {
        estadoCiclo = 'COMPLETADO';
      } else if (cuotasVencidas > 0) {
        estadoCiclo = 'CON_VENCIDAS';
      } else if (cuotasPagadas > 0) {
        estadoCiclo = 'EN_PROGRESO';
      }
      
      ciclos.push({
        numero: ciclo,
        nombre: `Ciclo ${ciclo}`,
        cuotas: cuotasDelCiclo,
        estado: estadoCiclo,
        cuotasPagadas,
        totalCuotas: cuotasDelCiclo.length,
        montoTotal: cuotasDelCiclo.reduce((sum, c) => sum + c.monto, 0),
        montoPagado: cuotasDelCiclo.filter(c => c.estado === 'PAGADO').reduce((sum, c) => sum + c.monto, 0)
      });
    }

    return { ciclos, entregaInicial, pagoContado };
  }, [contrato]);

  const estadoCuentaMovimientos = useMemo(() => {
    if (!contrato) return [];
    const movimientos = [];
    const pushMovimiento = (mov) => {
      movimientos.push({
        ...mov,
        fechaOrden: mov.fecha ? new Date(mov.fecha).getTime() : Date.now()
      });
    };

    cuotasYCiclos.ciclos.forEach(ciclo => {
      ciclo.cuotas.forEach(cuota => {
        pushMovimiento({
          id: cuota.id,
          fecha: cuota.fecha,
          tipo: 'Cuota',
          categoria: 'cuota',
          descripcion: `Cuota ${cuota.numero}`,
          debito: cuota.monto,
          credito: 0,
          estado: cuota.estado,
          alerta: evaluarAlerta(cuota.fecha, cuota.estado)
        });
      });
    });

    serviciosContrato.forEach(servicio => {
      pushMovimiento({
        id: `serv-${servicio.id}`,
        fecha: servicio.fecha_contratacion,
        tipo: 'Servicio',
        categoria: 'servicio',
        descripcion: `${servicio.catalogo?.nombre || 'Servicio'} (${servicio.categoria_label})`,
        debito: servicio.precio_acordado || servicio.catalogo?.precio_base || 0,
        credito: 0,
        estado: servicio.estado,
        alerta: evaluarAlerta(servicio.fecha_contratacion, servicio.estado)
      });
    });

    prestamosContrato.forEach(prestamo => {
      if (prestamo.fecha_desembolso) {
        pushMovimiento({
          id: `prestamo-${prestamo.id}-desembolso`,
          fecha: prestamo.fecha_desembolso,
          tipo: 'Desembolso Préstamo',
          categoria: 'prestamo',
          descripcion: `${TIPO_PRESTAMO_LABELS[prestamo.tipo] || 'Préstamo'} - Desembolso`,
          debito: 0,
          credito: prestamo.monto_aprobado,
          estado: ESTADO_PRESTAMO_LABELS[prestamo.estado] || prestamo.estado,
          alerta: null
        });
      }
      prestamo.cuotas?.forEach(cuota => {
        pushMovimiento({
          id: `prestamo-${prestamo.id}-cuota-${cuota.numero_cuota}`,
          fecha: cuota.fecha_vencimiento,
          tipo: 'Cuota Préstamo',
          categoria: 'prestamo',
          descripcion: `Préstamo ${prestamo.id} • Cuota ${cuota.numero_cuota}`,
          debito: cuota.monto,
          credito: 0,
          estado: cuota.estado,
          alerta: evaluarAlerta(cuota.fecha_vencimiento, cuota.estado)
        });
      });
    });

    pagosContrato.forEach(pago => {
      const categoria = pago.tipo_pago === TIPO_PAGO.SERVICIO
        ? 'servicio'
        : pago.tipo_pago === TIPO_PAGO.PRESTAMO
          ? 'prestamo'
          : pago.tipo_pago === TIPO_PAGO.MOVIMIENTO_INTERNO
            ? 'ajuste'
            : 'pago';
      const monto = pago.monto || 0;
      const debitoMovimiento = categoria === 'ajuste' && monto > 0 ? monto : 0;
      const creditoMovimiento = categoria === 'ajuste' && monto < 0 ? Math.abs(monto) : categoria === 'ajuste' ? 0 : monto;
      pushMovimiento({
        id: `pago-${pago.id}`,
        fecha: pago.fecha_pago || pago.fecha_vencimiento,
        tipo: pago.tipo_pago === TIPO_PAGO.MOVIMIENTO_INTERNO ? 'Ajuste' : 'Pago',
        categoria,
        descripcion: pago.observaciones || TIPO_PAGO_LABELS[pago.tipo_pago] || 'Movimiento',
        debito: debitoMovimiento,
        credito: categoria === 'ajuste' ? creditoMovimiento : monto,
        estado: pago.estado,
        alerta: evaluarAlerta(pago.fecha_vencimiento, pago.estado)
      });
    });

    const ordenados = movimientos.sort((a, b) => a.fechaOrden - b.fechaOrden);
    let saldo = 0;
    return ordenados.map(mov => {
      saldo += (mov.debito || 0) - (mov.credito || 0);
      return { ...mov, saldo };
    });
  }, [contrato, cuotasYCiclos, serviciosContrato, prestamosContrato, pagosContrato]);

  const estadoCuentaResumen = useMemo(() => {
    const totalDebitos = estadoCuentaMovimientos.reduce((sum, mov) => sum + (mov.debito || 0), 0);
    const totalCreditos = estadoCuentaMovimientos.reduce((sum, mov) => sum + (mov.credito || 0), 0);
    const saldo = totalDebitos - totalCreditos;
    const vencidos = estadoCuentaMovimientos.filter(mov => mov.alerta === 'vencido').length;
    const proximos = estadoCuentaMovimientos.filter(mov => mov.alerta === 'proximo').length;
    return { totalDebitos, totalCreditos, saldo, vencidos, proximos };
  }, [estadoCuentaMovimientos]);

  const estadoCuentaCategorias = [
    { value: 'todos', label: 'Todos' },
    { value: 'cuota', label: 'Cuotas' },
    { value: 'pago', label: 'Pagos' },
    { value: 'servicio', label: 'Servicios' },
    { value: 'prestamo', label: 'Préstamos' },
    { value: 'ajuste', label: 'Ajustes' }
  ];

  const estadoCuentaFiltrado = useMemo(() => {
    if (estadoCuentaFiltro === 'todos') return estadoCuentaMovimientos;
    return estadoCuentaMovimientos.filter(mov => mov.categoria === estadoCuentaFiltro);
  }, [estadoCuentaMovimientos, estadoCuentaFiltro]);

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  const formatearMoneda = (monto) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(monto);
  };

  // Función para detectar si hay cuotas vencidas
  const tieneCuotasVencidas = () => {
    return cuotasYCiclos.ciclos.some(ciclo => 
      ciclo.cuotas.some(cuota => cuota.estado === 'VENCIDO')
    );
  };

  const getColorEstado = (estado) => {
    switch (estado) {
      case 'ACTIVO': return 'success';
      case 'COMPLETADO': return 'primary';
      case 'CAIDO': return 'warning';
      case 'RESCINDIDO': return 'error';
      default: return 'default';
    }
  };



  const calcularProgresoPagos = () => {
    const totalCuotas = cuotasYCiclos.ciclos.reduce((sum, ciclo) => sum + ciclo.totalCuotas, 0);
    const cuotasPagadas = cuotasYCiclos.ciclos.reduce((sum, ciclo) => sum + ciclo.cuotasPagadas, 0);
    return totalCuotas > 0 ? (cuotasPagadas / totalCuotas) * 100 : 0;
  };

  // Funciones para edición
  const abrirEdicion = () => {
    setContratoEditando({ 
      ...contrato,
      // Campos adicionales que pueden no estar en el contrato
      beneficiario: contrato.beneficiario || 'MISMO_TITULAR',
      gremio: contrato.gremio || 'NO',
      fecha_sellado: contrato.fecha_sellado || '',
      monto_sellado: contrato.monto_sellado || 0,
      revision_ciclo1: contrato.revision_ciclo1 || 'NO',
      frecuencia_revision: contrato.frecuencia_revision || 'NO',
      fecha_ultima_revision: contrato.fecha_ultima_revision || ''
    });
    setOpenEditDialog(true);
  };

  const cerrarEdicion = () => {
    setContratoEditando(null);
    setOpenEditDialog(false);
  };

  const guardarCambios = () => {
    // Aquí implementarías la lógica de guardado real
    console.log('Guardando cambios:', contratoEditando);
    alert('Cambios guardados exitosamente');
    cerrarEdicion();
  };

  // Funciones para manejar pagos
  const abrirPago = (cuota) => {
    setCuotaSeleccionada(cuota);
    setMontoPago(cuota.monto);
    setOpenPagoDialog(true);
  };

  const cerrarPago = () => {
    setCuotaSeleccionada(null);
    setMontoPago(0);
    setOpenPagoDialog(false);
  };

  const registrarPago = () => {
    console.log('Registrando pago:', {
      cuota: cuotaSeleccionada,
      monto: montoPago,
      metodo: metodoPago,
      fecha: new Date().toISOString().split('T')[0]
    });
    alert('Pago registrado exitosamente');
    cerrarPago();
  };

  const obtenerProximaCuota = () => {
    for (const ciclo of cuotasYCiclos.ciclos) {
      const proximaCuota = ciclo.cuotas.find(c => c.estado === 'PENDIENTE');
      if (proximaCuota) return proximaCuota;
    }
    return null;
  };

  const obtenerUltimaCuotaCiclo = (cicloNumero) => {
    const ciclo = cuotasYCiclos.ciclos.find(c => c.numero === cicloNumero);
    if (!ciclo) return null;
    return ciclo.cuotas[ciclo.cuotas.length - 1];
  };

  // Funciones para comentarios
  React.useEffect(() => {
    // Simular comentarios existentes
    if (contrato) {
      setComentarios([
        {
          id: 1,
          texto: 'Cliente muy puntual con los pagos',
          fecha: '2024-01-15',
          usuario: 'Juan Pérez'
        },
        {
          id: 2,
          texto: 'Se acordó postergar la cuota de febrero por situación familiar',
          fecha: '2024-02-10',
          usuario: 'María García'
        }
      ]);
    }
  }, [contrato]);

  const abrirComentarios = () => {
    setOpenComentarioDialog(true);
  };

  const cerrarComentarios = () => {
    setOpenComentarioDialog(false);
    setNuevoComentario('');
  };

  const agregarComentario = () => {
    if (!nuevoComentario.trim()) return;
    
    const comentario = {
      id: Date.now(),
      texto: nuevoComentario,
      fecha: new Date().toISOString().split('T')[0],
      usuario: 'Usuario Actual'
    };

    setComentarios(prev => [...prev, comentario]);
    setNuevoComentario('');
    cerrarComentarios();
  };

  const toggleDocumentoVisibilidad = (docId) => {
    setDocumentoVisibilidad(prev => ({
      ...prev,
      [docId]: prev[docId] === 'cliente' ? 'interno' : 'cliente'
    }));
  };

  const abrirRefinanciacion = () => {
    setOpenRefinanciacionDialog(true);
  };

  const cerrarRefinanciacion = () => {
    setOpenRefinanciacionDialog(false);
    setDatosRefinanciacion({
      tipo: 'CAMBIO_CICLO',
      motivo: '',
      nuevo_ciclo: 1,
      nuevo_indice: 0,
      nuevas_cuotas: 0,
      nueva_cuota_mensual: 0,
      fecha_aplicacion: new Date().toISOString().split('T')[0],
      observaciones: ''
    });
  };

  const procesarRefinanciacion = () => {
    const refinanciacion = {
      contrato_id: contrato.id,
      tipo: datosRefinanciacion.tipo,
      motivo: datosRefinanciacion.motivo,
      datos_actuales: {
        ciclo: contrato.ciclo_actual || 1,
        indice: contrato.indice_actualizacion || 0,
        cuotas: contrato.cuotas_cantidad || 0,
        cuota_mensual: contrato.cuota_mensual || 0
      },
      datos_nuevos: {
        ciclo: datosRefinanciacion.nuevo_ciclo,
        indice: datosRefinanciacion.nuevo_indice,
        cuotas: datosRefinanciacion.nuevas_cuotas,
        cuota_mensual: datosRefinanciacion.nueva_cuota_mensual
      },
      fecha_aplicacion: datosRefinanciacion.fecha_aplicacion,
      observaciones: datosRefinanciacion.observaciones,
      usuario: 'Usuario Actual',
      estado: 'PENDIENTE_APLICACION'
    };

    console.log('Re-financiación creada:', refinanciacion);
    
    alert('Re-financiación creada exitosamente. Se aplicará en la fecha especificada.');
    
    const comentarioRefinanciacion = {
      id: Date.now() + 1,
      texto: `Re-financiación solicitada: ${datosRefinanciacion.tipo} - ${datosRefinanciacion.motivo}`,
      fecha: new Date().toISOString().split('T')[0],
      usuario: 'Sistema'
    };
    setComentarios(prev => [...prev, comentarioRefinanciacion]);

    cerrarRefinanciacion();
  };

  if (!contrato) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">
          Contrato no encontrado
        </Alert>
      </Container>
    );
  }

  // Datos con valores por defecto si no se encuentran
  const clienteData = cliente || { nombre: 'Cliente', apellido: 'No encontrado', dni: 'N/A', email: 'N/A', telefono: 'N/A', direccion: 'N/A', ciudad: 'N/A', ocupacion: 'N/A', estado_civil: 'N/A' };
  const loteData = lote || { numero: 'N/A', manzana: 'N/A', superficie: 0, frente: 0, fondo: 0, precio_m2: 0, estado: 'N/A' };
  const emprendimientoData = emprendimiento || { nombre: 'No encontrado', ubicacion: 'N/A', desarrollador: { nombre: 'N/A' }, fecha_entrega_estimada: new Date().toISOString(), estado: 'N/A', servicios_incluidos: [] };
  const vendedorData = vendedor || { nombre: 'No encontrado' };
  const planData = plan || { nombre: 'No encontrado' };

  return (
    <LoteParaTodosLayout currentModule="clientes" pageTitle={`Contrato #${contrato.id}`}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/loteParaTodosMock/clientes')}
          variant="outlined"
        >
          Volver
        </Button>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1">
            Contrato #{contrato.id}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {clienteData.nombre} {clienteData.apellido} - Lote {loteData.numero}, {emprendimientoData.nombre}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip 
            label={ESTADO_CONTRATO_LABELS[contrato.estado] || contrato.estado} 
            color={ESTADO_CONTRATO_COLORS[contrato.estado] || 'default'}
            size="large"
          />
          {contrato.estado === ESTADO_CONTRATO.MORA && (
            <Chip 
              label="CON MORA"
              color="error"
              size="large"
              icon={<WarningIcon />}
            />
          )}
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<PaymentIcon />}
            onClick={() => {
              if (contrato.estado === ESTADO_CONTRATO.CANCELADO || contrato.estado === ESTADO_CONTRATO.RESCINDIDO) {
                alert('No se pueden registrar pagos en contratos cancelados o rescindidos.');
                return;
              }
              setOpenPagoDialog(true);
            }}
          >
            Registrar Pago
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<DescriptionIcon />}
            onClick={() => setTabActivo(3)} // Ir a tab Documentos
          >
            Ver Documentación
          </Button>

          <Button
            variant="outlined"
            startIcon={<CommentIcon />}
            onClick={abrirComentarios}
          >
            Comentarios ({comentarios.length})
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<EditIcon />}
            onClick={abrirEdicion}
          >
            Editar
          </Button>
        </Box>
      </Box>

      {/* Resumen del contrato */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={2.4}>
          <Card sx={{ backgroundColor: '#e3f2fd' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccountBalanceIcon sx={{ color: '#1976d2', mr: 1 }} />
                <Typography variant="h6" color="#1976d2">
                  Precio Acordado
                </Typography>
              </Box>
              <Typography variant="h4" color="#1976d2" fontWeight="bold">
                {formatearMoneda(contrato.precio_acordado)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2.4}>
          <Card sx={{ backgroundColor: '#e8f5e8' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon sx={{ color: '#2e7d32', mr: 1 }} />
                <Typography variant="h6" color="#2e7d32">
                  Pagado
                </Typography>
              </Box>
              <Typography variant="h4" color="#2e7d32" fontWeight="bold">
                {formatearMoneda(contrato.precio_acordado - contrato.saldo_pendiente)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2.4}>
          <Card sx={{ backgroundColor: '#fff3e0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PaymentIcon sx={{ color: '#f57c00', mr: 1 }} />
                <Typography variant="h6" color="#f57c00">
                  Saldo Pendiente
                </Typography>
              </Box>
              <Typography variant="h4" color="#f57c00" fontWeight="bold">
                {formatearMoneda(contrato.saldo_pendiente)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2.4}>
          <Card sx={{ backgroundColor: '#ffebee' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <DescriptionIcon sx={{ color: '#c62828', mr: 1 }} />
                <Typography variant="h6" color="#c62828">
                  Cuenta Corriente
                </Typography>
              </Box>
              <Typography variant="h4" color="#c62828" fontWeight="bold">
                {(() => {
                  // Calcular saldo actual de cuenta corriente (solo movimientos reales)
                  let saldoCC = contrato.precio_acordado;
                  
                  // Restar entrega inicial
                  if (contrato.entrega_inicial && contrato.entrega_inicial > 0) {
                    saldoCC -= contrato.entrega_inicial;
                  }
                  
                  // Sumar cuotas vencidas y restar pagos efectuados
                  const hoy = new Date();
                  cuotasYCiclos.ciclos.forEach(ciclo => {
                    ciclo.cuotas.forEach(cuota => {
                      const fechaCuota = new Date(cuota.fecha);
                      const yaVencio = fechaCuota <= hoy;
                      
                      if (yaVencio || cuota.estado === 'PAGADO') {
                        if (cuota.estado === 'PAGADO') {
                          // No afecta el saldo final (cuota + pago = 0)
                        } else {
                          // Cuota vencida sin pagar
                          saldoCC += cuota.monto;
                        }
                      }
                    });
                  });
                  
                  return formatearMoneda(Math.max(0, saldoCC));
                })()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2.4}>
          <Card sx={{ backgroundColor: '#f3e5f5' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarIcon sx={{ color: '#7b1fa2', mr: 1 }} />
                <Typography variant="h6" color="#7b1fa2">
                  Progreso
                </Typography>
              </Box>
              <Typography variant="h5" color="#7b1fa2" fontWeight="bold">
                {Math.round(calcularProgresoPagos())}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={calcularProgresoPagos()} 
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabActivo} 
            onChange={(e, newValue) => setTabActivo(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              label="Resumen" 
              icon={<PersonIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Estado de Cuenta" 
              icon={<AccountBalanceIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Servicios & Préstamos" 
              icon={<BuildIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Documentos" 
              icon={<DescriptionIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Gestión y Acciones" 
              icon={<PaymentIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>
        <TabPanel value={tabActivo} index={0}>
          <Stack spacing={4}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ mr: 1 }} />
                  Información del Cliente
                </Typography>
                <Paper sx={{ p: 3, backgroundColor: '#fafafa' }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Nombre:</strong> {clienteData.nombre} {clienteData.apellido}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>DNI:</strong> {clienteData.dni}
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <EmailIcon sx={{ mr: 1, fontSize: 16 }} />
                    {clienteData.email}
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <PhoneIcon sx={{ mr: 1, fontSize: 16 }} />
                    {clienteData.telefono}
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocationIcon sx={{ mr: 1, fontSize: 16 }} />
                    {clienteData.direccion}, {clienteData.ciudad}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Ocupación:</strong> {clienteData.ocupacion}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Estado Civil:</strong> {clienteData.estado_civil}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Detalles del Contrato
                </Typography>
                <Paper sx={{ p: 3, backgroundColor: '#fafafa' }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Fecha de Contrato:</strong> {formatearFecha(contrato.fecha_contrato)}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Fecha de Vencimiento:</strong> {formatearFecha(contrato.fecha_vencimiento)}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Vendedor:</strong> {vendedorData.nombre}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Plan de Financiación:</strong> {planData.nombre}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body1" gutterBottom>
                    <strong>Entrega Inicial:</strong> {formatearMoneda(contrato.entrega_inicial)}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Pago al Contado:</strong> {formatearMoneda(contrato.pago_contado_hoy)}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Cantidad de Cuotas:</strong> {contrato.cuotas_cantidad}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Cuota Mensual:</strong> {formatearMoneda(contrato.cuota_mensual)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <HomeIcon sx={{ mr: 1 }} />
                  Información del Lote
                </Typography>
                <Paper sx={{ p: 3, backgroundColor: '#fafafa' }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Número de Lote:</strong> {loteData.numero}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Manzana:</strong> {loteData.manzana}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Superficie:</strong> {loteData.superficie} m²
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Frente:</strong> {loteData.frente} m
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Fondo:</strong> {loteData.fondo} m
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Precio por m²:</strong> {formatearMoneda(loteData.precio_m2)}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Estado:</strong> 
                    <Chip 
                      label={loteData.estado} 
                      color={loteData.estado === 'VENDIDO' ? 'error' : 'success'}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Información del Emprendimiento
                </Typography>
                <Paper sx={{ p: 3, backgroundColor: '#fafafa' }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Nombre:</strong> {emprendimientoData.nombre}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Ubicación:</strong> {emprendimientoData.ciudad || emprendimientoData.ubicacion}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Desarrollador:</strong> {emprendimientoData.desarrollador?.nombre || emprendimientoData.desarrollador}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Fecha de Entrega:</strong> {formatearFecha(emprendimientoData.fecha_entrega_estimada || emprendimientoData.fecha_entrega)}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Estado:</strong> 
                    <Chip 
                      label={emprendimientoData.estado} 
                      color="primary"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  
                  {emprendimientoData.servicios_incluidos && emprendimientoData.servicios_incluidos.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body1" gutterBottom>
                        <strong>Servicios:</strong>
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {emprendimientoData.servicios_incluidos.map((servicio, index) => (
                          <Chip
                            key={index}
                            label={servicio}
                            variant="outlined"
                            size="small"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>

            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <DescriptionIcon sx={{ mr: 1 }} />
                Comentarios del Contrato
              </Typography>
              
              <Paper sx={{ p: 3, backgroundColor: '#fafafa' }}>
                {comentarios.length > 0 ? (
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {comentarios.map((comentario) => (
                      <Box 
                        key={comentario.id} 
                        sx={{ 
                          mb: 2, 
                          p: 2, 
                          backgroundColor: 'white',
                          borderRadius: 1,
                          border: '1px solid #e0e0e0'
                        }}
                      >
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {comentario.texto}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Por {comentario.usuario} • {formatearFecha(comentario.fecha)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                    No hay comentarios para este contrato
                  </Typography>
                )}
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={abrirComentarios}
                  >
                    Gestionar Comentarios
                  </Button>
                </Box>
              </Paper>
            </Box>
          </Stack>
        </TabPanel>

        <TabPanel value={tabActivo} index={1}>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceIcon color="primary" />
              <Typography variant="h6">Estado de Cuenta Consolidado</Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3, backgroundColor: '#e3f2fd' }}>
                  <Typography variant="body2" color="primary">Total Generado</Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {formatearMoneda(estadoCuentaResumen.totalDebitos)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Debe acumulado</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3, backgroundColor: '#e8f5e8' }}>
                  <Typography variant="body2" color="success.main">Total Pagado</Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {formatearMoneda(estadoCuentaResumen.totalCreditos)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Haber registrado</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3, backgroundColor: '#fff3e0' }}>
                  <Typography variant="body2" color="warning.main">Saldo Real</Typography>
                  <Typography variant="h5" fontWeight="bold" color="warning.main">
                    {formatearMoneda(estadoCuentaResumen.saldo)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Debe - Haber</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3, backgroundColor: '#ffebee' }}>
                  <Typography variant="body2" color="error">Requieren atención</Typography>
                  <Typography variant="h5" fontWeight="bold" color="error">
                    {estadoCuentaResumen.vencidos}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Mov. vencidos</Typography>
                  <Typography variant="subtitle2" sx={{ mt: 1 }}>
                    Próximos 7d: {estadoCuentaResumen.proximos}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FilterListIcon color="action" />
                      <Typography variant="subtitle1">Filtrar por categoría</Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" startIcon={<PdfIcon />}>
                        Descargar PDF
                      </Button>
                      <Button variant="contained" startIcon={<PaymentIcon />} onClick={() => {
                        const proxima = obtenerProximaCuota();
                        if (proxima) abrirPago(proxima);
                        else alert('No hay cuotas pendientes para pagar');
                      }}>
                        Registrar Pago
                      </Button>
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {estadoCuentaCategorias.map(categoria => (
                      <Chip
                        key={categoria.value}
                        label={categoria.label}
                        color={estadoCuentaFiltro === categoria.value ? 'primary' : 'default'}
                        variant={estadoCuentaFiltro === categoria.value ? 'filled' : 'outlined'}
                        onClick={() => setEstadoCuentaFiltro(categoria.value)}
                      />
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Movimientos ({estadoCuentaFiltrado.length})
                </Typography>
                {estadoCuentaFiltrado.length === 0 ? (
                  <Alert severity="info">
                    No hay movimientos para la categoría seleccionada
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Concepto</TableCell>
                          <TableCell>Tipo</TableCell>
                          <TableCell align="right">Debe</TableCell>
                          <TableCell align="right">Haber</TableCell>
                          <TableCell align="right">Saldo</TableCell>
                          <TableCell>Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {estadoCuentaFiltrado.map(mov => (
                          <TableRow key={mov.id}>
                            <TableCell>{formatearFecha(mov.fecha)}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>{mov.descripcion}</Typography>
                              {mov.alerta && (
                                <Typography variant="caption" color={mov.alerta === 'vencido' ? 'error' : 'warning.main'}>
                                  {mov.alerta === 'vencido' ? 'Vencido' : 'Próximo vencimiento'}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={mov.categoria}
                                size="small"
                                color={mov.categoria === 'pago' ? 'success' : mov.categoria === 'cuota' ? 'default' : 'info'}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ color: 'error.main' }}>
                              {mov.debito ? formatearMoneda(mov.debito) : '-'}
                            </TableCell>
                            <TableCell align="right" sx={{ color: 'success.main' }}>
                              {mov.credito ? formatearMoneda(mov.credito) : '-'}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                              {formatearMoneda(mov.saldo)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={mov.estado}
                                size="small"
                                color={mov.estado?.toLowerCase().includes('pag') ? 'success' : mov.estado?.toLowerCase().includes('venc') ? 'error' : 'warning'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>

            {(() => {
              const proximos = estadoCuentaMovimientos.filter(mov => mov.alerta === 'proximo');
              const vencidos = estadoCuentaMovimientos.filter(mov => mov.alerta === 'vencido');
              if (proximos.length === 0 && vencidos.length === 0) return null;
              return (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderTop: '4px solid #ffb300' }}>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>Próximos 7 días</Typography>
                        {proximos.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">Sin vencimientos inmediatos</Typography>
                        ) : (
                          <Stack spacing={1}>
                            {proximos.slice(0, 5).map(mov => (
                              <Box key={mov.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>{mov.descripcion}</Typography>
                                  <Typography variant="caption" color="text.secondary">{formatearFecha(mov.fecha)}</Typography>
                                </Box>
                                <Typography variant="body2" fontWeight={600}>{formatearMoneda(mov.debito || mov.credito)}</Typography>
                              </Box>
                            ))}
                          </Stack>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderTop: '4px solid #d32f2f' }}>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>En mora</Typography>
                        {vencidos.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">Sin movimientos vencidos 🎉</Typography>
                        ) : (
                          <Stack spacing={1}>
                            {vencidos.slice(0, 5).map(mov => (
                              <Box key={mov.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>{mov.descripcion}</Typography>
                                  <Typography variant="caption" color="text.secondary">{formatearFecha(mov.fecha)}</Typography>
                                </Box>
                                <Typography variant="body2" fontWeight={600}>{formatearMoneda(mov.debito || mov.credito)}</Typography>
                              </Box>
                            ))}
                          </Stack>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              );
            })()}
          </Stack>
        </TabPanel>

        <TabPanel value={tabActivo} index={2}>
          <Stack spacing={3}>
            <Tabs
              value={subTabServicios}
              onChange={(e, value) => setSubTabServicios(value)}
              variant="fullWidth"
            >
              <Tab label="Servicios" icon={<BuildIcon />} iconPosition="start" />
              <Tab label="Préstamos" icon={<MoneyIcon />} iconPosition="start" />
            </Tabs>

            {subTabServicios === 0 ? (
              serviciosContrato.length === 0 ? (
                <Alert severity="info">Este contrato no tiene servicios adicionales</Alert>
              ) : (
                <Grid container spacing={3}>
                  {serviciosContrato.map(servicio => (
                    <Grid item xs={12} md={6} key={servicio.id}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="h6">{servicio.catalogo?.nombre || 'Servicio'}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {servicio.categoria_label} • {formatearFecha(servicio.fecha_contratacion)}
                              </Typography>
                            </Box>
                            <Chip label={servicio.estado} color={servicio.estado === 'activo' ? 'success' : 'default'} size="small" />
                          </Box>
                          <Divider sx={{ my: 2 }} />
                          <Stack spacing={1}>
                            <Typography variant="body2"><strong>Costo pactado:</strong> {formatearMoneda(servicio.precio_acordado || servicio.catalogo?.precio_base || 0)}</Typography>
                            <Typography variant="body2"><strong>Modalidad:</strong> {servicio.modalidad || 'Pago único'}</Typography>
                            <Typography variant="body2"><strong>Notas:</strong> {servicio.notas || 'Sin observaciones'}</Typography>
                          </Stack>
                          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            <Button variant="outlined" size="small" startIcon={<ReceiptIcon />}>Ver detalle</Button>
                            <Button variant="contained" size="small" startIcon={<PaymentIcon />} onClick={() => alert('Simular imputación a servicio')}>
                              Imputar Pago
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )
            ) : (
              prestamosContrato.length === 0 ? (
                <Alert severity="info">No hay préstamos asociados a este contrato</Alert>
              ) : (
                <Stack spacing={3}>
                  {prestamosContrato.map(prestamo => (
                    <Card key={prestamo.id}>
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={8}>
                            <Typography variant="h6" gutterBottom>
                              {TIPO_PRESTAMO_LABELS[prestamo.tipo] || 'Préstamo'} #{prestamo.id}
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                              <Chip label={ESTADO_PRESTAMO_LABELS[prestamo.estado] || prestamo.estado} color="primary" size="small" />
                              <Chip label={`Monto: ${formatearMoneda(prestamo.monto_aprobado)}`} size="small" variant="outlined" />
                              <Chip label={`${prestamo.plazo_meses} meses`} size="small" variant="outlined" />
                            </Stack>
                            <Typography variant="body2" gutterBottom>
                              <strong>Tasa:</strong> {prestamo.tasa_nominal_anual}% • <strong>Desembolso:</strong> {prestamo.fecha_desembolso ? formatearFecha(prestamo.fecha_desembolso) : 'Pendiente'}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              <strong>Destino:</strong> {prestamo.destino || 'Sin especificar'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', height: '100%' }}>
                              <Typography variant="subtitle2" gutterBottom>Próxima cuota</Typography>
                              {(() => {
                                const proxima = prestamo.cuotas?.find(c => c.estado !== 'PAGADO');
                                if (!proxima) return <Typography variant="body2">Préstamo cancelado</Typography>;
                                return (
                                  <Stack spacing={0.5}>
                                    <Typography variant="body2"><strong>Cuota:</strong> {proxima.numero_cuota}</Typography>
                                    <Typography variant="body2"><strong>Vence:</strong> {formatearFecha(proxima.fecha_vencimiento)}</Typography>
                                    <Typography variant="body2"><strong>Monto:</strong> {formatearMoneda(proxima.monto)}</Typography>
                                    <Chip label={proxima.estado} size="small" color={proxima.estado === 'VENCIDO' ? 'error' : 'warning'} />
                                  </Stack>
                                );
                              })()}
                            </Paper>
                          </Grid>
                        </Grid>

                        {prestamo.cuotas && prestamo.cuotas.length > 0 && (
                          <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>#</TableCell>
                                  <TableCell>Vencimiento</TableCell>
                                  <TableCell>Monto</TableCell>
                                  <TableCell>Estado</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {prestamo.cuotas.slice(0, 6).map(cuota => (
                                  <TableRow key={cuota.numero_cuota}>
                                    <TableCell>{cuota.numero_cuota}</TableCell>
                                    <TableCell>{formatearFecha(cuota.fecha_vencimiento)}</TableCell>
                                    <TableCell>{formatearMoneda(cuota.monto)}</TableCell>
                                    <TableCell>
                                      <Chip 
                                        label={cuota.estado}
                                        size="small"
                                        color={cuota.estado === 'PAGADO' ? 'success' : cuota.estado === 'VENCIDO' ? 'error' : 'warning'}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )
            )}
          </Stack>
        </TabPanel>

        <TabPanel value={tabActivo} index={3}>
          <Stack spacing={3}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, backgroundColor: '#e3f2fd' }}>
                  <Typography variant="body2" color="primary">Documentos totales</Typography>
                  <Typography variant="h5" fontWeight="bold">{documentosContrato.length}</Typography>
                  <Typography variant="caption" color="text.secondary">Generados para este contrato</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, backgroundColor: '#e8f5e8' }}>
                  <Typography variant="body2" color="success.main">Visibles al cliente</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {documentosContrato.filter(doc => documentoVisibilidad[doc.id] === 'cliente').length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Documentos compartidos</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, backgroundColor: '#ffebee' }}>
                  <Typography variant="body2" color="error">Requieren atención</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {documentosContrato.filter(doc => doc.estado !== 'firmado').length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Pendientes de firma u observados</Typography>
                </Paper>
              </Grid>
            </Grid>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Typography variant="h6">Gestión de Documentos</Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenGenerarDocDialog(true)}>
                      Generar Documento
                    </Button>
                    <Button variant="outlined" startIcon={<CloudDownloadIcon />} onClick={() => alert('Descargar todo')}>
                      Exportar paquete
                    </Button>
                  </Box>
                </Box>

                {documentosContrato.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Aún no se cargaron documentos para este contrato
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Tipo</TableCell>
                          <TableCell>Estado</TableCell>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Visibilidad</TableCell>
                          <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {documentosContrato.map(doc => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>{doc.nombre}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {TIPO_DOCUMENTO_LABELS[doc.tipo] || 'Documento'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={ESTADO_DOCUMENTO_LABELS[doc.estado] || doc.estado}
                                color={doc.estado === 'firmado' ? 'success' : doc.estado === 'observado' ? 'warning' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{formatearFecha(doc.fecha_actualizacion)}</TableCell>
                            <TableCell>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={documentoVisibilidad[doc.id] === 'cliente'}
                                    onChange={() => toggleDocumentoVisibilidad(doc.id)}
                                    size="small"
                                  />
                                }
                                label={documentoVisibilidad[doc.id] === 'cliente' ? 'Cliente' : 'Interno'}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Tooltip title="Descargar">
                                  <IconButton onClick={() => window.open(generarUrlDocumento(doc), '_blank')}>
                                    <CloudDownloadIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cambiar visibilidad">
                                  <IconButton onClick={() => toggleDocumentoVisibilidad(doc.id)}>
                                    {documentoVisibilidad[doc.id] === 'cliente' ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Stack>
        </TabPanel>

        {/* Tab 5: Gestión y Acciones */}
        <TabPanel value={tabActivo} index={4}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <PaymentIcon sx={{ mr: 1 }} />
              Gestión Integral de Cuotas y Pagos
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Progreso de pagos: {Math.round(calcularProgresoPagos())}% completado
            </Alert>

            {/* Configuración de Ciclos y Cuotas */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" color="primary">
                    Configuración de Ciclos y Cuotas
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Solo lectura - Use Re-financiación para cambios
                  </Typography>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, backgroundColor: '#e3f2fd', textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="primary">
                        Monto de Cuota 1
                      </Typography>
                      <Typography variant="h6" color="primary" fontWeight="bold">
                        {formatearMoneda(contrato.entrega_inicial || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Entrega inicial
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={2}>
                    <Paper sx={{ p: 2, backgroundColor: '#f3e5f5', textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="secondary">
                        Total Cuotas
                      </Typography>
                      <Typography variant="h6" color="secondary" fontWeight="bold">
                        {contrato.cuotas_cantidad || 48}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        cuotas
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <Paper sx={{ p: 2, backgroundColor: '#fff3e0', textAlign: 'center' }}>
                      <Typography variant="subtitle2" sx={{ color: '#f57c00' }}>
                        Ciclo Es Anticipo %
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#f57c00' }} fontWeight="bold">
                        {contrato.anticipo_porcentaje || 0}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        anticipo
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <Paper sx={{ p: 2, backgroundColor: '#e8f5e8', textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="success.main">
                        Ciclo Actual
                      </Typography>
                      <Typography variant="h6" color="success.main" fontWeight="bold">
                        {contrato.ciclo_actual || 1}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        actual
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, backgroundColor: '#fce4ec', textAlign: 'center' }}>
                      <Typography variant="subtitle2" sx={{ color: '#c2185b' }}>
                        Cuota Mensual
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#c2185b' }} fontWeight="bold">
                        {formatearMoneda(contrato.cuota_mensual || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        por mes
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Cant. Ctas. Ciclo 2
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {contrato.cuotas_ciclo2 || 0}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Índice Actualización %
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {contrato.indice_actualizacion || 0}%
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Gremio
                      </Typography>
                      <Chip 
                        label={contrato.gremio || 'No'} 
                        color={contrato.gremio === 'SI' ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Vendedor
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {vendedorData.nombre}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Nota:</strong> Los valores de ciclos y cuotas no se pueden editar directamente. 
                    Para realizar cambios, utiliza el sistema de <strong>Re-financiación</strong> que mantiene 
                    un registro completo de todas las modificaciones realizadas al contrato.
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Acciones Rápidas para Ciclos */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Gestión de Re-financiación
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={<TrendingUpIcon />}
                      onClick={abrirRefinanciacion}
                    >
                      Nueva Re-financiación
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="secondary"
                      startIcon={<DescriptionIcon />}
                      onClick={() => {
                        // Mostrar historial de re-financiaciones
                        alert('Ver historial de re-financiaciones');
                      }}
                    >
                      Ver Historial
                    </Button>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="info"
                      startIcon={<EditIcon />}
                      onClick={abrirEdicion}
                    >
                      Editar Datos Base
                    </Button>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                  <Typography variant="body2" color="primary">
                    <strong>📋 Importante:</strong> Las re-financiaciones crean un nuevo plan de pagos manteniendo 
                    el historial completo. El contrato original permanece intacto para auditoría.
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Resumen del Ciclo Actual */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Estado del Ciclo Actual ({contrato.ciclo_actual || 1})
                </Typography>
                
                {(() => {
                  const cicloActual = cuotasYCiclos.ciclos.find(c => c.numero === (contrato.ciclo_actual || 1));
                  if (!cicloActual) return <Alert severity="info">No hay información del ciclo actual</Alert>;
                  
                  return (
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={2}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary" fontWeight="bold">
                            {cicloActual.cuotasPagadas}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Cuotas Pagadas
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} md={2}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="secondary" fontWeight="bold">
                            {cicloActual.totalCuotas}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total del Ciclo
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" color="success.main" fontWeight="bold">
                            {formatearMoneda(cicloActual.montoPagado)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Monto Pagado
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" sx={{ color: '#f57c00' }} fontWeight="bold">
                            {formatearMoneda(cicloActual.montoTotal - cicloActual.montoPagado)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Saldo Pendiente
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={12} md={2}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Chip 
                            label={cicloActual.estado.replace('_', ' ')}
                            color={
                              cicloActual.estado === 'COMPLETADO' ? 'success' :
                              cicloActual.estado === 'CON_VENCIDAS' ? 'error' :
                              cicloActual.estado === 'EN_PROGRESO' ? 'warning' : 'default'
                            }
                            size="medium"
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Estado del Ciclo
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Botones de acción rápida para pagos */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PaymentIcon />}
                onClick={() => {
                  const proxima = obtenerProximaCuota();
                  if (proxima) abrirPago(proxima);
                  else alert('No hay cuotas pendientes');
                }}
              >
                Pagar Próxima Cuota
              </Button>
            </Box>
          </Box>

          {/* Entrega inicial y pago al contado */}
          {(cuotasYCiclos.entregaInicial || cuotasYCiclos.pagoContado) && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Pagos Iniciales
                </Typography>
                <Grid container spacing={2}>
                  {cuotasYCiclos.entregaInicial && (
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, backgroundColor: '#e8f5e8' }}>
                        <Typography variant="subtitle1" fontWeight="600">
                          Entrega Inicial
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {formatearMoneda(cuotasYCiclos.entregaInicial.monto)}
                        </Typography>
                        <Chip label="PAGADO" color="success" size="small" />
                      </Paper>
                    </Grid>
                  )}
                  {cuotasYCiclos.pagoContado && (
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, backgroundColor: '#e8f5e8' }}>
                        <Typography variant="subtitle1" fontWeight="600">
                          Pago al Contado
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {formatearMoneda(cuotasYCiclos.pagoContado.monto)}
                        </Typography>
                        <Chip label="PAGADO" color="success" size="small" />
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Ciclos de cuotas */}
          {cuotasYCiclos.ciclos.map((ciclo) => (
            <Card key={ciclo.numero} sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                    {ciclo.nombre}
                    <Chip 
                      label={ciclo.estado.replace('_', ' ')}
                      color={
                        ciclo.estado === 'COMPLETADO' ? 'success' :
                        ciclo.estado === 'CON_VENCIDAS' ? 'error' :
                        ciclo.estado === 'EN_PROGRESO' ? 'warning' : 'default'
                      }
                      size="small"
                      sx={{ ml: 2 }}
                    />
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        const ultimaCuota = obtenerUltimaCuotaCiclo(ciclo.numero);
                        if (ultimaCuota && ultimaCuota.estado === 'PENDIENTE') {
                          abrirPago(ultimaCuota);
                        } else {
                          alert('La última cuota del ciclo ya está pagada');
                        }
                      }}
                    >
                      Pagar Última del Ciclo
                    </Button>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Progreso: {ciclo.cuotasPagadas}/{ciclo.totalCuotas} cuotas pagadas - 
                  {formatearMoneda(ciclo.montoPagado)} de {formatearMoneda(ciclo.montoTotal)}
                </Typography>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                        <TableCell><strong>Cuota #</strong></TableCell>
                        <TableCell><strong>Fecha Venc.</strong></TableCell>
                        <TableCell><strong>Monto</strong></TableCell>
                        <TableCell><strong>Estado</strong></TableCell>
                        <TableCell><strong>Fecha Pago</strong></TableCell>
                        <TableCell align="center"><strong>Acciones</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ciclo.cuotas.map((cuota) => (
                        <TableRow 
                          key={cuota.id}
                          sx={{
                            backgroundColor: 
                              cuota.estado === 'PAGADO' ? '#e8f5e8' :
                              cuota.estado === 'VENCIDO' ? '#ffebee' : 'inherit'
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {cuota.numero}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {formatearFecha(cuota.fecha)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="500">
                              {formatearMoneda(cuota.monto)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={cuota.estado}
                              color={
                                cuota.estado === 'PAGADO' ? 'success' :
                                cuota.estado === 'VENCIDO' ? 'error' : 'warning'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {cuota.fecha_pago ? formatearFecha(cuota.fecha_pago) : '-'}
                          </TableCell>
                          <TableCell align="center">
                            {cuota.estado === 'PENDIENTE' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={() => abrirPago(cuota)}
                              >
                                Pagar
                              </Button>
                            )}
                            {cuota.estado === 'VENCIDO' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                onClick={() => abrirPago(cuota)}
                              >
                                Regularizar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          ))}
        </TabPanel>




      </Card>

      {/* Modal de Edición de Contrato */}
      <Dialog 
        open={openEditDialog} 
        onClose={cerrarEdicion}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Editar Contrato #{contrato.id}
            <IconButton onClick={cerrarEdicion} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {contratoEditando && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mt: 2, color: 'primary.main' }}>
                Datos Generales
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Fecha de Boleto"
                    type="date"
                    value={contratoEditando.fecha_contrato?.split('T')[0] || ''}
                    onChange={(e) => setContratoEditando({
                      ...contratoEditando,
                      fecha_contrato: e.target.value
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Titular"
                    value={`${clienteData.nombre} ${clienteData.apellido}`}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <Button size="small" onClick={() => router.push(`/loteParaTodosMock/clientes/${cliente?.id}`)}>
                          Editar Cliente
                        </Button>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Beneficiario"
                    value={contratoEditando.beneficiario || 'MISMO_TITULAR'}
                  >
                    <MenuItem value="MISMO_TITULAR">Mismo titular</MenuItem>
                    <MenuItem value="OTRO">Otro beneficiario</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Monto de Cuota 1"
                    type="number"
                    value={contratoEditando.entrega_inicial || 0}
                    onChange={(e) => setContratoEditando({
                      ...contratoEditando,
                      entrega_inicial: parseFloat(e.target.value) || 0
                    })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  <TextField
                    select
                    fullWidth
                    label="Gremio"
                    value={contratoEditando.gremio || 'NO'}
                  >
                    <MenuItem value="SI">Si</MenuItem>
                    <MenuItem value="NO">No</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Vendedor"
                    value={contratoEditando.vendedor_id || ''}
                    onChange={(e) => setContratoEditando({
                      ...contratoEditando,
                      vendedor_id: parseInt(e.target.value)
                    })}
                  >
                    {mockVendedores.map(v => (
                      <MenuItem key={v.id} value={v.id}>{v.nombre}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Fecha de Sellado"
                    type="date"
                    value={contratoEditando.fecha_sellado || ''}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom sx={{ mt: 4, color: 'primary.main' }}>
                Datos del Lote
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Lote"
                    value={contratoEditando.lote_id || ''}
                    onChange={(e) => setContratoEditando({
                      ...contratoEditando,
                      lote_id: parseInt(e.target.value)
                    })}
                  >
                    {mockLotes.map(l => (
                      <MenuItem key={l.id} value={l.id}>
                        Lote {l.numero} - Mza {l.manzana}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<HomeIcon />}
                    disabled={!lote?.emprendimiento_id}
                    onClick={() => {
                      if (!lote?.emprendimiento_id) return;
                      router.push(`/loteParaTodosMock/emprendimientos/${lote.emprendimiento_id}?lote=${lote.id}`);
                    }}
                    sx={{ height: 56 }}
                  >
                    Ver en Emprendimiento
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Monto de Sellado"
                    type="number"
                    value={contratoEditando.monto_sellado || 0}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom sx={{ mt: 4, color: 'primary.main' }}>
                Datos del Titular (Cliente)
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Nombre"
                    value={clienteData.nombre}
                    InputProps={{ readOnly: true }}
                    helperText="Para editar, usar el botón 'Editar Cliente' arriba"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Apellido"
                    value={clienteData.apellido}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="DNI"
                    value={clienteData.dni}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="CUIL/CUIT"
                    value={clienteData.cuil || clienteData.dni}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Ocupación"
                    value={clienteData.ocupacion}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Teléfono Fijo"
                    value={clienteData.telefono}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Domicilio"
                    value={clienteData.direccion}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Localidad"
                    value={clienteData.ciudad}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Código Postal"
                    value={clienteData.codigo_postal || ''}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom sx={{ mt: 4, color: 'primary.main' }}>
                Revisión y Estado
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Aplicar Revisión en Ciclo 1"
                    value={contratoEditando.revision_ciclo1 || 'NO'}
                  >
                    <MenuItem value="SI">Si</MenuItem>
                    <MenuItem value="NO">No</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Frecuencia Revisión (Meses)"
                    value={contratoEditando.frecuencia_revision || 'NO'}
                  >
                    <MenuItem value="NO">No</MenuItem>
                    <MenuItem value="6">6 meses</MenuItem>
                    <MenuItem value="12">12 meses</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Fecha Última Revisión"
                    type="date"
                    value={contratoEditando.fecha_ultima_revision || ''}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Estado"
                    value={contratoEditando.estado}
                    onChange={(e) => setContratoEditando({
                      ...contratoEditando,
                      estado: e.target.value
                    })}
                  >
                    <MenuItem value="ACTIVO">Activo</MenuItem>
                    <MenuItem value="CAIDO">Caído</MenuItem>
                    <MenuItem value="COMPLETADO">Completado</MenuItem>
                    <MenuItem value="RESCINDIDO">Rescindido</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={cerrarEdicion} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={guardarCambios} variant="contained">
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Registro de Pago */}
      <Dialog open={openPagoDialog} onClose={cerrarPago} maxWidth="sm" fullWidth>
        <DialogTitle>
          Registrar Pago - Cuota #{cuotaSeleccionada?.numero}
        </DialogTitle>
        <DialogContent dividers>
          {cuotaSeleccionada && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                  <Typography variant="body2">
                    <strong>Cuota:</strong> #{cuotaSeleccionada.numero}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Fecha de Vencimiento:</strong> {formatearFecha(cuotaSeleccionada.fecha)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Monto Original:</strong> {formatearMoneda(cuotaSeleccionada.monto)}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Monto a Pagar"
                  type="number"
                  value={montoPago}
                  onChange={(e) => setMontoPago(parseFloat(e.target.value) || 0)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Método de Pago"
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                >
                  <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                  <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                  <MenuItem value="CHEQUE">Cheque</MenuItem>
                  <MenuItem value="TARJETA">Tarjeta</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarPago}>Cancelar</Button>
          <Button onClick={registrarPago} variant="contained">
            Registrar Pago
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Gestión de Comentarios */}
      <Dialog 
        open={openComentarioDialog} 
        onClose={cerrarComentarios}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Comentarios del Contrato #{contrato?.numero || id}
            </Typography>
            <IconButton onClick={cerrarComentarios} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {/* Lista de comentarios existentes */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Historial de Comentarios ({comentarios.length})
            </Typography>
            
            {comentarios.length > 0 ? (
              <Box sx={{ 
                maxHeight: 300, 
                overflow: 'auto', 
                border: '1px solid #e0e0e0', 
                borderRadius: 1,
                backgroundColor: '#fafafa'
              }}>
                {comentarios.map((comentario, index) => (
                  <Box 
                    key={comentario.id}
                    sx={{ 
                      p: 2, 
                      borderBottom: index < comentarios.length - 1 ? '1px solid #e0e0e0' : 'none',
                      backgroundColor: 'white',
                      '&:hover': { backgroundColor: '#f5f5f5' }
                    }}
                  >
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {comentario.texto}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <PersonIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                      {comentario.usuario} • 
                      <AccessTimeIcon sx={{ fontSize: 14, mx: 0.5, verticalAlign: 'middle' }} />
                      {formatearFecha(comentario.fecha)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#fafafa' }}>
                <DescriptionIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Aún no hay comentarios para este contrato
                </Typography>
              </Paper>
            )}
          </Box>

          {/* Formulario para nuevo comentario */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Agregar Nuevo Comentario
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Escribe tu comentario aquí..."
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                El comentario se guardará con tu usuario y la fecha actual
              </Typography>
              
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={agregarComentario}
                disabled={!nuevoComentario.trim()}
              >
                Agregar Comentario
              </Button>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={cerrarComentarios} variant="outlined">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Re-financiación */}
      <Dialog 
        open={openRefinanciacionDialog} 
        onClose={cerrarRefinanciacion}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Nueva Re-financiación - Contrato #{contrato?.id}
            </Typography>
            <IconButton onClick={cerrarRefinanciacion} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            La re-financiación creará un nuevo plan de pagos manteniendo el historial completo del contrato original.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Tipo de Re-financiación"
                value={datosRefinanciacion.tipo}
                onChange={(e) => setDatosRefinanciacion({
                  ...datosRefinanciacion,
                  tipo: e.target.value
                })}
                required
              >
                <MenuItem value="CAMBIO_CICLO">Cambio de Ciclo</MenuItem>
                <MenuItem value="ACTUALIZACION_INDICE">Actualización de Índice</MenuItem>
                <MenuItem value="EXTENSION_PLAZO">Extensión de Plazo</MenuItem>
                <MenuItem value="REESTRUCTURACION">Reestructuración Completa</MenuItem>
                <MenuItem value="REDUCCION_CUOTA">Reducción de Cuota</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Fecha de Aplicación"
                type="date"
                value={datosRefinanciacion.fecha_aplicacion}
                onChange={(e) => setDatosRefinanciacion({
                  ...datosRefinanciacion,
                  fecha_aplicacion: e.target.value
                })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Motivo de la Re-financiación"
                multiline
                rows={2}
                value={datosRefinanciacion.motivo}
                onChange={(e) => setDatosRefinanciacion({
                  ...datosRefinanciacion,
                  motivo: e.target.value
                })}
                placeholder="Ej: Solicitud del cliente por cambio en situación económica"
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Datos Actuales vs Nuevos
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                <Typography variant="subtitle1" gutterBottom color="text.secondary">
                  📋 Configuración Actual
                </Typography>
                <Typography variant="body2">
                  <strong>Ciclo:</strong> {contrato?.ciclo_actual || 1}
                </Typography>
                <Typography variant="body2">
                  <strong>Índice:</strong> {contrato?.indice_actualizacion || 0}%
                </Typography>
                <Typography variant="body2">
                  <strong>Cuotas:</strong> {contrato?.cuotas_cantidad || 0}
                </Typography>
                <Typography variant="body2">
                  <strong>Cuota Mensual:</strong> {formatearMoneda(contrato?.cuota_mensual || 0)}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, backgroundColor: '#e3f2fd' }}>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  🔄 Nueva Configuración
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nuevo Ciclo"
                      type="number"
                      size="small"
                      value={datosRefinanciacion.nuevo_ciclo}
                      onChange={(e) => setDatosRefinanciacion({
                        ...datosRefinanciacion,
                        nuevo_ciclo: parseInt(e.target.value) || 1
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nuevo Índice (%)"
                      type="number"
                      size="small"
                      value={datosRefinanciacion.nuevo_indice}
                      onChange={(e) => setDatosRefinanciacion({
                        ...datosRefinanciacion,
                        nuevo_indice: parseFloat(e.target.value) || 0
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nuevas Cuotas"
                      type="number"
                      size="small"
                      value={datosRefinanciacion.nuevas_cuotas}
                      onChange={(e) => setDatosRefinanciacion({
                        ...datosRefinanciacion,
                        nuevas_cuotas: parseInt(e.target.value) || 0
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nueva Cuota Mensual"
                      type="number"
                      size="small"
                      value={datosRefinanciacion.nueva_cuota_mensual}
                      onChange={(e) => setDatosRefinanciacion({
                        ...datosRefinanciacion,
                        nueva_cuota_mensual: parseFloat(e.target.value) || 0
                      })}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observaciones Adicionales"
                multiline
                rows={3}
                value={datosRefinanciacion.observaciones}
                onChange={(e) => setDatosRefinanciacion({
                  ...datosRefinanciacion,
                  observaciones: e.target.value
                })}
                placeholder="Observaciones, condiciones especiales, etc."
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, p: 2, backgroundColor: '#fff3e0', borderRadius: 1 }}>
            <Typography variant="body2" color="warning.main">
              <strong>⚠️ Importante:</strong> Esta acción creará un registro de re-financiación que se aplicará 
              en la fecha especificada. El contrato original se mantendrá para auditoría y el nuevo plan 
              de pagos se generará automáticamente.
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={cerrarRefinanciacion} variant="outlined">
            Cancelar
          </Button>
          <Button 
            onClick={procesarRefinanciacion} 
            variant="contained"
            disabled={!datosRefinanciacion.motivo.trim()}
          >
            Crear Re-financiación
          </Button>
        </DialogActions>
      </Dialog>
      {/* Modal de Generación de Documentos */}
      <Dialog 
        open={openGenerarDocDialog} 
        onClose={() => setOpenGenerarDocDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generar Documento</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              select
              fullWidth
              label="Seleccionar Plantilla"
              value={plantillaSeleccionada}
              onChange={(e) => setPlantillaSeleccionada(e.target.value)}
            >
              {plantillasDisponibles.map(plantilla => (
                <MenuItem key={plantilla.id} value={plantilla.id}>
                  {plantilla.nombre}
                </MenuItem>
              ))}
            </TextField>
            
            {plantillaSeleccionada && (
              <Alert severity="info">
                Se generará el documento utilizando los datos actuales del contrato y del cliente.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGenerarDocDialog(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            disabled={!plantillaSeleccionada}
            onClick={() => {
              alert('Documento generado exitosamente');
              setOpenGenerarDocDialog(false);
              setPlantillaSeleccionada('');
            }}
          >
            Generar
          </Button>
        </DialogActions>
      </Dialog>
    </LoteParaTodosLayout>
  );
}