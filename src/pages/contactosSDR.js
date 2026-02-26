import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
    Box, Container, Stack, Typography, Button, TextField, Chip,
    Table, TableBody, TableCell, TableHead, TableRow,
    CircularProgress, MenuItem, Select, FormControl, InputLabel,
    Snackbar, Alert, Paper, InputAdornment, Grid, IconButton,
    Card, CardContent, CardActions, Divider, useTheme, useMediaQuery,
    Avatar, Badge, Fab, Dialog, DialogTitle, DialogContent, DialogActions,
    Checkbox, Tooltip
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Phone as PhoneIcon,
    WhatsApp as WhatsAppIcon,
    Event as EventIcon,
    CheckCircle as CheckCircleIcon,
    TrendingUp as TrendingUpIcon,
    AccessTime as AccessTimeIcon,
    ChevronRight as ChevronRightIcon,
    Warning as WarningIcon,
    ArrowUpward as ArrowUpwardIcon,
    Add as AddIcon,
    UploadFile as UploadFileIcon,
    Schedule as ScheduleIcon,
    EventBusy as EventBusyIcon,
    HourglassEmpty as HourglassEmptyIcon,
    Checkbox as CheckboxIcon,
    BookmarkBorder as BookmarkBorderIcon,
    Bookmark as BookmarkIcon,
    Save as SaveIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import SDRService from 'src/services/sdrService';
import DrawerDetalleContactoSDR, { EstadoChip } from 'src/components/sdr/DrawerDetalleContactoSDR';
import ModalAgregarContacto from 'src/components/sdr/ModalAgregarContacto';
import ModalImportarExcel from 'src/components/sdr/ModalImportarExcel';
import ModalAdminTemplates from 'src/components/sdr/ModalAdminTemplates';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { PRECALIFICACION_BOT } from 'src/constant/sdrConstants';

const ContactosSDRPage = () => {
    const { user } = useAuthContext();
    const router = useRouter();
    const empresaId = user?.empresa?.id || 'demo-empresa';
    // Usar el ID del documento Firestore para consistencia
    const sdrId = user?.user_id;
    const sdrNombre = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'SDR';
    
    // Debug temporal
    console.log('🔍 contactosSDR - sdrId:', sdrId, '| user.user_id:', user?.user_id);
    
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Estado principal
    const [contactos, setContactos] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('activos'); // 'activos' | 'vencidos' | 'no_calificados' | 'todos'
    const [filtroProximoContacto, setFiltroProximoContacto] = useState(''); // '' | 'sin_proximo' | 'vencido' | 'pendiente'
    const [filtroSegmento, setFiltroSegmento] = useState(''); // '' | 'inbound' | 'outbound'
    
    // Selección múltiple
    const [seleccionados, setSeleccionados] = useState([]);
    const [modalProximoMasivo, setModalProximoMasivo] = useState(false);
    const [modalCadenciaMasiva, setModalCadenciaMasiva] = useState(false);
    const [cadenciasDisponibles, setCadenciasDisponibles] = useState([]);
    
    // Drawer de contacto
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [contactoSeleccionado, setContactoSeleccionado] = useState(null);
    
    // Modales
    const [modalAgregarContacto, setModalAgregarContacto] = useState(false);
    const [modalImportarExcel, setModalImportarExcel] = useState(false);
    const [modalAdminTemplates, setModalAdminTemplates] = useState(false);
    const [modalReunion, setModalReunion] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Métricas del SDR
    const [metricas, setMetricas] = useState(null);
    const [loadingMetricas, setLoadingMetricas] = useState(false);
    const [periodoMetricas, setPeriodoMetricas] = useState('hoy'); // 'hoy' | 'semana' | 'mes'
    
    // Para refrescar historial en drawer
    const [historialVersion, setHistorialVersion] = useState(0);
    
    // Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Vistas guardadas
    const [vistas, setVistas] = useState([]);
    const [vistaActiva, setVistaActiva] = useState(null);
    const [modalGuardarVista, setModalGuardarVista] = useState(false);
    const [nombreVista, setNombreVista] = useState('');
    const [vistaCompartida, setVistaCompartida] = useState(false);

    // Refrescar contacto individual seleccionado
    const refrescarContactoSeleccionado = useCallback(async () => {
        if (!contactoSeleccionado?._id) return;
        try {
            const data = await SDRService.obtenerContacto(contactoSeleccionado._id);
            if (data.contacto) {
                setContactoSeleccionado(data.contacto);
            }
        } catch (err) {
            console.error('Error refrescando contacto:', err);
        }
    }, [contactoSeleccionado?._id]);

    // Cargar contactos asignados al SDR
    const cargarContactos = useCallback(async () => {
        if (!sdrId) return;
        setLoading(true);
        try {
            // Solo filtrar por sdrAsignado - el SDR ve TODOS sus contactos asignados
            const params = { 
                sdrAsignado: sdrId
            };
            
            // Filtros de tipo
            if (filtroTipo === 'no_calificados') {
                params.estado = 'no_califica';
            } else if (filtroTipo === 'activos') {
                // Excluir no_califica por defecto
                params.excluirEstados = 'no_califica';
            } else if (filtroTipo === 'vencidos') {
                params.excluirEstados = 'no_califica';
                params.soloVencidos = true;
            }
            // 'todos' no agrega filtros adicionales
            
            if (filtroEstado && filtroTipo !== 'no_calificados') params.estado = filtroEstado;
            if (busqueda) params.busqueda = busqueda;
            if (filtroSegmento) params.segmento = filtroSegmento;
            
            const data = await SDRService.listarContactos(params);
            setContactos(data.contactos || []);
        } catch (err) {
            console.error('Error cargando contactos:', err);
            setSnackbar({ open: true, message: 'Error cargando contactos', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, [empresaId, sdrId, filtroEstado, filtroTipo, busqueda, filtroSegmento]);

    // Cargar métricas del SDR - soporta día, semana y mes
    const cargarMetricas = useCallback(async () => {
        if (!empresaId || !sdrId) return;
        setLoadingMetricas(true);
        try {
            let data;
            if (periodoMetricas === 'hoy') {
                data = await SDRService.obtenerMetricasDiarias(empresaId, null, sdrId);
            } else {
                // Calcular rango de fechas
                const hoy = new Date();
                let desde;
                if (periodoMetricas === 'semana') {
                    desde = new Date(hoy);
                    desde.setDate(hoy.getDate() - 7);
                } else { // mes
                    desde = new Date(hoy);
                    desde.setMonth(hoy.getMonth() - 1);
                }
                // Si el servicio tiene obtenerMetricasPeriodo, usarlo
                // Por ahora sumamos métricas diarias (simplificado para frontend)
                data = await SDRService.obtenerMetricasDiarias(empresaId, null, sdrId);
                // Multiplicar aproximadamente para dar idea (en producción se debería usar endpoint de período)
                if (periodoMetricas === 'semana') {
                    data = {
                        ...data,
                        llamadasRealizadas: (data.llamadasRealizadas || 0) * 5,
                        llamadasAtendidas: (data.llamadasAtendidas || 0) * 5,
                        whatsappEnviados: (data.whatsappEnviados || 0) * 5,
                        reunionesCoordinadas: (data.reunionesCoordinadas || 0) * 3,
                        _estimado: true
                    };
                } else if (periodoMetricas === 'mes') {
                    data = {
                        ...data,
                        llamadasRealizadas: (data.llamadasRealizadas || 0) * 20,
                        llamadasAtendidas: (data.llamadasAtendidas || 0) * 20,
                        whatsappEnviados: (data.whatsappEnviados || 0) * 20,
                        reunionesCoordinadas: (data.reunionesCoordinadas || 0) * 10,
                        _estimado: true
                    };
                }
            }
            setMetricas(data);
        } catch (err) {
            console.error('Error cargando métricas:', err);
        } finally {
            setLoadingMetricas(false);
        }
    }, [empresaId, sdrId, periodoMetricas]);

    useEffect(() => {
        cargarContactos();
    }, [cargarContactos]);

    useEffect(() => {
        cargarMetricas();
    }, [cargarMetricas]);

    // Cargar cadencias disponibles (globales)
    useEffect(() => {
        SDRService.listarCadencias()
            .then(data => setCadenciasDisponibles(data || []))
            .catch(() => setCadenciasDisponibles([]));
        // Cargar vistas guardadas
        SDRService.listarVistas(empresaId)
            .then(data => setVistas(data || []))
            .catch(() => setVistas([]));
    }, [empresaId]);

    // Abrir contacto desde query param si existe
    useEffect(() => {
        const contactoId = router.query.contacto;
        if (contactoId && contactos.length > 0 && !drawerOpen) {
            const contacto = contactos.find(c => c._id === contactoId);
            if (contacto) {
                setContactoSeleccionado(contacto);
                setDrawerOpen(true);
            } else {
                // Si el contacto no está en la lista actual, intentar cargarlo directamente
                const cargarContactoDirecto = async () => {
                    try {
                        const data = await SDRService.obtenerContacto(contactoId);
                        if (data.contacto) {
                            setContactoSeleccionado(data.contacto);
                            setDrawerOpen(true);
                        }
                    } catch (err) {
                        console.error('Contacto no encontrado:', err);
                        setSnackbar({ open: true, message: 'Contacto no encontrado', severity: 'warning' });
                    }
                };
                cargarContactoDirecto();
            }
        }
    }, [router.query.contacto, contactos]);

    // Abrir página de detalle del contacto con contexto de navegación
    const handleOpenDrawer = (contacto) => {
        // Guardar IDs de contactos en sessionStorage para navegación ← →
        try {
            const ids = contactosOrdenados.map(c => c._id);
            sessionStorage.setItem('sdr_contacto_ids', JSON.stringify(ids));
        } catch { /* ignore */ }
        router.push(`/sdr/contacto/${contacto._id}`);
    };

    // Navegar al primer contacto de la lista (flujo secuencial)
    const handleSiguienteContacto = () => {
        if (contactosOrdenados.length === 0) return;
        try {
            const ids = contactosOrdenados.map(c => c._id);
            sessionStorage.setItem('sdr_contacto_ids', JSON.stringify(ids));
        } catch { /* ignore */ }
        router.push(`/sdr/contacto/${contactosOrdenados[0]._id}`);
    };

    // Cerrar drawer y limpiar query param
    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        // No limpiar contactoSeleccionado si el modal de reunión está abierto
        if (!modalReunion) {
            setContactoSeleccionado(null);
        }
        // Remover el query param del contacto
        const { contacto, ...restQuery } = router.query;
        router.push(
            { pathname: router.pathname, query: restQuery },
            undefined,
            { shallow: true }
        );
    };

    // Manejar acciones desde el drawer
    const handleAccion = async (contacto, tipo, atendida = null) => {
        try {
            if (tipo === 'reunion') {
                setContactoSeleccionado(contacto);
                setModalReunion(true);
                return;
            }
            
            if (tipo === 'no_responde') {
                await SDRService.marcarNoResponde(contacto._id, { empresaId });
                setSnackbar({ open: true, message: 'Marcado como No responde', severity: 'success' });
                setHistorialVersion(v => v + 1);
                cargarContactos();
                cargarMetricas();
                return;
            }
            
            // Registrar intento (llamada o whatsapp)
            await SDRService.registrarIntento(contacto._id, {
                tipo: tipo === 'llamada' ? (atendida ? 'llamada_atendida' : 'llamada_no_atendida') : 'whatsapp_enviado',
                canal: tipo === 'llamada' ? 'llamada' : 'whatsapp',
                resultado: tipo === 'llamada' ? (atendida ? 'atendio' : 'no_atendio') : undefined,
                empresaId
            });
            setSnackbar({ 
                open: true, 
                message: tipo === 'llamada' 
                    ? (atendida ? 'Llamada atendida registrada' : 'Llamada no atendida registrada')
                    : 'WhatsApp registrado',
                severity: 'success'
            });
            setHistorialVersion(v => v + 1);
            cargarContactos();
            cargarMetricas();
        } catch (error) {
            setSnackbar({ open: true, message: error.response?.data?.error || 'Error', severity: 'error' });
        }
    };

    // Agregar comentario
    const handleAgregarComentario = async (contactoId, comentario) => {
        try {
            await SDRService.registrarIntento(contactoId, {
                tipo: 'comentario',
                canal: 'otro',
                nota: comentario,
                empresaId
            });
            setSnackbar({ open: true, message: 'Comentario agregado', severity: 'success' });
            return true;
        } catch (error) {
            setSnackbar({ open: true, message: 'Error al agregar comentario', severity: 'error' });
            return false;
        }
    };

    // Marcar como no califica
    const handleMarcarNoCalifica = async (contacto, motivo) => {
        try {
            await SDRService.marcarNoCalifica(contacto._id, { motivo, empresaId });
            setSnackbar({ open: true, message: 'Marcado como No califica - Removido de lista principal', severity: 'success' });
            cargarContactos();
        } catch (error) {
            setSnackbar({ open: true, message: 'Error', severity: 'error' });
        }
    };

    // Registrar reunión
    const handleRegistrarReunion = async (data) => {
        if (!contactoSeleccionado) return;
        setActionLoading(true);
        try {
            await SDRService.registrarReunion(contactoSeleccionado._id, {
                ...data,
                empresaId
            });
            setSnackbar({ open: true, message: '¡Reunión registrada con éxito!', severity: 'success' });
            setModalReunion(false);
            setHistorialVersion(v => v + 1);
            cargarContactos();
            cargarMetricas();
        } catch (error) {
            setSnackbar({ open: true, message: error.response?.data?.error || 'Error al registrar reunión', severity: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    // Contar por estado (para mostrar en filtros)
    const contarPorEstado = (estado) => {
        return contactos.filter(c => c.estado === estado).length;
    };
    
    // Contadores de próximo contacto
    const contarSinProximo = () => contactos.filter(c => !c.proximoContacto).length;
    const contarProximoVencido = () => contactos.filter(c => c.proximoContacto && new Date(c.proximoContacto) < new Date()).length;
    const contarProximoPendiente = () => contactos.filter(c => c.proximoContacto && new Date(c.proximoContacto) >= new Date()).length;
    
    // Contar vencidos
    const contarVencidos = () => {
        return contactos.filter(c => c.proximoContacto && new Date(c.proximoContacto) < new Date()).length;
    };
    
    // Verificar si un contacto tiene próximo contacto vencido
    const estaVencido = (contacto) => {
        if (!contacto.proximoContacto) return false;
        return new Date(contacto.proximoContacto) < new Date();
    };
    
    // Filtrar contactos según filtro de próximo contacto
    const filtrarPorProximoContacto = (lista) => {
        if (!filtroProximoContacto) return lista;
        return lista.filter(c => {
            if (filtroProximoContacto === 'sin_proximo') return !c.proximoContacto;
            if (filtroProximoContacto === 'vencido') return c.proximoContacto && new Date(c.proximoContacto) < new Date();
            if (filtroProximoContacto === 'pendiente') return c.proximoContacto && new Date(c.proximoContacto) >= new Date();
            return true;
        });
    };
    
    // Selección múltiple
    const handleSeleccionar = (contactoId) => {
        setSeleccionados(prev => 
            prev.includes(contactoId) 
                ? prev.filter(id => id !== contactoId)
                : [...prev, contactoId]
        );
    };
    
    const handleSeleccionarTodos = () => {
        const contactosFiltrados = filtrarPorProximoContacto(contactosOrdenados);
        if (seleccionados.length === contactosFiltrados.length) {
            setSeleccionados([]);
        } else {
            setSeleccionados(contactosFiltrados.map(c => c._id));
        }
    };
    
    // Actualizar próximo contacto masivamente
    const handleActualizarProximoMasivo = async (fecha) => {
        if (seleccionados.length === 0) return;
        setActionLoading(true);
        try {
            // Actualizar cada contacto seleccionado
            await Promise.all(seleccionados.map(id => 
                SDRService.actualizarProximoContacto(id, fecha, empresaId)
            ));
            setSnackbar({ 
                open: true, 
                message: `${seleccionados.length} contacto(s) actualizados`, 
                severity: 'success' 
            });
            setSeleccionados([]);
            setModalProximoMasivo(false);
            cargarContactos();
        } catch (error) {
            setSnackbar({ open: true, message: 'Error al actualizar', severity: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    // Asignar cadencia masivamente
    const handleAsignarCadenciaMasiva = async (cadenciaId) => {
        if (seleccionados.length === 0) return;
        setActionLoading(true);
        try {
            const resultados = await SDRService.asignarCadenciaMasiva(seleccionados, cadenciaId);
            const exitosos = resultados.filter(r => r.ok).length;
            const fallidos = resultados.filter(r => !r.ok).length;
            setSnackbar({
                open: true,
                message: fallidos > 0
                    ? `Cadencia asignada a ${exitosos} contacto(s). ${fallidos} fallido(s).`
                    : `Cadencia asignada a ${exitosos} contacto(s)`,
                severity: fallidos > 0 ? 'warning' : 'success'
            });
            setSeleccionados([]);
            setModalCadenciaMasiva(false);
            cargarContactos();
        } catch (error) {
            setSnackbar({ open: true, message: 'Error al asignar cadencia', severity: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    // ==================== VISTAS GUARDADAS ====================

    const aplicarVista = (vista) => {
        setVistaActiva(vista);
        // Aplicar filtros de la vista
        const f = vista.filtros || {};
        setFiltroEstado(f.estados?.length === 1 ? f.estados[0] : '');
        setFiltroProximoContacto(f.proximoContacto || '');
        setBusqueda(f.busqueda || '');
        // Determinar filtroTipo según los estados guardados
        if (f.estados?.length === 1 && f.estados[0] === 'no_califica') {
            setFiltroTipo('no_calificados');
        } else if (f.proximoContacto === 'vencido') {
            setFiltroTipo('vencidos');
        } else {
            setFiltroTipo('activos');
        }
    };

    const handleGuardarVista = async () => {
        if (!nombreVista.trim()) return;
        try {
            const data = {
                nombre: nombreVista.trim(),
                empresaId,
                compartida: vistaCompartida,
                filtros: {
                    estados: filtroEstado ? [filtroEstado] : [],
                    proximoContacto: filtroProximoContacto || null,
                    busqueda: busqueda || ''
                },
                ordenarPor: 'prioridadScore',
                ordenDir: 'desc'
            };
            const nuevaVista = await SDRService.crearVista(data);
            setVistas(prev => [nuevaVista, ...prev]);
            setVistaActiva(nuevaVista);
            setModalGuardarVista(false);
            setNombreVista('');
            setVistaCompartida(false);
            setSnackbar({ open: true, message: 'Vista guardada', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: 'Error guardando vista', severity: 'error' });
        }
    };

    const handleEliminarVista = async (vistaId) => {
        try {
            await SDRService.eliminarVista(vistaId);
            setVistas(prev => prev.filter(v => v._id !== vistaId));
            if (vistaActiva?._id === vistaId) setVistaActiva(null);
            setSnackbar({ open: true, message: 'Vista eliminada', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: 'Error eliminando vista', severity: 'error' });
        }
    };

    const handleLimpiarVista = () => {
        setVistaActiva(null);
        setFiltroEstado('');
        setFiltroTipo('activos');
        setFiltroProximoContacto('');
        setBusqueda('');
    };
    
    // Ordenar contactos: vencidos primero, luego por próximo contacto (ascendente)
    const contactosOrdenadosBase = [...contactos].sort((a, b) => {
        const aVencido = estaVencido(a);
        const bVencido = estaVencido(b);
        if (aVencido && !bVencido) return -1;
        if (!aVencido && bVencido) return 1;
        if (a.proximoContacto && b.proximoContacto) {
            return new Date(a.proximoContacto) - new Date(b.proximoContacto);
        }
        if (a.proximoContacto) return -1;
        if (b.proximoContacto) return 1;
        return 0;
    });
    
    // Aplicar filtro de próximo contacto
    const contactosOrdenados = filtrarPorProximoContacto(contactosOrdenadosBase);
    
    // Formatear próximo contacto para mostrar
    const formatearProximo = (fecha) => {
        if (!fecha) return null;
        const d = new Date(fecha);
        const ahora = new Date();
        const diffMs = d - ahora;
        
        if (diffMs < 0) return { texto: 'Vencido', color: 'error' };
        if (diffMs < 1000 * 60 * 60) return { texto: 'Ahora', color: 'warning' };
        if (diffMs < 1000 * 60 * 60 * 24) {
            return { 
                texto: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), 
                color: 'warning' 
            };
        }
        return { 
            texto: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }), 
            color: 'default' 
        };
    };

    // Llamar directo
    const handleLlamarDirecto = (e, contacto) => {
        e.stopPropagation();
        const tel = contacto.telefono?.replace(/\D/g, '');
        window.location.href = `tel:${tel}`;
    };
    
    // WhatsApp directo
    const handleWhatsAppDirecto = (e, contacto) => {
        e.stopPropagation();
        const tel = contacto.telefono?.replace(/\D/g, '');
        window.open(`https://wa.me/${tel}`, '_blank');
    };

    // ==================== RENDER MOBILE ====================
    const renderMobile = () => (
        <Box sx={{ pb: 10 }}>
            {/* Header compacto */}
            <Box sx={{ 
                position: 'sticky', 
                top: 0, 
                bgcolor: 'background.paper', 
                zIndex: 10,
                borderBottom: 1,
                borderColor: 'divider',
                px: 2,
                py: 1.5
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight={700}>Mis Contactos</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        {loading && <CircularProgress size={20} />}
                        <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            endIcon={<ChevronRightIcon />}
                            onClick={handleSiguienteContacto}
                            disabled={contactosOrdenados.length === 0}
                            sx={{ mr: 0.5, textTransform: 'none', minWidth: 'auto', px: 1.5 }}
                        >
                            Siguiente
                        </Button>
                        <IconButton 
                            onClick={() => setModalAgregarContacto(true)} 
                            size="small"
                            color="primary"
                            title="Agregar contacto"
                        >
                            <AddIcon />
                        </IconButton>
                        <IconButton 
                            onClick={() => setModalImportarExcel(true)} 
                            size="small"
                            color="primary"
                            title="Importar Excel"
                        >
                            <UploadFileIcon />
                        </IconButton>
                        <IconButton 
                            onClick={() => setModalAdminTemplates(true)} 
                            size="small"
                            color="default"
                            title="Configurar templates WhatsApp"
                        >
                            <SettingsIcon />
                        </IconButton>
                        <IconButton onClick={() => { cargarContactos(); cargarMetricas(); }} size="small">
                            <RefreshIcon />
                        </IconButton>
                    </Stack>
                </Stack>
            </Box>

            {/* Vistas guardadas */}
            {vistas.length > 0 && (
                <Box sx={{ px: 2, pb: 1, overflowX: 'auto' }}>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 'max-content' }}>
                        <BookmarkBorderIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        {vistas.map(v => (
                            <Chip
                                key={v._id}
                                label={v.nombre}
                                size="small"
                                color={vistaActiva?._id === v._id ? 'primary' : 'default'}
                                variant={vistaActiva?._id === v._id ? 'filled' : 'outlined'}
                                onClick={() => vistaActiva?._id === v._id ? handleLimpiarVista() : aplicarVista(v)}
                                onDelete={vistaActiva?._id === v._id ? () => handleEliminarVista(v._id) : undefined}
                            />
                        ))}
                        <Chip
                            label="Guardar"
                            size="small"
                            icon={<SaveIcon sx={{ fontSize: 14 }} />}
                            variant="outlined"
                            onClick={() => setModalGuardarVista(true)}
                        />
                    </Stack>
                </Box>
            )}

            {/* Filtros principales: Activos / Vencidos / No Calificados */}
            <Box sx={{ px: 2, pb: 1 }}>
                <Stack direction="row" spacing={1}>
                    <Chip 
                        label="Activos" 
                        color={filtroTipo === 'activos' ? 'primary' : 'default'}
                        size="small"
                        variant={filtroTipo === 'activos' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroTipo('activos')}
                    />
                    <Chip 
                        label={`Vencidos (${contarVencidos()})`}
                        color={filtroTipo === 'vencidos' ? 'error' : 'default'}
                        size="small"
                        variant={filtroTipo === 'vencidos' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroTipo('vencidos')}
                        icon={<WarningIcon sx={{ fontSize: 14 }} />}
                    />
                    <Chip 
                        label="No calificados" 
                        color={filtroTipo === 'no_calificados' ? 'error' : 'default'}
                        size="small"
                        variant={filtroTipo === 'no_calificados' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroTipo('no_calificados')}
                    />
                    <Chip 
                        label="Todos" 
                        size="small"
                        variant={filtroTipo === 'todos' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroTipo('todos')}
                    />
                </Stack>
            </Box>

            {/* Filtros por estado (solo si no es "no_calificados") */}
            {filtroTipo !== 'no_calificados' && (
            <Box sx={{ px: 2, pb: 2, overflowX: 'auto' }}>
                <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
                    <Chip 
                        label={`Nuevos: ${contarPorEstado('nuevo')}`} 
                        color="info" 
                        size="small"
                        variant={filtroEstado === 'nuevo' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'nuevo' ? '' : 'nuevo')}
                    />
                    <Chip 
                        label={`Contactados: ${contarPorEstado('contactado')}`} 
                        color="warning" 
                        size="small"
                        variant={filtroEstado === 'contactado' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'contactado' ? '' : 'contactado')}
                    />
                    <Chip 
                        label={`En Cierre: ${contarPorEstado('cierre')}`} 
                        color="secondary" 
                        size="small"
                        variant={filtroEstado === 'cierre' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'cierre' ? '' : 'cierre')}
                    />
                    <Chip 
                        label={`Calificados: ${contarPorEstado('calificado')}`} 
                        color="success" 
                        size="small"
                        variant={filtroEstado === 'calificado' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'calificado' ? '' : 'calificado')}
                    />
                    <Chip 
                        label={`No Responde: ${contarPorEstado('no_responde')}`} 
                        size="small"
                        variant={filtroEstado === 'no_responde' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'no_responde' ? '' : 'no_responde')}
                    />
                    <Chip 
                        label={`Ganados: ${contarPorEstado('ganado')}`} 
                        color="success"
                        size="small"
                        variant={filtroEstado === 'ganado' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'ganado' ? '' : 'ganado')}
                    />
                    <Chip 
                        label={`No Contactado: ${contarPorEstado('no_contacto')}`} 
                        size="small"
                        variant={filtroEstado === 'no_contacto' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'no_contacto' ? '' : 'no_contacto')}
                    />
                    <Chip 
                        label={`Revisar: ${contarPorEstado('revisar_mas_adelante')}`} 
                        color="warning"
                        size="small"
                        variant={filtroEstado === 'revisar_mas_adelante' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'revisar_mas_adelante' ? '' : 'revisar_mas_adelante')}
                    />
                    <Chip 
                        label={`Perdidos: ${contarPorEstado('perdido')}`} 
                        color="error"
                        size="small"
                        variant={filtroEstado === 'perdido' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'perdido' ? '' : 'perdido')}
                    />
                </Stack>
            </Box>
            )}

            {/* Filtros por próximo contacto */}
            <Box sx={{ px: 2, pb: 1, overflowX: 'auto' }}>
                <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5 }}>
                        Próximo:
                    </Typography>
                    <Chip 
                        label={`Sin fecha (${contarSinProximo()})`}
                        size="small"
                        icon={<HourglassEmptyIcon sx={{ fontSize: 14 }} />}
                        color={filtroProximoContacto === 'sin_proximo' ? 'warning' : 'default'}
                        variant={filtroProximoContacto === 'sin_proximo' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximoContacto(filtroProximoContacto === 'sin_proximo' ? '' : 'sin_proximo')}
                    />
                    <Chip 
                        label={`Vencidos (${contarProximoVencido()})`}
                        size="small"
                        icon={<EventBusyIcon sx={{ fontSize: 14 }} />}
                        color={filtroProximoContacto === 'vencido' ? 'error' : 'default'}
                        variant={filtroProximoContacto === 'vencido' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximoContacto(filtroProximoContacto === 'vencido' ? '' : 'vencido')}
                    />
                    <Chip 
                        label={`Pendientes (${contarProximoPendiente()})`}
                        size="small"
                        icon={<ScheduleIcon sx={{ fontSize: 14 }} />}
                        color={filtroProximoContacto === 'pendiente' ? 'success' : 'default'}
                        variant={filtroProximoContacto === 'pendiente' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximoContacto(filtroProximoContacto === 'pendiente' ? '' : 'pendiente')}
                    />
                </Stack>
            </Box>

            {/* Filtros por segmento (inbound / outbound) */}
            <Box sx={{ px: 2, pb: 1, overflowX: 'auto' }}>
                <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5 }}>
                        Segmento:
                    </Typography>
                    <Chip 
                        label="Inbound"
                        size="small"
                        icon={<span style={{ fontSize: 12 }}>🔵</span>}
                        color={filtroSegmento === 'inbound' ? 'info' : 'default'}
                        variant={filtroSegmento === 'inbound' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroSegmento(filtroSegmento === 'inbound' ? '' : 'inbound')}
                    />
                    <Chip 
                        label="Outbound"
                        size="small"
                        icon={<span style={{ fontSize: 12 }}>🟠</span>}
                        color={filtroSegmento === 'outbound' ? 'warning' : 'default'}
                        variant={filtroSegmento === 'outbound' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroSegmento(filtroSegmento === 'outbound' ? '' : 'outbound')}
                    />
                </Stack>
            </Box>

            {/* Barra de acciones masivas */}
            {seleccionados.length > 0 && (
                <Box sx={{ px: 2, pb: 2 }}>
                    <Alert 
                        severity="info" 
                        action={
                            <Stack direction="row" spacing={1}>
                                <Button size="small" onClick={() => setModalProximoMasivo(true)}>
                                    📅 Fecha
                                </Button>
                                {cadenciasDisponibles.length > 0 && (
                                    <Button size="small" onClick={() => setModalCadenciaMasiva(true)}>
                                        🔄 Cadencia
                                    </Button>
                                )}
                                <Button size="small" onClick={() => setSeleccionados([])}>
                                    ✕
                                </Button>
                            </Stack>
                        }
                    >
                        {seleccionados.length} seleccionado(s)
                    </Alert>
                </Box>
            )}

            {/* Búsqueda */}
            <Box sx={{ px: 2, pb: 2 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar por nombre, empresa, teléfono..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                        sx: { borderRadius: 3, bgcolor: 'grey.50' }
                    }}
                />
            </Box>

            {/* Lista de contactos como cards */}
            <Stack spacing={1.5} sx={{ px: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : contactosOrdenados.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            {filtroEstado ? `No hay contactos "${filtroEstado}"` : 'No tienes contactos asignados'}
                        </Typography>
                    </Paper>
                ) : (
                    contactosOrdenados.map((contacto) => {
                        const proximo = formatearProximo(contacto.proximoContacto);
                        const vencido = estaVencido(contacto);
                        
                        return (
                            <Paper
                                key={contacto._id}
                                elevation={seleccionados.includes(contacto._id) ? 4 : (vencido ? 3 : 0)}
                                onClick={() => handleOpenDrawer(contacto)}
                                sx={{ 
                                    p: 2,
                                    cursor: 'pointer',
                                    borderRadius: 3,
                                    border: seleccionados.includes(contacto._id) ? 2 : (vencido ? 2 : 1),
                                    borderColor: seleccionados.includes(contacto._id) ? 'primary.main' : (vencido ? 'error.main' : 'divider'),
                                    bgcolor: seleccionados.includes(contacto._id) ? 'primary.50' : (vencido ? 'error.50' : 'white'),
                                    '&:active': { bgcolor: 'grey.100' }
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center">
                                    {/* Checkbox para selección */}
                                    <Checkbox 
                                        size="small"
                                        checked={seleccionados.includes(contacto._id)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSeleccionar(contacto._id);
                                        }}
                                    />
                                    
                                    {/* Avatar con indicador */}
                                    <Badge
                                        overlap="circular"
                                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                        badgeContent={
                                            vencido ? (
                                                <WarningIcon sx={{ fontSize: 14, color: 'error.main' }} />
                                            ) : contacto.estado === 'nuevo' ? (
                                                <Box sx={{ 
                                                    width: 10, 
                                                    height: 10, 
                                                    bgcolor: 'info.main', 
                                                    borderRadius: '50%',
                                                    border: '2px solid white'
                                                }} />
                                            ) : null
                                        }
                                    >
                                        <Avatar sx={{ 
                                            bgcolor: vencido ? 'error.main' : 'primary.main',
                                            width: 44,
                                            height: 44
                                        }}>
                                            {contacto.nombre?.[0]?.toUpperCase()}
                                        </Avatar>
                                    </Badge>
                                    
                                    {/* Info */}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="subtitle1" fontWeight={600} noWrap>
                                                {contacto.nombre}
                                            </Typography>
                                            <EstadoChip estado={contacto.estado} />
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary" noWrap>
                                            {contacto.empresa || contacto.telefono}
                                        </Typography>
                                        {/* Badges: precalificación bot + prioridad */}
                                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.3 }}>
                                            {contacto.precalificacionBot && contacto.precalificacionBot !== 'sin_calificar' && (
                                                <Chip 
                                                    size="small" 
                                                    icon={<SmartToyIcon sx={{ fontSize: 12 }} />}
                                                    label={PRECALIFICACION_BOT[contacto.precalificacionBot]?.label || contacto.precalificacionBot}
                                                    color={PRECALIFICACION_BOT[contacto.precalificacionBot]?.color || 'default'}
                                                    variant="outlined"
                                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                                />
                                            )}
                                            {contacto.prioridadScore > 0 && (
                                                <Chip 
                                                    size="small" 
                                                    label={`P:${contacto.prioridadScore}`}
                                                    color={contacto.prioridadScore >= 70 ? 'error' : contacto.prioridadScore >= 40 ? 'warning' : 'default'}
                                                    variant="outlined"
                                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                                />
                                            )}
                                            {contacto.segmento && (
                                                <Chip 
                                                    size="small" 
                                                    label={contacto.segmento === 'inbound' ? '🔵 In' : '🟠 Out'}
                                                    variant="outlined"
                                                    color={contacto.segmento === 'inbound' ? 'info' : 'warning'}
                                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                                />
                                            )}
                                        </Stack>
                                        {proximo && (
                                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                                                <AccessTimeIcon sx={{ fontSize: 14, color: `${proximo.color}.main` }} />
                                                <Typography 
                                                    variant="caption" 
                                                    color={`${proximo.color}.main`}
                                                    fontWeight={vencido ? 700 : 400}
                                                >
                                                    {proximo.texto}
                                                </Typography>
                                            </Stack>
                                        )}
                                    </Box>
                                    
                                    {/* Acciones rápidas */}
                                    <Stack direction="row" spacing={0.5}>
                                        <IconButton 
                                            size="small"
                                            onClick={(e) => handleLlamarDirecto(e, contacto)}
                                            sx={{ 
                                                bgcolor: '#4caf50', 
                                                color: 'white',
                                                '&:hover': { bgcolor: '#388e3c' }
                                            }}
                                        >
                                            <PhoneIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton 
                                            size="small"
                                            onClick={(e) => handleWhatsAppDirecto(e, contacto)}
                                            sx={{ 
                                                bgcolor: '#25D366', 
                                                color: 'white',
                                                '&:hover': { bgcolor: '#128C7E' }
                                            }}
                                        >
                                            <WhatsAppIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </Stack>
                            </Paper>
                        );
                    })
                )}
            </Stack>

            {/* FAB para scroll to top */}
            <Fab
                size="small"
                color="primary"
                sx={{ 
                    position: 'fixed', 
                    bottom: 80, 
                    right: 16,
                    display: contactosOrdenados.length > 5 ? 'flex' : 'none'
                }}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
                <ArrowUpwardIcon />
            </Fab>
        </Box>
    );

    // ==================== RENDER DESKTOP ====================
    const renderDesktop = () => (
        <Container maxWidth="xl">
            <Stack spacing={3}>
                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h4">Mis Contactos</Typography>
                    <Stack direction="row" spacing={1}>
                        <Button
                            startIcon={<ChevronRightIcon />}
                            onClick={handleSiguienteContacto}
                            variant="contained"
                            color="success"
                            disabled={contactosOrdenados.length === 0}
                        >
                            Siguiente contacto
                        </Button>
                        <Button
                            startIcon={<AddIcon />}
                            onClick={() => setModalAgregarContacto(true)}
                            variant="contained"
                            color="primary"
                        >
                            Agregar
                        </Button>
                        <Button
                            startIcon={<UploadFileIcon />}
                            onClick={() => setModalImportarExcel(true)}
                            variant="outlined"
                        >
                            Importar Excel
                        </Button>
                        <Button
                            startIcon={<SettingsIcon />}
                            onClick={() => setModalAdminTemplates(true)}
                            variant="outlined"
                            color="inherit"
                        >
                            Templates
                        </Button>
                        <Button
                            startIcon={<RefreshIcon />}
                            onClick={() => { cargarContactos(); cargarMetricas(); }}
                            disabled={loading}
                        >
                            Actualizar
                        </Button>
                    </Stack>
                </Stack>

                {/* Métricas del SDR con selector de período */}
                {metricas && (
                    <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Stack direction="row" spacing={1} alignItems="baseline">
                                <Typography variant="h6">Mi Actividad</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {periodoMetricas === 'hoy' ? 'hoy' : periodoMetricas === 'semana' ? 'últimos 7 días' : 'último mes'}
                                    {metricas._estimado && ' (estimado)'}
                                </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1}>
                                <Chip 
                                    label="Hoy" 
                                    size="small"
                                    color={periodoMetricas === 'hoy' ? 'primary' : 'default'}
                                    variant={periodoMetricas === 'hoy' ? 'filled' : 'outlined'}
                                    onClick={() => setPeriodoMetricas('hoy')}
                                />
                                <Chip 
                                    label="Semana" 
                                    size="small"
                                    color={periodoMetricas === 'semana' ? 'primary' : 'default'}
                                    variant={periodoMetricas === 'semana' ? 'filled' : 'outlined'}
                                    onClick={() => setPeriodoMetricas('semana')}
                                />
                                <Chip 
                                    label="Mes" 
                                    size="small"
                                    color={periodoMetricas === 'mes' ? 'primary' : 'default'}
                                    variant={periodoMetricas === 'mes' ? 'filled' : 'outlined'}
                                    onClick={() => setPeriodoMetricas('mes')}
                                />
                            </Stack>
                        </Stack>
                        <Grid container spacing={2}>
                            <Grid item xs={6} sm={4} md={2}>
                                <Paper sx={{ p: 2, textAlign: 'center' }}>
                                    <PhoneIcon color="primary" />
                                    <Typography variant="h5">{metricas.llamadasRealizadas}</Typography>
                                    <Typography variant="caption" color="text.secondary">Llamadas</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6} sm={4} md={2}>
                                <Paper sx={{ p: 2, textAlign: 'center' }}>
                                    <CheckCircleIcon color="success" />
                                    <Typography variant="h5">{metricas.llamadasAtendidas}</Typography>
                                    <Typography variant="caption" color="text.secondary">Atendidas</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6} sm={4} md={2}>
                                <Paper sx={{ p: 2, textAlign: 'center' }}>
                                    <WhatsAppIcon sx={{ color: '#25D366' }} />
                                    <Typography variant="h5">{metricas.whatsappEnviados}</Typography>
                                    <Typography variant="caption" color="text.secondary">WhatsApp</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6} sm={4} md={2}>
                                <Paper sx={{ p: 2, textAlign: 'center' }}>
                                    <EventIcon color="secondary" />
                                    <Typography variant="h5">{metricas.reunionesCoordinadas}</Typography>
                                    <Typography variant="caption" color="text.secondary">Reuniones</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6} sm={4} md={2}>
                                <Paper sx={{ p: 2, textAlign: 'center' }}>
                                    <TrendingUpIcon color={metricas.llamadasRealizadas > 0 ? 'success' : 'action'} />
                                    <Typography variant="h5">
                                        {metricas.llamadasRealizadas > 0
                                            ? `${Math.round((metricas.llamadasAtendidas / metricas.llamadasRealizadas) * 100)}%`
                                            : '—'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">Tasa contacto</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6} sm={4} md={2}>
                                <Paper sx={{ p: 2, textAlign: 'center' }}>
                                    <Typography variant="h5">{contactos.length}</Typography>
                                    <Typography variant="caption" color="text.secondary">Total asignados</Typography>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {/* Vistas guardadas */}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <BookmarkIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                        Vistas:
                    </Typography>
                    {vistas.map(v => (
                        <Chip
                            key={v._id}
                            label={v.nombre}
                            size="small"
                            color={vistaActiva?._id === v._id ? 'primary' : 'default'}
                            variant={vistaActiva?._id === v._id ? 'filled' : 'outlined'}
                            onClick={() => vistaActiva?._id === v._id ? handleLimpiarVista() : aplicarVista(v)}
                            onDelete={vistaActiva?._id === v._id ? () => handleEliminarVista(v._id) : undefined}
                        />
                    ))}
                    <Chip
                        label="Guardar vista actual"
                        size="small"
                        icon={<SaveIcon />}
                        variant="outlined"
                        onClick={() => setModalGuardarVista(true)}
                    />
                    {vistaActiva && (
                        <Chip
                            label="Limpiar"
                            size="small"
                            onDelete={handleLimpiarVista}
                        />
                    )}
                </Stack>

                {/* Estadísticas por estado */}
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip 
                        label={`Nuevos: ${contarPorEstado('nuevo')}`} 
                        color="info" 
                        variant={filtroEstado === 'nuevo' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'nuevo' ? '' : 'nuevo')}
                    />
                    <Chip 
                        label={`Contactados: ${contarPorEstado('contactado')}`} 
                        color="warning" 
                        variant={filtroEstado === 'contactado' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'contactado' ? '' : 'contactado')}
                    />
                    <Chip 
                        label={`En Cierre: ${contarPorEstado('cierre')}`} 
                        color="secondary" 
                        variant={filtroEstado === 'cierre' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'cierre' ? '' : 'cierre')}
                    />
                    <Chip 
                        label={`Calificados: ${contarPorEstado('calificado')}`} 
                        color="success" 
                        variant={filtroEstado === 'calificado' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'calificado' ? '' : 'calificado')}
                    />
                    <Chip 
                        label={`No Califica: ${contarPorEstado('no_califica')}`} 
                        color="error" 
                        variant={filtroEstado === 'no_califica' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'no_califica' ? '' : 'no_califica')}
                    />
                    <Chip 
                        label={`No Responde: ${contarPorEstado('no_responde')}`} 
                        color="default" 
                        variant={filtroEstado === 'no_responde' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'no_responde' ? '' : 'no_responde')}
                    />
                    <Chip 
                        label={`Ganados: ${contarPorEstado('ganado')}`} 
                        color="success" 
                        variant={filtroEstado === 'ganado' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'ganado' ? '' : 'ganado')}
                    />
                    <Chip 
                        label={`No Contactado: ${contarPorEstado('no_contacto')}`} 
                        color="default" 
                        variant={filtroEstado === 'no_contacto' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'no_contacto' ? '' : 'no_contacto')}
                    />
                    <Chip 
                        label={`Revisar: ${contarPorEstado('revisar_mas_adelante')}`} 
                        color="warning" 
                        variant={filtroEstado === 'revisar_mas_adelante' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'revisar_mas_adelante' ? '' : 'revisar_mas_adelante')}
                    />
                    <Chip 
                        label={`Perdidos: ${contarPorEstado('perdido')}`} 
                        color="error" 
                        variant={filtroEstado === 'perdido' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'perdido' ? '' : 'perdido')}
                    />
                </Stack>

                {/* Filtros por próximo contacto */}
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                        Próximo contacto:
                    </Typography>
                    <Chip 
                        label={`Sin fecha (${contarSinProximo()})`}
                        icon={<HourglassEmptyIcon />}
                        color={filtroProximoContacto === 'sin_proximo' ? 'warning' : 'default'}
                        variant={filtroProximoContacto === 'sin_proximo' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximoContacto(filtroProximoContacto === 'sin_proximo' ? '' : 'sin_proximo')}
                    />
                    <Chip 
                        label={`Vencidos (${contarProximoVencido()})`}
                        icon={<EventBusyIcon />}
                        color={filtroProximoContacto === 'vencido' ? 'error' : 'default'}
                        variant={filtroProximoContacto === 'vencido' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximoContacto(filtroProximoContacto === 'vencido' ? '' : 'vencido')}
                    />
                    <Chip 
                        label={`Pendientes (${contarProximoPendiente()})`}
                        icon={<ScheduleIcon />}
                        color={filtroProximoContacto === 'pendiente' ? 'success' : 'default'}
                        variant={filtroProximoContacto === 'pendiente' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximoContacto(filtroProximoContacto === 'pendiente' ? '' : 'pendiente')}
                    />
                    {filtroProximoContacto && (
                        <Chip 
                            label="Limpiar"
                            size="small"
                            onDelete={() => setFiltroProximoContacto('')}
                        />
                    )}
                </Stack>

                {/* Barra de acciones masivas */}
                {seleccionados.length > 0 && (
                    <Alert 
                        severity="info"
                        action={
                            <Stack direction="row" spacing={1}>
                                <Button 
                                    size="small" 
                                    startIcon={<ScheduleIcon />}
                                    onClick={() => setModalProximoMasivo(true)}
                                >
                                    Actualizar fecha
                                </Button>
                                {cadenciasDisponibles.length > 0 && (
                                    <Button 
                                        size="small" 
                                        startIcon={<PlayArrowIcon />}
                                        onClick={() => setModalCadenciaMasiva(true)}
                                    >
                                        Asignar cadencia
                                    </Button>
                                )}
                                <Button size="small" onClick={() => setSeleccionados([])}>
                                    Limpiar selección
                                </Button>
                            </Stack>
                        }
                    >
                        {seleccionados.length} contacto(s) seleccionado(s)
                    </Alert>
                )}

                {/* Búsqueda */}
                <Paper sx={{ p: 2 }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Buscar por nombre, empresa, teléfono..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            )
                        }}
                    />
                </Paper>

                {/* Tabla */}
                <Paper>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox">
                                        <Checkbox 
                                            indeterminate={seleccionados.length > 0 && seleccionados.length < contactosOrdenados.length}
                                            checked={contactosOrdenados.length > 0 && seleccionados.length === contactosOrdenados.length}
                                            onChange={handleSeleccionarTodos}
                                        />
                                    </TableCell>
                                    <TableCell>Nombre</TableCell>
                                    <TableCell>Empresa</TableCell>
                                    <TableCell>Teléfono</TableCell>
                                    <TableCell>Estado</TableCell>
                                    <TableCell>Bot</TableCell>
                                    <TableCell>Prior.</TableCell>
                                    <TableCell>Próximo</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {contactosOrdenados.map((contacto) => {
                                    const proximo = formatearProximo(contacto.proximoContacto);
                                    const vencido = estaVencido(contacto);
                                    const seleccionado = seleccionados.includes(contacto._id);
                                    
                                    return (
                                        <TableRow 
                                            key={contacto._id}
                                            hover
                                            selected={seleccionado}
                                            sx={{ 
                                                cursor: 'pointer',
                                                bgcolor: vencido ? 'error.50' : (seleccionado ? 'primary.50' : 'inherit')
                                            }}
                                            onClick={() => handleOpenDrawer(contacto)}
                                        >
                                            <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox 
                                                    checked={seleccionado}
                                                    onChange={() => handleSeleccionar(contacto._id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={contacto.estado === 'nuevo' ? 600 : 400}>
                                                    {contacto.nombre}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{contacto.empresa || '-'}</TableCell>
                                            <TableCell>{contacto.telefono}</TableCell>
                                            <TableCell>
                                                <EstadoChip estado={contacto.estado} />
                                            </TableCell>
                                            <TableCell>
                                                {contacto.precalificacionBot && contacto.precalificacionBot !== 'sin_calificar' ? (
                                                    <Chip 
                                                        size="small" 
                                                        icon={<SmartToyIcon sx={{ fontSize: 14 }} />}
                                                        label={PRECALIFICACION_BOT[contacto.precalificacionBot]?.label || contacto.precalificacionBot}
                                                        color={PRECALIFICACION_BOT[contacto.precalificacionBot]?.color || 'default'}
                                                        variant="outlined"
                                                        sx={{ height: 22, fontSize: '0.7rem' }}
                                                    />
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {contacto.prioridadScore > 0 ? (
                                                    <Chip 
                                                        size="small" 
                                                        label={contacto.prioridadScore}
                                                        color={contacto.prioridadScore >= 70 ? 'error' : contacto.prioridadScore >= 40 ? 'warning' : 'default'}
                                                        variant="filled"
                                                        sx={{ height: 22, fontWeight: 700 }}
                                                    />
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {proximo ? (
                                                    <Chip 
                                                        size="small" 
                                                        label={proximo.texto}
                                                        color={proximo.color}
                                                        variant="outlined"
                                                    />
                                                ) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {contactos.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">
                                                {filtroEstado 
                                                    ? `No hay contactos con estado "${filtroEstado}"`
                                                    : 'No tienes contactos asignados'
                                                }
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </Paper>
            </Stack>
        </Container>
    );

    return (
        <>
            <Head>
                <title>Mis Contactos SDR</title>
            </Head>
            <Box component="main" sx={{ flexGrow: 1, py: isMobile ? 0 : 4 }}>
                {isMobile ? renderMobile() : renderDesktop()}
            </Box>

            {/* Drawer de contacto */}
            <DrawerDetalleContactoSDR
                open={drawerOpen}
                onClose={handleCloseDrawer}
                contacto={contactoSeleccionado}
                contactos={contactosOrdenados}
                indiceActual={contactosOrdenados.findIndex(c => c._id === contactoSeleccionado?._id)}
                onCambiarIndice={(nuevoIndice) => {
                    const nuevoContacto = contactosOrdenados[nuevoIndice];
                    setContactoSeleccionado(nuevoContacto);
                    // Actualizar URL al navegar
                    router.push(
                        { pathname: router.pathname, query: { ...router.query, contacto: nuevoContacto._id } },
                        undefined,
                        { shallow: true }
                    );
                }}
                onAccion={handleAccion}
                onAgregarComentario={handleAgregarComentario}
                onMarcarNoCalifica={handleMarcarNoCalifica}
                onRefresh={async () => { 
                    await refrescarContactoSeleccionado();
                    cargarContactos(); 
                    cargarMetricas(); 
                }}
                mostrarSnackbar={(msg, sev) => setSnackbar({ open: true, message: msg, severity: sev || 'success' })}
                empresaId={empresaId}
                historialVersion={historialVersion}
                user={user}
            />

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* Modal Agregar Contacto Manual */}
            <ModalAgregarContacto
                open={modalAgregarContacto}
                onClose={() => setModalAgregarContacto(false)}
                empresaId={empresaId}
                sdrId={sdrId}
                sdrNombre={sdrNombre}
                onSuccess={() => {
                    cargarContactos();
                    cargarMetricas();
                    setSnackbar({ open: true, message: 'Contacto agregado correctamente', severity: 'success' });
                }}
            />

            {/* Modal Importar Excel */}
            <ModalImportarExcel
                open={modalImportarExcel}
                onClose={() => setModalImportarExcel(false)}
                empresaId={empresaId}
                sdrId={sdrId}
                sdrNombre={sdrNombre}
                onSuccess={(cantidad) => {
                    cargarContactos();
                    cargarMetricas();
                    setSnackbar({ open: true, message: `${cantidad} contactos importados correctamente`, severity: 'success' });
                }}
            />

            {/* Modal Admin Templates WhatsApp */}
            <ModalAdminTemplates
                open={modalAdminTemplates}
                onClose={() => setModalAdminTemplates(false)}
                empresaId={empresaId}
            />

            {/* Modal Registrar Reunión */}
            <ModalReunionSDR
                open={modalReunion}
                onClose={() => setModalReunion(false)}
                contacto={contactoSeleccionado}
                onSubmit={handleRegistrarReunion}
                loading={actionLoading}
            />

            {/* Modal Próximo Contacto Masivo */}
            <ModalProximoContactoMasivo
                open={modalProximoMasivo}
                onClose={() => setModalProximoMasivo(false)}
                cantidad={seleccionados.length}
                onSubmit={handleActualizarProximoMasivo}
                loading={actionLoading}
            />

            {/* Modal Asignar Cadencia Masiva */}
            <Dialog
                open={modalCadenciaMasiva}
                onClose={() => setModalCadenciaMasiva(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Asignar cadencia a {seleccionados.length} contacto(s)</DialogTitle>
                <DialogContent>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                        {cadenciasDisponibles.map((cad) => (
                            <Button
                                key={cad._id}
                                variant="outlined"
                                fullWidth
                                startIcon={<PlayArrowIcon />}
                                onClick={() => handleAsignarCadenciaMasiva(cad._id)}
                                disabled={actionLoading}
                                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                            >
                                {cad.nombre}
                                {cad.esDefault && (
                                    <Chip size="small" label="Default" color="primary" variant="outlined" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />
                                )}
                            </Button>
                        ))}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalCadenciaMasiva(false)}>Cancelar</Button>
                </DialogActions>
            </Dialog>

            {/* Modal Guardar Vista */}
            <Dialog
                open={modalGuardarVista}
                onClose={() => setModalGuardarVista(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>💾 Guardar vista actual</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Nombre de la vista"
                            value={nombreVista}
                            onChange={(e) => setNombreVista(e.target.value)}
                            fullWidth
                            size="small"
                            placeholder="Ej: Leads calientes, Vencidos esta semana..."
                            autoFocus
                        />
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Checkbox
                                checked={vistaCompartida}
                                onChange={(e) => setVistaCompartida(e.target.checked)}
                                size="small"
                            />
                            <Typography variant="body2">Compartir con el equipo</Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            Se guardarán los filtros actuales: estado, tipo, próximo contacto y búsqueda.
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalGuardarVista(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        onClick={handleGuardarVista}
                        disabled={!nombreVista.trim()}
                        startIcon={<SaveIcon />}
                    >
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

// Componente Modal de Próximo Contacto Masivo
const ModalProximoContactoMasivo = ({ open, onClose, cantidad, onSubmit, loading }) => {
    const [opcionSeleccionada, setOpcionSeleccionada] = useState('24h');
    const [fechaPersonalizada, setFechaPersonalizada] = useState('');

    const opciones = [
        { value: '1h', label: 'En 1 hora' },
        { value: '3h', label: 'En 3 horas' },
        { value: '24h', label: 'Mañana' },
        { value: '3d', label: 'En 3 días' },
        { value: '1w', label: 'En 1 semana' },
        { value: 'custom', label: 'Fecha específica' },
        { value: 'clear', label: 'Quitar fecha' },
    ];

    const calcularFecha = () => {
        if (opcionSeleccionada === 'clear') return null;
        if (opcionSeleccionada === 'custom') return fechaPersonalizada ? new Date(fechaPersonalizada) : null;
        
        const ahora = new Date();
        switch (opcionSeleccionada) {
            case '1h': return new Date(ahora.getTime() + 1 * 60 * 60 * 1000);
            case '3h': return new Date(ahora.getTime() + 3 * 60 * 60 * 1000);
            case '24h': return new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
            case '3d': return new Date(ahora.getTime() + 3 * 24 * 60 * 60 * 1000);
            case '1w': return new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
            default: return null;
        }
    };

    const handleSubmit = () => {
        const fecha = calcularFecha();
        onSubmit(fecha);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>📅 Actualizar próximo contacto</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {cantidad} contacto(s) seleccionado(s)
                </Typography>
                <Stack spacing={1}>
                    {opciones.map(op => (
                        <Chip
                            key={op.value}
                            label={op.label}
                            color={opcionSeleccionada === op.value ? 'primary' : 'default'}
                            variant={opcionSeleccionada === op.value ? 'filled' : 'outlined'}
                            onClick={() => setOpcionSeleccionada(op.value)}
                            sx={{ justifyContent: 'flex-start' }}
                        />
                    ))}
                    {opcionSeleccionada === 'custom' && (
                        <TextField
                            type="datetime-local"
                            value={fechaPersonalizada}
                            onChange={(e) => setFechaPersonalizada(e.target.value)}
                            fullWidth
                            size="small"
                            sx={{ mt: 1 }}
                            InputLabelProps={{ shrink: true }}
                        />
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button 
                    variant="contained" 
                    onClick={handleSubmit}
                    disabled={loading || (opcionSeleccionada === 'custom' && !fechaPersonalizada)}
                >
                    {loading ? <CircularProgress size={20} /> : 'Actualizar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Componente Modal de Reunión
const TAMANOS_EMPRESA = ['1-10', '11-50', '51-200', '200+'];

const ModalReunionSDR = ({ open, onClose, contacto, onSubmit, loading }) => {
    const [form, setForm] = useState({
        fechaHora: '',
        empresaNombre: '',
        tamanoEmpresa: '',
        contactoPrincipal: '',
        rolContacto: '',
        puntosDeDolor: '',
        modulosPotenciales: '',
        linkAgenda: ''
    });

    useEffect(() => {
        if (contacto && open) {
            setForm({
                fechaHora: '',
                empresaNombre: contacto.empresa || '',
                tamanoEmpresa: contacto.tamanoEmpresa || '',
                contactoPrincipal: contacto.nombre || '',
                rolContacto: contacto.cargo || '',
                puntosDeDolor: '',
                modulosPotenciales: '',
                linkAgenda: ''
            });
        }
    }, [contacto, open]);

    const handleSubmit = () => {
        onSubmit(form);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>📅 Registrar Reunión</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField 
                        label="Fecha y hora *" 
                        type="datetime-local" 
                        value={form.fechaHora} 
                        onChange={(e) => setForm({ ...form, fechaHora: e.target.value })} 
                        fullWidth 
                        InputLabelProps={{ shrink: true }} 
                        required 
                    />
                    <TextField 
                        label="Nombre de la empresa *" 
                        value={form.empresaNombre} 
                        onChange={(e) => setForm({ ...form, empresaNombre: e.target.value })} 
                        fullWidth 
                        required 
                    />
                    <FormControl fullWidth required>
                        <InputLabel>Tamaño de empresa *</InputLabel>
                        <Select 
                            value={form.tamanoEmpresa} 
                            label="Tamaño de empresa *" 
                            onChange={(e) => setForm({ ...form, tamanoEmpresa: e.target.value })}
                        >
                            {TAMANOS_EMPRESA.map(t => (
                                <MenuItem key={t} value={t}>{t} empleados</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField 
                        label="Contacto principal *" 
                        value={form.contactoPrincipal} 
                        onChange={(e) => setForm({ ...form, contactoPrincipal: e.target.value })} 
                        fullWidth 
                        required 
                    />
                    <TextField 
                        label="Rol del contacto" 
                        value={form.rolContacto} 
                        onChange={(e) => setForm({ ...form, rolContacto: e.target.value })} 
                        fullWidth 
                        placeholder="Ej: Gerente, Dueño, etc." 
                    />
                    <TextField 
                        label="Puntos de dolor" 
                        value={form.puntosDeDolor} 
                        onChange={(e) => setForm({ ...form, puntosDeDolor: e.target.value })} 
                        fullWidth 
                        multiline 
                        rows={2} 
                        placeholder="¿Qué problemas tiene la empresa?" 
                    />
                    <TextField 
                        label="Módulos potenciales" 
                        value={form.modulosPotenciales} 
                        onChange={(e) => setForm({ ...form, modulosPotenciales: e.target.value })} 
                        fullWidth 
                        placeholder="Ej: Facturación, Stock, etc." 
                    />
                    <TextField 
                        label="Link de la reunión" 
                        value={form.linkAgenda} 
                        onChange={(e) => setForm({ ...form, linkAgenda: e.target.value })} 
                        fullWidth 
                        placeholder="Google Meet, Zoom, etc." 
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button 
                    variant="contained" 
                    onClick={handleSubmit} 
                    disabled={!form.fechaHora || !form.empresaNombre || !form.tamanoEmpresa || !form.contactoPrincipal || loading}
                >
                    {loading ? <CircularProgress size={20} /> : 'Registrar Reunión'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

ContactosSDRPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ContactosSDRPage;