import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import {
    Box, Container, Stack, Typography, Button, TextField, Chip,
    Table, TableBody, TableCell, TableHead, TableRow,
    CircularProgress, MenuItem, Select, FormControl, InputLabel,
    Snackbar, Alert, Paper, InputAdornment, Grid, IconButton,
    Card, CardContent, CardActions, Divider, useTheme, useMediaQuery,
    Avatar, Badge, Fab, Dialog, DialogTitle, DialogContent, DialogActions,
    Checkbox, Tooltip, Tabs, Tab
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
import InboxIcon from '@mui/icons-material/Inbox';
import ReplayIcon from '@mui/icons-material/Replay';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ViewListIcon from '@mui/icons-material/ViewList';
import HistoryIcon from '@mui/icons-material/History';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import SDRService from 'src/services/sdrService';
import DrawerDetalleContactoSDR, { EstadoChip } from 'src/components/sdr/DrawerDetalleContactoSDR';
import ModalAgregarContacto from 'src/components/sdr/ModalAgregarContacto';
import ModalImportarExcel from 'src/components/sdr/ModalImportarExcel';
import ModalAdminTemplates from 'src/components/sdr/ModalAdminTemplates';
import ModalCrearReunion from 'src/components/sdr/ModalCrearReunion';
import ContadoresActividad from 'src/components/sdr/ContadoresActividad';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SortIcon from '@mui/icons-material/Sort';
import BulkSendTemplateDialog from 'src/components/sdr/BulkSendTemplateDialog';
import BulkRegistrarAccionDialog from 'src/components/sdr/BulkRegistrarAccionDialog';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LinkIcon from '@mui/icons-material/Link';
import { PRECALIFICACION_BOT, PLANES_SORBY } from 'src/constant/sdrConstants';

const ITEMS_PER_PAGE = 50;

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
    const [totalContactos, setTotalContactos] = useState(0);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    
    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [bandejaActiva, setBandejaActiva] = useState('nuevos'); // 'nuevos' | 'reintentos' | 'seguimiento' | 'reunionesPendientes' | 'reunionesPasadas' | 'todos'
    const [filtroProximoContacto, setFiltroProximoContacto] = useState(''); // '' | 'sin_proximo' | 'vencido' | 'pendiente'
    const [filtroSegmento, setFiltroSegmento] = useState(''); // '' | 'inbound' | 'outbound'
    const [filtroActividad, setFiltroActividad] = useState(''); // '' | 'sin_llamadas' | 'con_llamadas_no_atendidas' | 'con_llamadas_atendidas' | 'con_mensajes' | 'con_reuniones' | 'sin_actividad'
    const [filtroCalificadoBot, setFiltroCalificadoBot] = useState(''); // '' | 'calificado' | 'no_calificado' | 'quiere_meet' | 'no_llego'
    const [filtroQuiereReunion, setFiltroQuiereReunion] = useState(''); // '' | 'si' | 'no'
    const [filtroProximaTarea, setFiltroProximaTarea] = useState(''); // '' | 'llamada' | 'whatsapp' | 'email' | 'recordatorio' | 'sin_tarea'
    const [filtroExcluirConReunion, setFiltroExcluirConReunion] = useState(false); // true = excluir contactos con reunión
    const [ordenarPor, setOrdenarPor] = useState(''); // vacío = el backend elige según bandeja
    
    // Contadores de bandejas (para badges)
    const [contadoresBandejas, setContadoresBandejas] = useState({ nuevos: 0, reintentos: 0, seguimiento: 0, reunionesPendientes: 0, reunionesPasadas: 0, reunionesSinConfirmar: 0 });
    
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
    const [modalBulkTemplate, setModalBulkTemplate] = useState(false);
    const [modalBulkAccion, setModalBulkAccion] = useState(false);
    const [modalCambiarEstadoMasivo, setModalCambiarEstadoMasivo] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Permiso para enviar templates via bot
    const tienePermisoEnviarBot = user?.admin || (user?.empresa?.acciones || []).includes('ENVIAR_MENSAJE_BOT');
    
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
                sdrAsignado: sdrId,
                page,
                limit: ITEMS_PER_PAGE
            };
            
            // Enviar bandeja si no es 'todos'
            if (bandejaActiva !== 'todos') {
                params.bandeja = bandejaActiva;
            } else {
                // 'todos' excluye no_califica por defecto
                params.excluirEstados = 'no_califica';
            }
            
            if (filtroEstado) params.estado = filtroEstado;
            if (busqueda) params.busqueda = busqueda;
            if (filtroSegmento) params.segmento = filtroSegmento;
            if (filtroExcluirConReunion) params.excluirConReunion = 'true';
            
            // Mapear ordenamiento al formato del backend
            if (ordenarPor) {
                const ordenMap = {
                    'vencidos': { ordenarPor: 'proximoContacto', ordenDir: 'asc' },
                    'nuevo': { ordenarPor: 'createdAt', ordenDir: 'desc' },
                    'fecha': { ordenarPor: 'ultimaAccion', ordenDir: 'desc' },
                    'estado': { ordenarPor: 'estado', ordenDir: 'asc' },
                    'prioridad': { ordenarPor: 'prioridad', ordenDir: 'desc' },
                    'proximo_contacto': { ordenarPor: 'proximoContacto', ordenDir: 'asc' },
                    'fecha_creacion': { ordenarPor: 'createdAt', ordenDir: 'desc' },
                };
                const orden = ordenMap[ordenarPor];
                if (orden) {
                    params.ordenarPor = orden.ordenarPor;
                    params.ordenDir = orden.ordenDir;
                }
            }
            // Si no hay ordenarPor, el backend elige según la bandeja
            
            const data = await SDRService.listarContactos(params);
            setContactos(data.contactos || []);
            setTotalContactos(data.total || 0);
        } catch (err) {
            console.error('Error cargando contactos:', err);
            setSnackbar({ open: true, message: 'Error cargando contactos', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, [empresaId, sdrId, filtroEstado, bandejaActiva, busqueda, filtroSegmento, filtroExcluirConReunion, ordenarPor, page]);

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

    // Cargar contadores de bandejas
    const cargarBandejas = useCallback(async () => {
        if (!sdrId) return;
        try {
            const data = await SDRService.contadorBandejas({ sdrAsignado: sdrId });
            setContadoresBandejas(data);
        } catch (err) {
            console.error('Error cargando bandejas:', err);
        }
    }, [sdrId]);

    // Resetear página a 1 cuando cambian los filtros u ordenamiento
    useEffect(() => {
        setPage(1);
        setFiltroEstado(''); // Limpiar filtro de estado al cambiar de bandeja
        setFiltroCalificadoBot('');
        setFiltroQuiereReunion('');
        setFiltroProximaTarea('');
    }, [bandejaActiva]);
    
    useEffect(() => {
        setPage(1);
    }, [filtroEstado, busqueda, filtroSegmento, ordenarPor]);

    useEffect(() => {
        cargarContactos();
        cargarBandejas(); // Refrescar badges siempre que se cargan contactos
    }, [cargarContactos]);

    useEffect(() => {
        cargarBandejas();
    }, [cargarBandejas]);

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
    const contarVencidosHoy = () => {
        const hoy = new Date();
        return contactos.filter(c => {
            if (!c.proximoContacto) return false;
            const d = new Date(c.proximoContacto);
            return d < hoy && d.toDateString() === hoy.toDateString();
        }).length;
    };
    
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
        const hoy = new Date();
        return lista.filter(c => {
            if (filtroProximoContacto === 'sin_proximo') return !c.proximoContacto;
            if (filtroProximoContacto === 'vencido') return c.proximoContacto && new Date(c.proximoContacto) < hoy;
            if (filtroProximoContacto === 'vencido_hoy') {
                if (!c.proximoContacto) return false;
                const d = new Date(c.proximoContacto);
                return d < hoy && d.toDateString() === hoy.toDateString();
            }
            if (filtroProximoContacto === 'pendiente') return c.proximoContacto && new Date(c.proximoContacto) >= hoy;
            return true;
        });
    };

    // Contadores de actividad por tipo
    const contarPorActividad = (tipo) => {
        return contactos.filter(c => {
            const cnt = c.contadores || {};
            switch (tipo) {
                case 'sin_actividad': return !cnt.llamadasNoAtendidas && !cnt.llamadasAtendidas && !cnt.mensajesEnviados && !cnt.reunionesTotales;
                case 'con_llamadas_no_atendidas': return (cnt.llamadasNoAtendidas || 0) > 0;
                case 'con_llamadas_atendidas': return (cnt.llamadasAtendidas || 0) > 0;
                case 'sin_llamadas': return !(cnt.llamadasNoAtendidas || 0) && !(cnt.llamadasAtendidas || 0);
                case 'con_mensajes': return (cnt.mensajesEnviados || 0) > 0;
                case 'con_reuniones': return (cnt.reunionesTotales || 0) > 0;
                default: return true;
            }
        }).length;
    };

    // Filtrar contactos según filtro de actividad
    const filtrarPorActividad = (lista) => {
        if (!filtroActividad) return lista;
        return lista.filter(c => {
            const cnt = c.contadores || {};
            switch (filtroActividad) {
                case 'sin_actividad': return !cnt.llamadasNoAtendidas && !cnt.llamadasAtendidas && !cnt.mensajesEnviados && !cnt.reunionesTotales;
                case 'con_llamadas_no_atendidas': return (cnt.llamadasNoAtendidas || 0) > 0;
                case 'con_llamadas_atendidas': return (cnt.llamadasAtendidas || 0) > 0;
                case 'sin_llamadas': return !(cnt.llamadasNoAtendidas || 0) && !(cnt.llamadasAtendidas || 0);
                case 'con_mensajes': return (cnt.mensajesEnviados || 0) > 0;
                case 'con_reuniones': return (cnt.reunionesTotales || 0) > 0;
                default: return true;
            }
        });
    };
    
    // Contadores de calificación bot
    const contarPorCalificadoBot = (tipo) => {
        return contactos.filter(c => {
            switch (tipo) {
                case 'calificado': return c.precalificacionBot === 'calificado' || c.precalificacionBot === 'quiere_meet';
                case 'no_calificado': return !c.precalificacionBot || c.precalificacionBot === 'sin_calificar' || c.precalificacionBot === 'no_llego';
                case 'quiere_meet': return c.precalificacionBot === 'quiere_meet';
                case 'no_llego': return c.precalificacionBot === 'no_llego';
                default: return true;
            }
        }).length;
    };

    // Filtrar contactos por calificación del bot
    const filtrarPorCalificadoBot = (lista) => {
        if (!filtroCalificadoBot) return lista;
        return lista.filter(c => {
            switch (filtroCalificadoBot) {
                case 'calificado': return c.precalificacionBot === 'calificado' || c.precalificacionBot === 'quiere_meet';
                case 'no_calificado': return !c.precalificacionBot || c.precalificacionBot === 'sin_calificar' || c.precalificacionBot === 'no_llego';
                case 'quiere_meet': return c.precalificacionBot === 'quiere_meet';
                case 'no_llego': return c.precalificacionBot === 'no_llego';
                default: return true;
            }
        });
    };

    // Contadores de quiere reunión
    const contarQuiereReunion = (tipo) => {
        return contactos.filter(c => {
            if (tipo === 'si') return c.precalificacionBot === 'quiere_meet';
            if (tipo === 'no') return c.precalificacionBot !== 'quiere_meet';
            return true;
        }).length;
    };

    // Filtrar contactos por quiere reunión
    const filtrarPorQuiereReunion = (lista) => {
        if (!filtroQuiereReunion) return lista;
        return lista.filter(c => {
            if (filtroQuiereReunion === 'si') return c.precalificacionBot === 'quiere_meet';
            if (filtroQuiereReunion === 'no') return c.precalificacionBot !== 'quiere_meet';
            return true;
        });
    };

    // Contadores de próxima tarea por tipo
    const contarPorProximaTarea = (tipo) => {
        return contactos.filter(c => {
            if (tipo === 'sin_tarea') return !c.proximaTarea?.tipo;
            return c.proximaTarea?.tipo === tipo;
        }).length;
    };

    // Filtrar contactos por tipo de próxima tarea
    const filtrarPorProximaTarea = (lista) => {
        if (!filtroProximaTarea) return lista;
        return lista.filter(c => {
            if (filtroProximaTarea === 'sin_tarea') return !c.proximaTarea?.tipo;
            return c.proximaTarea?.tipo === filtroProximaTarea;
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
        // Las vistas se aplican sobre 'todos' para no chocar con bandejas
        setBandejaActiva('todos');
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
        setBandejaActiva('nuevos');
        setFiltroProximoContacto('');
        setFiltroActividad('');
        setFiltroCalificadoBot('');
        setFiltroQuiereReunion('');
        setFiltroProximaTarea('');
        setFiltroExcluirConReunion(false);
        setBusqueda('');
    };
    
    // Los contactos ya vienen ordenados del backend según ordenarPor/ordenDir
    // Aplicamos filtros locales: próximo contacto + actividad + calificación bot + quiere reunión
    const contactosOrdenados = filtrarPorProximaTarea(filtrarPorQuiereReunion(filtrarPorCalificadoBot(filtrarPorActividad(filtrarPorProximoContacto(contactos)))));
    
    // Formatear próximo contacto para mostrar
    const formatearProximo = (fecha) => {
        if (!fecha) return null;
        const d = new Date(fecha);
        const ahora = new Date();
        const diffMs = d - ahora;
        
        if (diffMs < 0) {
            const atrasoMs = Math.abs(diffMs);
            const minutos = Math.floor(atrasoMs / (1000 * 60));
            const horas = Math.floor(atrasoMs / (1000 * 60 * 60));
            const dias = Math.floor(atrasoMs / (1000 * 60 * 60 * 24));
            let textoAtraso;
            if (minutos < 60) textoAtraso = `hace ${minutos}m`;
            else if (horas < 24) textoAtraso = `hace ${horas}h`;
            else if (dias === 1) textoAtraso = 'hace 1 día';
            else textoAtraso = `hace ${dias} días`;
            return { texto: `Vencido ${textoAtraso}`, color: 'error' };
        }
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

    // ==================== RENDER REUNIONES (LISTA SIMPLE) ====================
    const renderReunionesLista = () => {
        if (loading) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            );
        }
        if (contactosOrdenados.length === 0) {
            return (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        {bandejaActiva === 'reunionesPasadas' ? 'No hay reuniones pasadas' : 'No hay reuniones pendientes'}
                    </Typography>
                </Paper>
            );
        }
        return (
            <Paper variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>📅 Fecha</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>🕐 Hora</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Contacto</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Empresa</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                            {bandejaActiva === 'reunionesPasadas' && (
                                <TableCell sx={{ fontWeight: 700 }}>Resultado</TableCell>
                            )}
                            <TableCell sx={{ fontWeight: 700 }}>{bandejaActiva === 'reunionesPasadas' ? 'Lugar' : 'Link / Lugar'}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {contactosOrdenados.map((contacto) => {
                            const reunion = contacto.proximaReunion;
                            const fechaReunion = reunion?.fecha ? new Date(reunion.fecha) : null;
                            const esHoy = fechaReunion && new Date().toDateString() === fechaReunion.toDateString();
                            const esPasada = fechaReunion && fechaReunion < new Date() && !esHoy;

                            return (
                                <TableRow 
                                    key={contacto._id} 
                                    hover
                                    sx={{ 
                                        bgcolor: esHoy ? 'warning.50' : esPasada ? 'error.50' : 'inherit',
                                    }}
                                >
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={esHoy ? 700 : 400} color={esHoy ? 'warning.dark' : esPasada ? 'error.main' : 'text.primary'}>
                                            {fechaReunion 
                                                ? fechaReunion.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                                                : '—'
                                            }
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={esHoy ? 600 : 400}>
                                            {reunion?.hora || '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <NextLink href={`/sdr/contacto/${contacto._id}`} passHref legacyBehavior>
                                            <Typography 
                                                variant="body2" 
                                                component="a"
                                                fontWeight={600}
                                                sx={{ 
                                                    color: 'primary.main', 
                                                    textDecoration: 'none',
                                                    '&:hover': { textDecoration: 'underline' },
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {contacto.nombre}
                                            </Typography>
                                        </NextLink>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {contacto.empresa || '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <EstadoChip estado={contacto.estado} />
                                    </TableCell>
                                    {bandejaActiva === 'reunionesPasadas' && (
                                        <TableCell>
                                            <Chip 
                                                size="small"
                                                label={
                                                    reunion?.estadoReunion === 'realizada' ? 'Realizada' :
                                                    reunion?.estadoReunion === 'no_show' ? 'No show' :
                                                    reunion?.estadoReunion === 'cancelada' ? 'Cancelada' :
                                                    'Vencida'
                                                }
                                                color={
                                                    reunion?.estadoReunion === 'realizada' ? 'success' :
                                                    reunion?.estadoReunion === 'no_show' ? 'error' :
                                                    'warning'
                                                }
                                                variant="outlined"
                                                sx={{ fontSize: '0.7rem' }}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        {reunion?.link ? (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<LinkIcon />}
                                                href={reunion.link}
                                                target="_blank"
                                                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                            >
                                                Unirse
                                            </Button>
                                        ) : reunion?.lugar ? (
                                            <Typography variant="body2" color="text.secondary">{reunion.lugar}</Typography>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">—</Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Paper>
        );
    };

    // ==================== RENDER REUNIONES MOBILE (LISTA SIMPLE) ====================
    const renderReunionesMobileLista = () => {
        if (loading) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            );
        }
        if (contactosOrdenados.length === 0) {
            return (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        {bandejaActiva === 'reunionesPasadas' ? 'No hay reuniones pasadas' : 'No hay reuniones pendientes'}
                    </Typography>
                </Paper>
            );
        }
        return (
            <Stack spacing={1}>
                {contactosOrdenados.map((contacto) => {
                    const reunion = contacto.proximaReunion;
                    const fechaReunion = reunion?.fecha ? new Date(reunion.fecha) : null;
                    const esHoy = fechaReunion && new Date().toDateString() === fechaReunion.toDateString();
                    const esPasada = fechaReunion && fechaReunion < new Date() && !esHoy;

                    return (
                        <Paper
                            key={contacto._id}
                            variant="outlined"
                            sx={{ 
                                p: 1.5, 
                                borderLeft: 4,
                                borderColor: esHoy ? 'warning.main' : esPasada ? 'error.main' : 'primary.main',
                                bgcolor: esHoy ? 'warning.50' : esPasada ? 'error.50' : 'white',
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <NextLink href={`/sdr/contacto/${contacto._id}`} passHref legacyBehavior>
                                        <Typography 
                                            variant="subtitle2" 
                                            component="a"
                                            fontWeight={600}
                                            sx={{ 
                                                color: 'primary.main', 
                                                textDecoration: 'none',
                                                '&:hover': { textDecoration: 'underline' }
                                            }}
                                        >
                                            {contacto.nombre}
                                        </Typography>
                                    </NextLink>
                                    {contacto.empresa && (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            {contacto.empresa}
                                        </Typography>
                                    )}
                                </Box>
                                <Stack alignItems="flex-end" spacing={0.3}>
                                    <Typography variant="body2" fontWeight={esHoy ? 700 : 500} color={esHoy ? 'warning.dark' : esPasada ? 'error.main' : 'text.primary'}>
                                        {fechaReunion 
                                            ? fechaReunion.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                                            : '—'
                                        }
                                    </Typography>
                                    <Typography variant="caption" fontWeight={500}>
                                        {reunion?.hora || ''}
                                    </Typography>
                                </Stack>
                            </Stack>
                            {(reunion?.link || reunion?.lugar) && (
                                <Box sx={{ mt: 0.5 }}>
                                    {reunion.link ? (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<LinkIcon />}
                                            href={reunion.link}
                                            target="_blank"
                                            sx={{ textTransform: 'none', fontSize: '0.7rem', py: 0 }}
                                        >
                                            Unirse a la reunión
                                        </Button>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">📍 {reunion.lugar}</Typography>
                                    )}
                                </Box>
                            )}
                        </Paper>
                    );
                })}
            </Stack>
        );
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

            {/* ── Bandejas (Tabs) ── */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={bandejaActiva}
                    onChange={(_, v) => setBandejaActiva(v)}
                    variant="scrollable"
                    scrollButtons={false}
                    sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0.5, textTransform: 'none', fontSize: '0.8rem' } }}
                >
                    <Tab 
                        value="nuevos"
                        icon={<Badge badgeContent={contadoresBandejas.nuevos} color="info" max={99}><InboxIcon sx={{ fontSize: 18 }} /></Badge>}
                        iconPosition="start"
                        label="Nuevos"
                    />
                    <Tab 
                        value="reintentos"
                        icon={<Badge badgeContent={contadoresBandejas.reintentos} color="warning" max={99}><ReplayIcon sx={{ fontSize: 18 }} /></Badge>}
                        iconPosition="start"
                        label="Reintentos"
                    />
                    <Tab 
                        value="seguimiento"
                        icon={<Badge badgeContent={contadoresBandejas.seguimiento} color="success" max={99}><HandshakeIcon sx={{ fontSize: 18 }} /></Badge>}
                        iconPosition="start"
                        label="Seguimiento"
                    />
                    <Tab 
                        value="reunionesPendientes"
                        icon={<Badge badgeContent={contadoresBandejas.reunionesPendientes || 0} color="secondary" max={99}><EventAvailableIcon sx={{ fontSize: 18 }} /></Badge>}
                        iconPosition="start"
                        label="Reuniones"
                    />
                    <Tab 
                        value="reunionesPasadas"
                        icon={<Badge badgeContent={contadoresBandejas.reunionesPasadas || 0} color="default" max={99}><HistoryIcon sx={{ fontSize: 18 }} /></Badge>}
                        iconPosition="start"
                        label="Pasadas"
                    />
                    <Tab 
                        value="reunionesSinConfirmar"
                        icon={<Badge badgeContent={contadoresBandejas.reunionesSinConfirmar || 0} color="error" max={99}><WarningAmberIcon sx={{ fontSize: 18 }} /></Badge>}
                        iconPosition="start"
                        label="Sin confirmar"
                    />
                    <Tab 
                        value="todos"
                        icon={<ViewListIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label="Todos"
                    />
                </Tabs>
            </Box>

            {/* Filtros por estado (solo en bandeja 'todos') */}
            {bandejaActiva === 'todos' && (
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
                        label={`No Califica: ${contarPorEstado('no_califica')}`} 
                        color="error"
                        size="small"
                        variant={filtroEstado === 'no_califica' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'no_califica' ? '' : 'no_califica')}
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
                        label={`Vencidos hoy (${contarVencidosHoy()})`}
                        size="small"
                        icon={<span style={{ fontSize: 12 }}>🔥</span>}
                        color={filtroProximoContacto === 'vencido_hoy' ? 'warning' : 'default'}
                        variant={filtroProximoContacto === 'vencido_hoy' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximoContacto(filtroProximoContacto === 'vencido_hoy' ? '' : 'vencido_hoy')}
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

            {/* Filtros por calificación del bot */}
            <Box sx={{ px: 2, pb: 1, overflowX: 'auto' }}>
                <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5 }}>
                        🤖 Bot:
                    </Typography>
                    <Chip 
                        label={`Calificado (${contarPorCalificadoBot('calificado')})`}
                        size="small"
                        icon={<SmartToyIcon sx={{ fontSize: 14 }} />}
                        color={filtroCalificadoBot === 'calificado' ? 'info' : 'default'}
                        variant={filtroCalificadoBot === 'calificado' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroCalificadoBot(filtroCalificadoBot === 'calificado' ? '' : 'calificado')}
                    />
                    <Chip 
                        label={`No calificado (${contarPorCalificadoBot('no_calificado')})`}
                        size="small"
                        color={filtroCalificadoBot === 'no_calificado' ? 'default' : 'default'}
                        variant={filtroCalificadoBot === 'no_calificado' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroCalificadoBot(filtroCalificadoBot === 'no_calificado' ? '' : 'no_calificado')}
                    />
                    <Chip 
                        label={`Quiere meet (${contarPorCalificadoBot('quiere_meet')})`}
                        size="small"
                        icon={<span style={{ fontSize: 12 }}>🤝</span>}
                        color={filtroCalificadoBot === 'quiere_meet' ? 'primary' : 'default'}
                        variant={filtroCalificadoBot === 'quiere_meet' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroCalificadoBot(filtroCalificadoBot === 'quiere_meet' ? '' : 'quiere_meet')}
                    />
                    <Chip 
                        label={`No llegó (${contarPorCalificadoBot('no_llego')})`}
                        size="small"
                        color={filtroCalificadoBot === 'no_llego' ? 'warning' : 'default'}
                        variant={filtroCalificadoBot === 'no_llego' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroCalificadoBot(filtroCalificadoBot === 'no_llego' ? '' : 'no_llego')}
                    />
                </Stack>
            </Box>

            {/* Filtro por quiere reunión */}
            <Box sx={{ px: 2, pb: 1, overflowX: 'auto' }}>
                <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5 }}>
                        Reunión:
                    </Typography>
                    <Chip 
                        label={`Quiere reunión (${contarQuiereReunion('si')})`}
                        size="small"
                        icon={<EventAvailableIcon sx={{ fontSize: 14 }} />}
                        color={filtroQuiereReunion === 'si' ? 'success' : 'default'}
                        variant={filtroQuiereReunion === 'si' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroQuiereReunion(filtroQuiereReunion === 'si' ? '' : 'si')}
                    />
                    <Chip 
                        label={`No quiere (${contarQuiereReunion('no')})`}
                        size="small"
                        color={filtroQuiereReunion === 'no' ? 'default' : 'default'}
                        variant={filtroQuiereReunion === 'no' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroQuiereReunion(filtroQuiereReunion === 'no' ? '' : 'no')}
                    />
                </Stack>
            </Box>

            {/* Filtro por próxima tarea */}
            <Box sx={{ px: 2, pb: 1, overflowX: 'auto' }}>
                <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5 }}>
                        Tarea:
                    </Typography>
                    <Chip 
                        label={`Sin tarea (${contarPorProximaTarea('sin_tarea')})`}
                        size="small"
                        icon={<HourglassEmptyIcon sx={{ fontSize: 14 }} />}
                        color={filtroProximaTarea === 'sin_tarea' ? 'warning' : 'default'}
                        variant={filtroProximaTarea === 'sin_tarea' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximaTarea(filtroProximaTarea === 'sin_tarea' ? '' : 'sin_tarea')}
                    />
                    <Chip 
                        label={`📞 Llamada (${contarPorProximaTarea('llamada')})`}
                        size="small"
                        color={filtroProximaTarea === 'llamada' ? 'success' : 'default'}
                        variant={filtroProximaTarea === 'llamada' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximaTarea(filtroProximaTarea === 'llamada' ? '' : 'llamada')}
                    />
                    <Chip 
                        label={`💬 WhatsApp (${contarPorProximaTarea('whatsapp')})`}
                        size="small"
                        color={filtroProximaTarea === 'whatsapp' ? 'info' : 'default'}
                        variant={filtroProximaTarea === 'whatsapp' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximaTarea(filtroProximaTarea === 'whatsapp' ? '' : 'whatsapp')}
                    />
                    <Chip 
                        label={`✉️ Email (${contarPorProximaTarea('email')})`}
                        size="small"
                        color={filtroProximaTarea === 'email' ? 'primary' : 'default'}
                        variant={filtroProximaTarea === 'email' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximaTarea(filtroProximaTarea === 'email' ? '' : 'email')}
                    />
                    <Chip 
                        label={`📝 Recordatorio (${contarPorProximaTarea('recordatorio')})`}
                        size="small"
                        color={filtroProximaTarea === 'recordatorio' ? 'secondary' : 'default'}
                        variant={filtroProximaTarea === 'recordatorio' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximaTarea(filtroProximaTarea === 'recordatorio' ? '' : 'recordatorio')}
                    />
                </Stack>
            </Box>

            {/* Filtros por actividad (tipo de contacto y resultado) */}
            <Box sx={{ px: 2, pb: 1, overflowX: 'auto' }}>
                <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5 }}>
                        Actividad:
                    </Typography>
                    <Chip 
                        label={`Sin actividad (${contarPorActividad('sin_actividad')})`}
                        size="small"
                        icon={<span style={{ fontSize: 12 }}>🆕</span>}
                        color={filtroActividad === 'sin_actividad' ? 'default' : 'default'}
                        variant={filtroActividad === 'sin_actividad' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroActividad(filtroActividad === 'sin_actividad' ? '' : 'sin_actividad')}
                    />
                    <Chip 
                        label={`📵 No atendidas (${contarPorActividad('con_llamadas_no_atendidas')})`}
                        size="small"
                        color={filtroActividad === 'con_llamadas_no_atendidas' ? 'warning' : 'default'}
                        variant={filtroActividad === 'con_llamadas_no_atendidas' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroActividad(filtroActividad === 'con_llamadas_no_atendidas' ? '' : 'con_llamadas_no_atendidas')}
                    />
                    <Chip 
                        label={`📞 Atendidas (${contarPorActividad('con_llamadas_atendidas')})`}
                        size="small"
                        color={filtroActividad === 'con_llamadas_atendidas' ? 'success' : 'default'}
                        variant={filtroActividad === 'con_llamadas_atendidas' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroActividad(filtroActividad === 'con_llamadas_atendidas' ? '' : 'con_llamadas_atendidas')}
                    />
                    <Chip 
                        label={`Sin llamadas (${contarPorActividad('sin_llamadas')})`}
                        size="small"
                        icon={<span style={{ fontSize: 12 }}>📴</span>}
                        color={filtroActividad === 'sin_llamadas' ? 'error' : 'default'}
                        variant={filtroActividad === 'sin_llamadas' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroActividad(filtroActividad === 'sin_llamadas' ? '' : 'sin_llamadas')}
                    />
                    <Chip 
                        label={`💬 Mensajes (${contarPorActividad('con_mensajes')})`}
                        size="small"
                        color={filtroActividad === 'con_mensajes' ? 'info' : 'default'}
                        variant={filtroActividad === 'con_mensajes' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroActividad(filtroActividad === 'con_mensajes' ? '' : 'con_mensajes')}
                    />
                    <Chip 
                        label={`📅 Reuniones (${contarPorActividad('con_reuniones')})`}
                        size="small"
                        color={filtroActividad === 'con_reuniones' ? 'secondary' : 'default'}
                        variant={filtroActividad === 'con_reuniones' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroActividad(filtroActividad === 'con_reuniones' ? '' : 'con_reuniones')}
                    />
                    <Chip 
                        label="🚫 Excluir con reunión"
                        size="small"
                        color={filtroExcluirConReunion ? 'error' : 'default'}
                        variant={filtroExcluirConReunion ? 'filled' : 'outlined'}
                        onClick={() => setFiltroExcluirConReunion(!filtroExcluirConReunion)}
                    />
                </Stack>
            </Box>

            {/* Ordenar por */}
            <Box sx={{ px: 2, pb: 1, overflowX: 'auto' }}>
                <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5 }}>
                        Ordenar:
                    </Typography>
                    <Chip label="Próximo" size="small" color={ordenarPor === 'proximo_contacto' ? 'primary' : 'default'} variant={ordenarPor === 'proximo_contacto' ? 'filled' : 'outlined'} onClick={() => setOrdenarPor('proximo_contacto')} />
                    <Chip label="Más nuevo" size="small" color={ordenarPor === 'fecha_creacion' ? 'primary' : 'default'} variant={ordenarPor === 'fecha_creacion' ? 'filled' : 'outlined'} onClick={() => setOrdenarPor('fecha_creacion')} />
                    <Chip label="Prioridad" size="small" color={ordenarPor === 'prioridad' ? 'primary' : 'default'} variant={ordenarPor === 'prioridad' ? 'filled' : 'outlined'} onClick={() => setOrdenarPor('prioridad')} />
                    <Chip label="Estado" size="small" color={ordenarPor === 'estado' ? 'primary' : 'default'} variant={ordenarPor === 'estado' ? 'filled' : 'outlined'} onClick={() => setOrdenarPor('estado')} />
                </Stack>
            </Box>

            {/* Barra de acciones masivas */}
            {seleccionados.length > 0 && (
                <Box sx={{ px: 2, pb: 2 }}>
                    <Alert 
                        severity="info" 
                        action={
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Button size="small" onClick={() => setModalProximoMasivo(true)}>
                                    📅 Fecha
                                </Button>
                                {cadenciasDisponibles.length > 0 && (
                                    <Button size="small" onClick={() => setModalCadenciaMasiva(true)}>
                                        🔄 Cadencia
                                    </Button>
                                )}
                                {tienePermisoEnviarBot && (
                                    <Button size="small" onClick={() => setModalBulkTemplate(true)}>
                                        🤖 Template Bot
                                    </Button>
                                )}
                                <Button size="small" onClick={() => setModalBulkAccion(true)}>
                                    📝 Acción
                                </Button>
                                <Button size="small" onClick={() => setModalCambiarEstadoMasivo(true)}>
                                    🔄 Estado
                                </Button>
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

            {/* Lista de contactos — vista reuniones o cards */}
            {(bandejaActiva === 'reunionesPendientes' || bandejaActiva === 'reunionesPasadas') ? (
                <Box sx={{ px: 2 }}>
                    {renderReunionesMobileLista()}
                </Box>
            ) : (
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
                                        {/* Contadores de actividad */}
                                        <ContadoresActividad contadores={contacto.contadores} size="small" />
                                        {proximo && (
                                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                                                <Typography sx={{ fontSize: 12 }}>
                                                    {contacto.proximaTarea?.tipo === 'llamada' ? '📞' : contacto.proximaTarea?.tipo === 'whatsapp' ? '💬' : contacto.proximaTarea?.tipo === 'email' ? '✉️' : '📅'}
                                                </Typography>
                                                <Typography 
                                                    variant="caption" 
                                                    color={`${proximo.color}.main`}
                                                    fontWeight={vencido ? 700 : 400}
                                                >
                                                    {contacto.proximaTarea?.tipo === 'llamada' ? 'Llamada' : contacto.proximaTarea?.tipo === 'whatsapp' ? 'WhatsApp' : contacto.proximaTarea?.tipo === 'email' ? 'Email' : 'Tarea'}{' · '}{proximo.texto}
                                                </Typography>
                                                {contacto.proximaTarea?.nota && (
                                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 120, fontSize: '0.6rem' }}>
                                                        — {contacto.proximaTarea.nota}
                                                    </Typography>
                                                )}
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
            )}

            {/* Paginación mobile */}
            {totalContactos > ITEMS_PER_PAGE && (
                <Box sx={{ px: 2, py: 2 }}>
                    <Stack direction="row" justifyContent="center" alignItems="center" spacing={2}>
                        <IconButton 
                            size="small" 
                            disabled={page <= 1}
                            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        >
                            <NavigateBeforeIcon />
                        </IconButton>
                        <Typography variant="body2" color="text.secondary">
                            Página {page} de {Math.ceil(totalContactos / ITEMS_PER_PAGE)} ({totalContactos} contactos)
                        </Typography>
                        <IconButton 
                            size="small" 
                            disabled={page >= Math.ceil(totalContactos / ITEMS_PER_PAGE)}
                            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        >
                            <NavigateNextIcon />
                        </IconButton>
                    </Stack>
                </Box>
            )}

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

                {/* ── Bandejas (Tabs) ── */}
                <Paper sx={{ borderRadius: 2 }}>
                    <Tabs
                        value={bandejaActiva}
                        onChange={(_, v) => setBandejaActiva(v)}
                        sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
                    >
                        <Tab 
                            value="nuevos"
                            icon={<Badge badgeContent={contadoresBandejas.nuevos} color="info" max={99}><InboxIcon /></Badge>}
                            iconPosition="start"
                            label="Nuevos"
                        />
                        <Tab 
                            value="reintentos"
                            icon={<Badge badgeContent={contadoresBandejas.reintentos} color="warning" max={99}><ReplayIcon /></Badge>}
                            iconPosition="start"
                            label="Reintentos"
                        />
                        <Tab 
                            value="seguimiento"
                            icon={<Badge badgeContent={contadoresBandejas.seguimiento} color="success" max={99}><HandshakeIcon /></Badge>}
                            iconPosition="start"
                            label="Seguimiento"
                        />
                        <Tab 
                            value="reunionesPendientes"
                            icon={<Badge badgeContent={contadoresBandejas.reunionesPendientes || 0} color="secondary" max={99}><EventAvailableIcon /></Badge>}
                            iconPosition="start"
                            label="Reuniones"
                        />
                        <Tab 
                            value="reunionesPasadas"
                            icon={<Badge badgeContent={contadoresBandejas.reunionesPasadas || 0} color="default" max={99}><HistoryIcon /></Badge>}
                            iconPosition="start"
                            label="Pasadas"
                        />
                        <Tab 
                            value="reunionesSinConfirmar"
                            icon={<Badge badgeContent={contadoresBandejas.reunionesSinConfirmar || 0} color="error" max={99}><WarningAmberIcon /></Badge>}
                            iconPosition="start"
                            label="Sin confirmar"
                        />
                        <Tab 
                            value="todos"
                            icon={<ViewListIcon />}
                            iconPosition="start"
                            label="Todos"
                        />
                    </Tabs>
                </Paper>

                {/* Filtros por estado (solo en bandeja 'todos') */}
                {bandejaActiva === 'todos' && (
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
                )}

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
                        label={`🔥 Vencidos hoy (${contarVencidosHoy()})`}
                        color={filtroProximoContacto === 'vencido_hoy' ? 'warning' : 'default'}
                        variant={filtroProximoContacto === 'vencido_hoy' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximoContacto(filtroProximoContacto === 'vencido_hoy' ? '' : 'vencido_hoy')}
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

                {/* Filtros por actividad (tipo de contacto y resultado) */}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" color="text.secondary">
                        Actividad:
                    </Typography>
                    <Chip 
                        label={`Sin actividad (${contarPorActividad('sin_actividad')})`}
                        icon={<span style={{ fontSize: 14 }}>🆕</span>}
                        color={filtroActividad === 'sin_actividad' ? 'default' : 'default'}
                        variant={filtroActividad === 'sin_actividad' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroActividad(filtroActividad === 'sin_actividad' ? '' : 'sin_actividad')}
                    />
                    <Chip 
                        label={`📵 No atendidas (${contarPorActividad('con_llamadas_no_atendidas')})`}
                        color={filtroActividad === 'con_llamadas_no_atendidas' ? 'warning' : 'default'}
                        variant={filtroActividad === 'con_llamadas_no_atendidas' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroActividad(filtroActividad === 'con_llamadas_no_atendidas' ? '' : 'con_llamadas_no_atendidas')}
                    />
                    <Chip 
                        label={`📞 Atendidas (${contarPorActividad('con_llamadas_atendidas')})`}
                        color={filtroActividad === 'con_llamadas_atendidas' ? 'success' : 'default'}
                        variant={filtroActividad === 'con_llamadas_atendidas' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroActividad(filtroActividad === 'con_llamadas_atendidas' ? '' : 'con_llamadas_atendidas')}
                    />
                    <Chip 
                        label={`📴 Sin llamadas (${contarPorActividad('sin_llamadas')})`}
                        color={filtroActividad === 'sin_llamadas' ? 'error' : 'default'}
                        variant={filtroActividad === 'sin_llamadas' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroActividad(filtroActividad === 'sin_llamadas' ? '' : 'sin_llamadas')}
                    />
                    <Chip 
                        label={`💬 Mensajes (${contarPorActividad('con_mensajes')})`}
                        color={filtroActividad === 'con_mensajes' ? 'info' : 'default'}
                        variant={filtroActividad === 'con_mensajes' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroActividad(filtroActividad === 'con_mensajes' ? '' : 'con_mensajes')}
                    />
                    <Chip 
                        label={`📅 Reuniones (${contarPorActividad('con_reuniones')})`}
                        color={filtroActividad === 'con_reuniones' ? 'secondary' : 'default'}
                        variant={filtroActividad === 'con_reuniones' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroActividad(filtroActividad === 'con_reuniones' ? '' : 'con_reuniones')}
                    />
                    <Chip 
                        label="🚫 Excluir con reunión"
                        color={filtroExcluirConReunion ? 'error' : 'default'}
                        variant={filtroExcluirConReunion ? 'filled' : 'outlined'}
                        onClick={() => setFiltroExcluirConReunion(!filtroExcluirConReunion)}
                    />
                    {filtroActividad && (
                        <Chip 
                            label="Limpiar"
                            size="small"
                            onDelete={() => setFiltroActividad('')}
                        />
                    )}
                </Stack>

                {/* Filtros por calificación del bot */}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" color="text.secondary">
                        🤖 Calificado por bot:
                    </Typography>
                    <Chip 
                        label={`Calificado (${contarPorCalificadoBot('calificado')})`}
                        icon={<SmartToyIcon />}
                        color={filtroCalificadoBot === 'calificado' ? 'info' : 'default'}
                        variant={filtroCalificadoBot === 'calificado' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroCalificadoBot(filtroCalificadoBot === 'calificado' ? '' : 'calificado')}
                    />
                    <Chip 
                        label={`No calificado (${contarPorCalificadoBot('no_calificado')})`}
                        color={filtroCalificadoBot === 'no_calificado' ? 'default' : 'default'}
                        variant={filtroCalificadoBot === 'no_calificado' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroCalificadoBot(filtroCalificadoBot === 'no_calificado' ? '' : 'no_calificado')}
                    />
                    <Chip 
                        label={`Quiere meet (${contarPorCalificadoBot('quiere_meet')})`}
                        icon={<span style={{ fontSize: 14 }}>🤝</span>}
                        color={filtroCalificadoBot === 'quiere_meet' ? 'primary' : 'default'}
                        variant={filtroCalificadoBot === 'quiere_meet' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroCalificadoBot(filtroCalificadoBot === 'quiere_meet' ? '' : 'quiere_meet')}
                    />
                    <Chip 
                        label={`No llegó (${contarPorCalificadoBot('no_llego')})`}
                        color={filtroCalificadoBot === 'no_llego' ? 'warning' : 'default'}
                        variant={filtroCalificadoBot === 'no_llego' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroCalificadoBot(filtroCalificadoBot === 'no_llego' ? '' : 'no_llego')}
                    />
                    {filtroCalificadoBot && (
                        <Chip 
                            label="Limpiar"
                            size="small"
                            onDelete={() => setFiltroCalificadoBot('')}
                        />
                    )}
                </Stack>

                {/* Filtro por quiere reunión */}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" color="text.secondary">
                        Quiere reunión:
                    </Typography>
                    <Chip 
                        label={`Sí (${contarQuiereReunion('si')})`}
                        icon={<EventAvailableIcon />}
                        color={filtroQuiereReunion === 'si' ? 'success' : 'default'}
                        variant={filtroQuiereReunion === 'si' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroQuiereReunion(filtroQuiereReunion === 'si' ? '' : 'si')}
                    />
                    <Chip 
                        label={`No (${contarQuiereReunion('no')})`}
                        color={filtroQuiereReunion === 'no' ? 'default' : 'default'}
                        variant={filtroQuiereReunion === 'no' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroQuiereReunion(filtroQuiereReunion === 'no' ? '' : 'no')}
                    />
                    {filtroQuiereReunion && (
                        <Chip 
                            label="Limpiar"
                            size="small"
                            onDelete={() => setFiltroQuiereReunion('')}
                        />
                    )}
                </Stack>

                {/* Filtro por próxima tarea */}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" color="text.secondary">
                        📋 Próxima tarea:
                    </Typography>
                    <Chip 
                        label={`Sin tarea (${contarPorProximaTarea('sin_tarea')})`}
                        icon={<HourglassEmptyIcon />}
                        color={filtroProximaTarea === 'sin_tarea' ? 'warning' : 'default'}
                        variant={filtroProximaTarea === 'sin_tarea' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximaTarea(filtroProximaTarea === 'sin_tarea' ? '' : 'sin_tarea')}
                    />
                    <Chip 
                        label={`📞 Llamada (${contarPorProximaTarea('llamada')})`}
                        color={filtroProximaTarea === 'llamada' ? 'success' : 'default'}
                        variant={filtroProximaTarea === 'llamada' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximaTarea(filtroProximaTarea === 'llamada' ? '' : 'llamada')}
                    />
                    <Chip 
                        label={`💬 WhatsApp (${contarPorProximaTarea('whatsapp')})`}
                        color={filtroProximaTarea === 'whatsapp' ? 'info' : 'default'}
                        variant={filtroProximaTarea === 'whatsapp' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximaTarea(filtroProximaTarea === 'whatsapp' ? '' : 'whatsapp')}
                    />
                    <Chip 
                        label={`✉️ Email (${contarPorProximaTarea('email')})`}
                        color={filtroProximaTarea === 'email' ? 'primary' : 'default'}
                        variant={filtroProximaTarea === 'email' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximaTarea(filtroProximaTarea === 'email' ? '' : 'email')}
                    />
                    <Chip 
                        label={`📝 Recordatorio (${contarPorProximaTarea('recordatorio')})`}
                        color={filtroProximaTarea === 'recordatorio' ? 'secondary' : 'default'}
                        variant={filtroProximaTarea === 'recordatorio' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroProximaTarea(filtroProximaTarea === 'recordatorio' ? '' : 'recordatorio')}
                    />
                    {filtroProximaTarea && (
                        <Chip 
                            label="Limpiar"
                            size="small"
                            onDelete={() => setFiltroProximaTarea('')}
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
                                {tienePermisoEnviarBot && (
                                    <Button
                                        size="small"
                                        startIcon={<SmartToyIcon />}
                                        onClick={() => setModalBulkTemplate(true)}
                                    >
                                        Enviar template
                                    </Button>
                                )}
                                <Button
                                    size="small"
                                    startIcon={<EditNoteIcon />}
                                    onClick={() => setModalBulkAccion(true)}
                                >
                                    Registrar acción
                                </Button>
                                <Button
                                    size="small"
                                    startIcon={<SwapHorizIcon />}
                                    onClick={() => setModalCambiarEstadoMasivo(true)}
                                >
                                    Cambiar estado
                                </Button>
                                <Button size="small" onClick={() => setSeleccionados([])}>
                                    Limpiar selección
                                </Button>
                            </Stack>
                        }
                    >
                        {seleccionados.length} contacto(s) seleccionado(s)
                    </Alert>
                )}

                {/* Búsqueda + Ordenamiento */}
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
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
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                            <SortIcon fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>Ordenar:</Typography>
                            {[
                                { value: 'vencidos', label: 'Vencidos primero' },
                                { value: 'nuevo', label: 'Más nuevos' },
                                { value: 'fecha', label: 'Última actividad' },
                                { value: 'estado', label: 'Estado' },
                                { value: 'prioridad', label: 'Prioridad' },
                            ].map(opt => (
                                <Chip
                                    key={opt.value}
                                    label={opt.label}
                                    size="small"
                                    color={ordenarPor === opt.value ? 'primary' : 'default'}
                                    variant={ordenarPor === opt.value ? 'filled' : 'outlined'}
                                    onClick={() => setOrdenarPor(opt.value)}
                                    sx={{ cursor: 'pointer' }}
                                />
                            ))}
                        </Stack>
                    </Stack>
                </Paper>

                {/* Banner: Ir a Mis Reuniones */}
                {(bandejaActiva === 'reunionesPendientes' || bandejaActiva === 'reunionesPasadas') && (
                    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: '#e3f2fd', borderColor: '#90caf9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="body2" fontWeight={500}>
                            📅 Gestioná tus reuniones de forma completa desde la vista dedicada
                        </Typography>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={() => router.push('/sdr/reuniones')}
                            sx={{ textTransform: 'none' }}
                        >
                            Ir a Mis Reuniones ↗
                        </Button>
                    </Paper>
                )}

                {/* Tabla o Lista reuniones */}
                {(bandejaActiva === 'reunionesPendientes' || bandejaActiva === 'reunionesPasadas') ? (
                    renderReunionesLista()
                ) : (
                <Paper>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Table size="small">
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
                                    <TableCell>Estado</TableCell>
                                    <TableCell>Calificado</TableCell>
                                    <TableCell>Quiere reunión</TableCell>
                                    <TableCell>Plan</TableCell>
                                    <TableCell>Prior.</TableCell>
                                    <TableCell>Actividad</TableCell>
                                    <TableCell>Próxima tarea</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {contactosOrdenados.map((contacto) => {
                                    const proximo = formatearProximo(contacto.proximoContacto);
                                    const vencido = estaVencido(contacto);
                                    const seleccionado = seleccionados.includes(contacto._id);
                                    const esCalificado = contacto.precalificacionBot === 'calificado' || contacto.precalificacionBot === 'quiere_meet';
                                    const quiereReunion = contacto.precalificacionBot === 'quiere_meet';
                                    
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
                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                    <Typography variant="body2" fontWeight={contacto.estado === 'nuevo' ? 600 : 400}>
                                                        {contacto.nombre}
                                                    </Typography>
                                                    {contacto.segmento && (
                                                        <Chip 
                                                            size="small" 
                                                            label={contacto.segmento === 'inbound' ? 'In' : 'Out'}
                                                            variant="outlined"
                                                            color={contacto.segmento === 'inbound' ? 'info' : 'warning'}
                                                            sx={{ height: 18, fontSize: '0.6rem' }}
                                                        />
                                                    )}
                                                </Stack>
                                                {contacto.empresa && (
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        {contacto.empresa}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption">{contacto.telefono}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <EstadoChip estado={contacto.estado} />
                                            </TableCell>
                                            <TableCell>
                                                {esCalificado ? (
                                                    <Chip 
                                                        size="small" 
                                                        label="✅ Sí"
                                                        color="success"
                                                        variant="outlined"
                                                        sx={{ height: 22, fontSize: '0.7rem' }}
                                                    />
                                                ) : contacto.precalificacionBot === 'no_llego' ? (
                                                    <Chip 
                                                        size="small" 
                                                        label="No llegó"
                                                        color="default"
                                                        variant="outlined"
                                                        sx={{ height: 22, fontSize: '0.7rem' }}
                                                    />
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">—</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {quiereReunion ? (
                                                    <Chip 
                                                        size="small" 
                                                        label="📅 Sí"
                                                        color="primary"
                                                        variant="filled"
                                                        sx={{ height: 22, fontSize: '0.7rem' }}
                                                    />
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">—</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {contacto.planEstimado ? (
                                                    <Chip 
                                                        size="small" 
                                                        label={`${PLANES_SORBY[contacto.planEstimado]?.icon || ''} ${PLANES_SORBY[contacto.planEstimado]?.label || contacto.planEstimado}`}
                                                        color={PLANES_SORBY[contacto.planEstimado]?.color || 'default'}
                                                        variant="outlined"
                                                        sx={{ height: 22, fontSize: '0.7rem' }}
                                                    />
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">—</Typography>
                                                )}
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
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">—</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <ContadoresActividad contadores={contacto.contadores} size="small" />
                                            </TableCell>
                                            <TableCell>
                                                {proximo ? (
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <Typography sx={{ fontSize: 12 }}>
                                                            {contacto.proximaTarea?.tipo === 'llamada' ? '📞' : contacto.proximaTarea?.tipo === 'whatsapp' ? '💬' : contacto.proximaTarea?.tipo === 'email' ? '✉️' : '📅'}
                                                        </Typography>
                                                        <Chip 
                                                            size="small" 
                                                            label={`${contacto.proximaTarea?.tipo === 'llamada' ? 'Llamada' : contacto.proximaTarea?.tipo === 'whatsapp' ? 'WhatsApp' : contacto.proximaTarea?.tipo === 'email' ? 'Email' : 'Tarea'} · ${proximo.texto}`}
                                                            color={proximo.color}
                                                            variant="outlined"
                                                        />
                                                    </Stack>
                                                ) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {contactos.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
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
                )}

                {/* Paginación desktop */}
                {totalContactos > ITEMS_PER_PAGE && (
                    <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} sx={{ mt: 2 }}>
                        <Button 
                            size="small" 
                            startIcon={<NavigateBeforeIcon />}
                            disabled={page <= 1}
                            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        >
                            Anterior
                        </Button>
                        <Typography variant="body2" color="text.secondary">
                            Página {page} de {Math.ceil(totalContactos / ITEMS_PER_PAGE)} ({totalContactos} contactos)
                        </Typography>
                        <Button 
                            size="small" 
                            endIcon={<NavigateNextIcon />}
                            disabled={page >= Math.ceil(totalContactos / ITEMS_PER_PAGE)}
                            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        >
                            Siguiente
                        </Button>
                    </Stack>
                )}
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

            {/* Modal Envío Masivo de Template Meta via Bot */}
            {tienePermisoEnviarBot && (
                <BulkSendTemplateDialog
                    open={modalBulkTemplate}
                    onClose={() => setModalBulkTemplate(false)}
                    empresaId={empresaId}
                    contacts={seleccionados.map(id => {
                        const c = contactos.find(ct => ct._id === id);
                        return c ? { phone: c.telefono, name: c.nombre || c.empresa } : null;
                    }).filter(Boolean)}
                    onComplete={(result) => {
                        setSnackbar({
                            open: true,
                            message: `${result.enviados} template(s) enviado(s)${result.errores.length ? `, ${result.errores.length} error(es)` : ''}`,
                            severity: result.errores.length === 0 ? 'success' : 'warning'
                        });
                        setSeleccionados([]);
                    }}
                />
            )}

            {/* Modal Registrar Acción Masiva */}
            <BulkRegistrarAccionDialog
                open={modalBulkAccion}
                onClose={() => setModalBulkAccion(false)}
                contactoIds={seleccionados}
                empresaId={empresaId}
                onComplete={(result) => {
                    setSnackbar({
                        open: true,
                        message: `${result.exitosos} acción(es) registrada(s)${result.fallidos > 0 ? `, ${result.fallidos} error(es)` : ''}`,
                        severity: result.fallidos === 0 ? 'success' : 'warning'
                    });
                    setSeleccionados([]);
                    cargarContactos();
                }}
            />

            {/* Modal Cambiar Estado Masivo */}
            <Dialog
                open={modalCambiarEstadoMasivo}
                onClose={() => setModalCambiarEstadoMasivo(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>🔄 Cambiar estado de {seleccionados.length} contacto(s)</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Seleccioná el nuevo estado para todos los contactos seleccionados
                    </Typography>
                    <Stack spacing={1}>
                        {[
                            { value: 'nuevo', label: 'Nuevo', color: 'info' },
                            { value: 'contactado', label: 'Contactado', color: 'warning' },
                            { value: 'calificado', label: 'Calificado', color: 'success' },
                            { value: 'cierre', label: 'En Cierre', color: 'secondary' },
                            { value: 'ganado', label: 'Ganado', color: 'success' },
                            { value: 'no_contacto', label: 'No Contactado', color: 'default' },
                            { value: 'no_responde', label: 'No Responde', color: 'default' },
                            { value: 'revisar_mas_adelante', label: 'Revisar Después', color: 'warning' },
                            { value: 'no_califica', label: 'No Califica', color: 'error' },
                            { value: 'perdido', label: 'Perdido', color: 'error' },
                        ].map((est) => (
                            <Button
                                key={est.value}
                                variant="outlined"
                                fullWidth
                                color={est.color}
                                onClick={async () => {
                                    setActionLoading(true);
                                    try {
                                        let exitosos = 0;
                                        let fallidos = 0;
                                        for (const id of seleccionados) {
                                            try {
                                                await SDRService.cambiarEstado(id, est.value, 'Cambio masivo');
                                                exitosos++;
                                            } catch (err) {
                                                fallidos++;
                                            }
                                        }
                                        setSnackbar({
                                            open: true,
                                            message: `${exitosos} contacto(s) cambiados a "${est.label}"${fallidos > 0 ? `, ${fallidos} error(es)` : ''}`,
                                            severity: fallidos === 0 ? 'success' : 'warning'
                                        });
                                        setSeleccionados([]);
                                        setModalCambiarEstadoMasivo(false);
                                        cargarContactos();
                                    } catch (error) {
                                        setSnackbar({ open: true, message: 'Error al cambiar estado', severity: 'error' });
                                    } finally {
                                        setActionLoading(false);
                                    }
                                }}
                                disabled={actionLoading}
                                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                            >
                                {actionLoading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
                                {est.label}
                            </Button>
                        ))}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalCambiarEstadoMasivo(false)}>Cancelar</Button>
                </DialogActions>
            </Dialog>

            {/* Modal Registrar Reunión */}
            <ModalCrearReunion
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
        { value: 'tarde', label: 'Hoy a la tarde' },
        { value: 'manana_am', label: 'Mañana AM' },
        { value: 'manana_pm', label: 'Mañana PM' },
        { value: '3d', label: 'En 3 días' },
        { value: '1w', label: 'En 1 semana' },
        { value: '2m', label: 'En 2 meses' },
        { value: 'custom', label: 'Fecha específica' },
        { value: 'clear', label: 'Quitar fecha' },
    ];

    const calcularFecha = () => {
        if (opcionSeleccionada === 'clear') return null;
        if (opcionSeleccionada === 'custom') return fechaPersonalizada ? new Date(fechaPersonalizada) : null;
        
        const ahora = new Date();
        const fecha = new Date();
        switch (opcionSeleccionada) {
            case 'tarde':
                fecha.setHours(15, 0, 0, 0);
                if (fecha <= ahora) { fecha.setHours(17, 0, 0, 0); }
                if (fecha <= ahora) { fecha.setDate(fecha.getDate() + 1); fecha.setHours(15, 0, 0, 0); }
                return fecha;
            case 'manana_am':
                fecha.setDate(fecha.getDate() + 1);
                fecha.setHours(9, 0, 0, 0);
                return fecha;
            case 'manana_pm':
                fecha.setDate(fecha.getDate() + 1);
                fecha.setHours(15, 0, 0, 0);
                return fecha;
            case '3d':
                fecha.setDate(fecha.getDate() + 3);
                fecha.setHours(9, 0, 0, 0);
                return fecha;
            case '1w':
                fecha.setDate(fecha.getDate() + 7);
                fecha.setHours(9, 0, 0, 0);
                return fecha;
            case '2m':
                fecha.setMonth(fecha.getMonth() + 2);
                fecha.setHours(9, 0, 0, 0);
                return fecha;
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

ContactosSDRPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ContactosSDRPage;