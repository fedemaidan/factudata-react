import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import {
    Box, Container, Stack, Typography, Button, TextField, Chip,
    Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel,
    CircularProgress, MenuItem, Select, FormControl, InputLabel,
    Snackbar, Alert, Paper, InputAdornment, Grid, IconButton,
    Card, CardContent, CardActions, Divider, useTheme, useMediaQuery,
    Avatar, Badge, Fab, Dialog, DialogTitle, DialogContent, DialogActions,
    Checkbox, Tooltip, Tabs, Tab, Collapse,
    Popover, FormControlLabel
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
    Delete as DeleteIcon,
    ViewColumn as ViewColumnIcon
} from '@mui/icons-material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InboxIcon from '@mui/icons-material/Inbox';
import ReplayIcon from '@mui/icons-material/Replay';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ViewListIcon from '@mui/icons-material/ViewList';
import HistoryIcon from '@mui/icons-material/History';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import SDRService from 'src/services/sdrService';
import FollowUpAutoService from 'src/services/followUpAutoService';
import DrawerDetalleContactoSDR, { EstadoChip } from 'src/components/sdr/DrawerDetalleContactoSDR';
import ModalAgregarContacto from 'src/components/sdr/ModalAgregarContacto';
import ModalImportarExcel from 'src/components/sdr/ModalImportarExcel';
import ModalAdminTemplates from 'src/components/sdr/ModalAdminTemplates';
import ModalCrearReunion from 'src/components/sdr/ModalCrearReunion';
import ContadoresActividad from 'src/components/sdr/ContadoresActividad';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import BulkSendTemplateDialog from 'src/components/sdr/BulkSendTemplateDialog';
import BulkRegistrarAccionDialog from 'src/components/sdr/BulkRegistrarAccionDialog';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CalculateIcon from '@mui/icons-material/Calculate';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LinkIcon from '@mui/icons-material/Link';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

import { PRECALIFICACION_BOT, PLANES_SORBY } from 'src/constant/sdrConstants';

const ITEMS_PER_PAGE = 50;

const normalizarOrdenarPor = (value) => {
    const orderMap = {
        vencidos: 'vencidos',
        nuevo: 'createdAt',
        fecha: 'ultimaAccion',
        prioridad: 'prioridad',
        proximo_contacto: 'proximoContacto',
        fecha_creacion: 'createdAt'
    };

    return orderMap[value] || value || '';
};

const getOrdenDirPorDefecto = (value) => {
    const dirMap = {
        vencidos: 'asc',
        proximoContacto: 'asc',
        createdAt: 'desc',
        ultimaAccion: 'desc',
        prioridad: 'desc',
        estado: 'asc'
    };

    return dirMap[value] || 'asc';
};

const COLUMNAS_LABELS = {
    empresa: 'Empresa',
    estado: 'Estado',
    calificado: 'Calif.',
    reunion: 'Reunión',
    plan: 'Plan',
    prioridad: 'Prior.',
    actividad: 'Actividad',
    proximaTarea: 'Próx. tarea',
    fechaAdded: 'Added',
    ultimaAccion: 'Últ. contacto',
    proximoContacto: 'Próx. contacto',
    fechaReunion: 'F. Reunión',
    horaReunion: 'Hora',
    linkReunion: 'Link/Lugar',
    resultadoReunion: 'Resultado',
};

const DEFAULT_COLUMNAS = {
    empresa: true,
    estado: true,
    calificado: false,
    reunion: false,
    plan: true,
    prioridad: true,
    actividad: true,
    proximaTarea: true,
    fechaAdded: false,
    ultimaAccion: true,
    proximoContacto: true,
    fechaReunion: false,
    horaReunion: false,
    linkReunion: false,
    resultadoReunion: false,
};

const DEFAULT_COLUMNAS_ORDEN = Object.keys(DEFAULT_COLUMNAS);

const ContactosSDRPage = () => {
    const { user } = useAuthContext();
    const router = useRouter();
    const empresaId = user?.empresa?.id || user?.empresaData?.id || user?.empresa_id || 'demo-empresa';
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
    const [filtroEstados, setFiltroEstados] = useState([]); // array, OR logic
    const [filtroLlamadaExitosa, setFiltroLlamadaExitosa] = useState(''); // '' | 'si' | 'no'
    const [bandejaActiva, setBandejaActiva] = useState('nuevos'); // 'nuevos' | 'reintentos' | 'seguimiento' | 'reunionesPendientes' | 'reunionesPasadas' | 'todos'
    const [filtroFechaDesde, setFiltroFechaDesde] = useState(''); // YYYY-MM-DD
    const [filtroFechaHasta, setFiltroFechaHasta] = useState(''); // YYYY-MM-DD
    const [filtroSinFecha, setFiltroSinFecha] = useState(false);
    const [filtroCreatedDesde, setFiltroCreatedDesde] = useState(''); // YYYY-MM-DD
    const [filtroCreatedHasta, setFiltroCreatedHasta] = useState(''); // YYYY-MM-DD
    const [filtroSegmento, setFiltroSegmento] = useState(''); // '' | 'inbound' | 'outbound'
    const [filtroActividad, setFiltroActividad] = useState(''); // '' | 'sin_llamadas' | 'con_llamadas_no_atendidas' | 'con_llamadas_atendidas' | 'con_mensajes' | 'con_reuniones' | 'sin_actividad'
    const [filtroCalificadoBot, setFiltroCalificadoBot] = useState(''); // '' | 'calificado' | 'no_calificado' | 'quiere_meet' | 'no_llego'
    const [filtroQuiereReunion, setFiltroQuiereReunion] = useState(''); // '' | 'si' | 'no'
    const [filtroProximaTarea, setFiltroProximaTarea] = useState(''); // '' | 'llamada' | 'whatsapp' | 'email' | 'recordatorio' | 'sin_tarea'
    const [filtroExcluirConReunion, setFiltroExcluirConReunion] = useState(false); // true = excluir contactos con reunión
    const [filtroSoloCompromisos, setFiltroSoloCompromisos] = useState(false); // true = solo contactos con proximaTarea.estricto
    const [filtroOptOut, setFiltroOptOut] = useState(''); // '' | 'si' | 'no'
    const [ordenarPor, setOrdenarPor] = useState(''); // vacío = el backend elige según bandeja
    const [ordenDir, setOrdenDir] = useState('asc'); // 'asc' | 'desc'
    const [columnasVisibles, setColumnasVisibles] = useState(() => {
        try { const s = localStorage.getItem('sdr_columnas_visibles'); return s ? JSON.parse(s) : DEFAULT_COLUMNAS; } catch { return DEFAULT_COLUMNAS; }
    });
    const [columnasOrden, setColumnasOrden] = useState(() => {
        try {
            const s = localStorage.getItem('sdr_columnas_orden');
            const saved = s ? JSON.parse(s) : DEFAULT_COLUMNAS_ORDEN;
            // Agregar claves nuevas que no estén en el localStorage guardado
            const faltantes = DEFAULT_COLUMNAS_ORDEN.filter(k => !saved.includes(k));
            return faltantes.length > 0 ? [...saved, ...faltantes] : saved;
        } catch { return DEFAULT_COLUMNAS_ORDEN; }
    });
    const [anchorColumnas, setAnchorColumnas] = useState(null);

    // Filtros expandidos/colapsados
    const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);
    
    // Contadores de bandejas (para badges)
    const [contadoresBandejas, setContadoresBandejas] = useState({ nuevos: 0, reintentos: 0, seguimiento: 0, reunionesPendientes: 0, reunionesPasadas: 0 });
    
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

    // Config prompt IA
    const [modalConfigPrompt, setModalConfigPrompt] = useState(false);
    const [promptConfigs, setPromptConfigs] = useState({
        audio: { custom: '', default: '' },
        transcripcion: { custom: '', default: '' },
        resumen: { custom: '', default: '' }
    });
    const [loadingConfig, setLoadingConfig] = useState(false);

    // Permiso para enviar templates via bot
    const tienePermisoEnviarBot = user?.admin || (user?.empresa?.acciones || user?.empresaData?.acciones || []).includes('ENVIAR_MENSAJE_BOT');
    
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

    // Inicialización desde URL
    const initialized = useRef(false);

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
            
            if (filtroEstados.length) params.estado = filtroEstados.join(',');
            if (busqueda) params.busqueda = busqueda;
            if (filtroSegmento) params.segmento = filtroSegmento;
            if (filtroFechaDesde) params.filtroFechaDesde = filtroFechaDesde;
            if (filtroFechaHasta) params.filtroFechaHasta = filtroFechaHasta;
            if (filtroSinFecha) params.filtroSinFecha = 'true';
            if (filtroCreatedDesde) params.createdDesde = filtroCreatedDesde;
            if (filtroCreatedHasta) params.createdHasta = filtroCreatedHasta;
            if (filtroActividad) params.actividad = filtroActividad;
            if (filtroCalificadoBot) params.precalificacionBot = filtroCalificadoBot;
            if (filtroQuiereReunion) params.quiereReunion = filtroQuiereReunion;
            if (filtroProximaTarea) params.proximaTarea = filtroProximaTarea;
            if (filtroSoloCompromisos) params.soloCompromisos = 'true';
            if (filtroExcluirConReunion) params.excluirConReunion = 'true';
            if (filtroOptOut) params.optOut = filtroOptOut;
            
            // Mapear ordenamiento al formato del backend
            if (ordenarPor) {
                // Claves legacy con dirección fija
                const ordenMap = {
                    'vencidos':        { backend: 'proximoContacto', dir: 'asc' },
                    'nuevo':           { backend: 'createdAt',       dir: 'desc' },
                    'fecha':           { backend: 'ultimaAccion',    dir: 'desc' },
                    'prioridad':       { backend: 'prioridad',       dir: 'desc' },
                    'proximo_contacto':{ backend: 'proximoContacto', dir: 'asc' },
                    'fecha_creacion':  { backend: 'createdAt',       dir: 'desc' },
                };
                const mapped = ordenMap[ordenarPor];
                if (mapped) {
                    params.ordenarPor = mapped.backend;
                    params.ordenDir = mapped.dir;
                } else {
                    // Campo directo desde headers de la tabla (usa ordenDir del estado)
                    params.ordenarPor = ordenarPor;
                    params.ordenDir = ordenDir;
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
    }, [empresaId, sdrId, filtroEstados, bandejaActiva, busqueda, filtroFechaDesde, filtroFechaHasta, filtroSinFecha, filtroCreatedDesde, filtroCreatedHasta, filtroSegmento, filtroActividad, filtroCalificadoBot, filtroQuiereReunion, filtroProximaTarea, filtroSoloCompromisos, filtroExcluirConReunion, filtroOptOut, ordenarPor, ordenDir, page]);

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

    // Persistir preferencias de columnas
    useEffect(() => { try { localStorage.setItem('sdr_columnas_visibles', JSON.stringify(columnasVisibles)); } catch {} }, [columnasVisibles]);
    useEffect(() => { try { localStorage.setItem('sdr_columnas_orden', JSON.stringify(columnasOrden)); } catch {} }, [columnasOrden]);

    // Inicializar filtros desde query params de la URL (una sola vez al montar)
    useEffect(() => {
        if (!router.isReady || initialized.current) return;
        const q = router.query;
        // Intentar restaurar desde sessionStorage si no hay query params (volver sin params)
        let src = q;
        if (!q.bandeja && !q.estado && !q.actividad) {
            try {
                const saved = sessionStorage.getItem('sdr_lista_query');
                if (saved) {
                    const sp = new URLSearchParams(saved);
                    src = Object.fromEntries(sp.entries());
                }
            } catch { /* ignore */ }
        }
        setBandejaActiva(src.bandeja || 'nuevos');
        setFiltroEstados(src.estado ? src.estado.split(',') : []);
        setFiltroLlamadaExitosa(src.llamadaExitosa || '');
        setFiltroSegmento(src.segmento || '');
        setFiltroActividad(src.actividad || '');
        setFiltroCalificadoBot(src.calificadoBot || '');
        setFiltroQuiereReunion(src.quiereReunion || '');
        setFiltroProximaTarea(src.proximaTarea || '');
        setFiltroFechaDesde(src.fechaDesde || '');
        setFiltroFechaHasta(src.fechaHasta || '');
        setFiltroSinFecha(src.sinFecha === 'true');
        setFiltroCreatedDesde(src.createdDesde || '');
        setFiltroCreatedHasta(src.createdHasta || '');
        setFiltroExcluirConReunion(src.excluirConReunion === 'true');
        setFiltroSoloCompromisos(src.soloCompromisos === 'true');
        setFiltroOptOut(src.optOut || '');
        setOrdenarPor(normalizarOrdenarPor(src.ordenarPor || ''));
        setOrdenDir(src.ordenDir || 'asc');
        setBusqueda(src.busqueda || '');
        setPage(src.page ? parseInt(src.page, 10) : 1);
        initialized.current = true;
    }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cambiar bandeja: limpia los filtros que dependen de ella
    const handleCambiarBandeja = (v) => {
        setBandejaActiva(v);
        setFiltroEstados([]);
        setFiltroCalificadoBot('');
        setFiltroQuiereReunion('');
        setFiltroProximaTarea('');
        setPage(1);
        // En bandejas de reuniones, activar columnas de reunión automáticamente
        if (v === 'reunionesPendientes' || v === 'reunionesPasadas') {
            const colsReunion = ['fechaReunion', 'horaReunion', 'linkReunion', 'resultadoReunion'];
            setColumnasVisibles(prev => ({
                ...prev,
                fechaReunion: true,
                horaReunion: true,
                linkReunion: true,
                resultadoReunion: v === 'reunionesPasadas',
            }));
            // Asegurar que estén en columnasOrden (por si el usuario tiene localStorage viejo)
            setColumnasOrden(prev => {
                const faltantes = colsReunion.filter(k => !prev.includes(k));
                return faltantes.length > 0 ? [...prev, ...faltantes] : prev;
            });
        }
    };

    // Resetear página a 1 cuando cambian filtros (sin skip — la init ya setea page directamente)
    useEffect(() => {
        if (!initialized.current) return;
        setPage(1);
    }, [filtroEstados, filtroLlamadaExitosa, busqueda, filtroSegmento, ordenarPor]);

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

    // Sincronizar filtros → URL (después de inicializado)
    useEffect(() => {
        if (!initialized.current) return;
        const params = {};
        if (bandejaActiva && bandejaActiva !== 'nuevos') params.bandeja = bandejaActiva;
        if (filtroEstados.length) params.estado = filtroEstados.join(',');
        if (filtroLlamadaExitosa) params.llamadaExitosa = filtroLlamadaExitosa;
        if (filtroSegmento) params.segmento = filtroSegmento;
        if (filtroActividad) params.actividad = filtroActividad;
        if (filtroCalificadoBot) params.calificadoBot = filtroCalificadoBot;
        if (filtroQuiereReunion) params.quiereReunion = filtroQuiereReunion;
        if (filtroProximaTarea) params.proximaTarea = filtroProximaTarea;
        if (filtroFechaDesde) params.fechaDesde = filtroFechaDesde;
        if (filtroFechaHasta) params.fechaHasta = filtroFechaHasta;
        if (filtroSinFecha) params.sinFecha = 'true';
        if (filtroCreatedDesde) params.createdDesde = filtroCreatedDesde;
        if (filtroCreatedHasta) params.createdHasta = filtroCreatedHasta;
        if (filtroExcluirConReunion) params.excluirConReunion = 'true';
        if (filtroSoloCompromisos) params.soloCompromisos = 'true';
        if (filtroOptOut) params.optOut = filtroOptOut;
        if (ordenarPor) params.ordenarPor = ordenarPor;
        if (ordenDir && ordenDir !== 'asc') params.ordenDir = ordenDir;
        if (busqueda) params.busqueda = busqueda;
        if (page > 1) params.page = String(page);
        // Preservar param contacto si está abierto el drawer
        if (router.query.contacto) params.contacto = router.query.contacto;
        router.replace({ query: params }, undefined, { shallow: true });
        // Guardar siempre en sessionStorage para restaurar al volver desde detalle
        try {
            const forSession = { ...params };
            delete forSession.contacto;
            const qs = new URLSearchParams(forSession).toString();
            if (qs) sessionStorage.setItem('sdr_lista_query', qs);
            else sessionStorage.removeItem('sdr_lista_query');
        } catch { /* ignore */ }
    }, [bandejaActiva, filtroEstados, filtroLlamadaExitosa, filtroSegmento, filtroActividad, filtroCalificadoBot, filtroQuiereReunion, filtroProximaTarea, filtroFechaDesde, filtroFechaHasta, filtroSinFecha, filtroCreatedDesde, filtroCreatedHasta, filtroExcluirConReunion, filtroSoloCompromisos, filtroOptOut, ordenarPor, ordenDir, busqueda, page]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Guardar query params actuales en sessionStorage para restaurar al volver
    const guardarQueryParamsEnSession = () => {
        try {
            const params = new URLSearchParams(window.location.search);
            params.delete('contacto'); // No guardar el drawer abierto
            const qs = params.toString();
            if (qs) sessionStorage.setItem('sdr_lista_query', qs);
            else sessionStorage.removeItem('sdr_lista_query');
        } catch { /* ignore */ }
    };

    // Abrir página de detalle del contacto con contexto de navegación
    const handleOpenDrawer = (contacto) => {
        // Guardar IDs de contactos en sessionStorage para navegación ← →
        try {
            const ids = contactosOrdenados.map(c => c._id);
            sessionStorage.setItem('sdr_contacto_ids', JSON.stringify(ids));
        } catch { /* ignore */ }
        guardarQueryParamsEnSession();
        router.push(`/sdr/contacto/${contacto._id}`);
    };

    // Navegar al primer contacto de la lista (flujo secuencial)
    const handleSiguienteContacto = () => {
        if (contactosOrdenados.length === 0) return;
        try {
            const ids = contactosOrdenados.map(c => c._id);
            sessionStorage.setItem('sdr_contacto_ids', JSON.stringify(ids));
        } catch { /* ignore */ }
        guardarQueryParamsEnSession();
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
    
    // Contar vencidos
    const contarVencidos = () => {
        return contactos.filter(c => c.proximoContacto && new Date(c.proximoContacto) < new Date()).length;
    };
    
    // Verificar si un contacto tiene próximo contacto vencido
    const estaVencido = (contacto) => {
        if (!contacto.proximoContacto) return false;
        return new Date(contacto.proximoContacto) < new Date();
    };
    
    // Filtrar contactos por rango de fecha de próximo contacto
    const filtrarPorProximoContacto = (lista) => {
        if (!filtroFechaDesde && !filtroFechaHasta && !filtroSinFecha) return lista;
        return lista.filter(c => {
            if (filtroSinFecha) return !c.proximoContacto;
            if (!c.proximoContacto) return false;
            const fecha = new Date(c.proximoContacto);
            if (filtroFechaDesde) {
                const [year, month, day] = filtroFechaDesde.split('-').map(Number);
                const desde = new Date(year, month - 1, day, 0, 0, 0, 0);
                if (fecha < desde) return false;
            }
            if (filtroFechaHasta) {
                const [year, month, day] = filtroFechaHasta.split('-').map(Number);
                const hasta = new Date(year, month - 1, day, 23, 59, 59, 999);
                if (fecha > hasta) return false;
            }
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

    // Desactivar/Activar follow-up automático masivamente
    const handleToggleFollowUpMasivo = async (activo) => {
        if (seleccionados.length === 0) return;
        const label = activo ? 'activar' : 'desactivar';
        if (!confirm(`¿${activo ? 'Activar' : 'Desactivar'} follow-up automático para ${seleccionados.length} contacto(s)?`)) return;
        setActionLoading(true);
        try {
            const res = await FollowUpAutoService.actualizarFollowUpAutoMasivo(seleccionados, activo);
            setSnackbar({
                open: true,
                message: `Follow-up ${activo ? 'activado' : 'desactivado'} en ${res.modificados} contacto(s)`,
                severity: 'success'
            });
            setSeleccionados([]);
            cargarContactos();
        } catch (error) {
            setSnackbar({ open: true, message: `Error al ${label} follow-up`, severity: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    // ==================== VISTAS GUARDADAS ====================

    const aplicarVista = (vista) => {
        setVistaActiva(vista);
        // Aplicar filtros de la vista
        const f = vista.filtros || {};
        setBandejaActiva(f.bandejaActiva || 'todos');
        setFiltroEstados(f.filtroEstados || (f.filtroEstado ? [f.filtroEstado] : f.estados || []));
        setFiltroLlamadaExitosa(f.filtroLlamadaExitosa || '');
        setFiltroFechaDesde(f.filtroFechaDesde || '');
        setFiltroFechaHasta(f.filtroFechaHasta || '');
        setFiltroSinFecha(f.filtroSinFecha || false);
        setFiltroCreatedDesde(f.filtroCreatedDesde || '');
        setFiltroCreatedHasta(f.filtroCreatedHasta || '');
        setFiltroSegmento(f.filtroSegmento || '');
        setFiltroActividad(f.filtroActividad || '');
        setFiltroCalificadoBot(f.filtroCalificadoBot || '');
        setFiltroQuiereReunion(f.filtroQuiereReunion || '');
        setFiltroProximaTarea(f.filtroProximaTarea || '');
        setFiltroOptOut(f.filtroOptOut || '');
        setFiltroExcluirConReunion(f.filtroExcluirConReunion || false);
        setFiltroSoloCompromisos(f.filtroSoloCompromisos || false);
        setOrdenarPor(normalizarOrdenarPor(f.ordenarPor || ''));
        setOrdenDir(f.ordenDir || vista.ordenDir || 'asc');
        setBusqueda(f.busqueda || '');
        setColumnasVisibles({ ...DEFAULT_COLUMNAS, ...(f.columnasVisibles || {}) });
        setColumnasOrden(f.columnasOrden || DEFAULT_COLUMNAS_ORDEN);
        setPage(1);
    };

    const handleGuardarVista = async () => {
        if (!nombreVista.trim()) return;
        try {
            const data = {
                nombre: nombreVista.trim(),
                empresaId,
                compartida: vistaCompartida,
                filtros: {
                    bandejaActiva,
                    filtroEstados,
                    filtroLlamadaExitosa: filtroLlamadaExitosa || '',
                    filtroFechaDesde: filtroFechaDesde || '',
                    filtroFechaHasta: filtroFechaHasta || '',
                    filtroSinFecha,
                    filtroCreatedDesde: filtroCreatedDesde || '',
                    filtroCreatedHasta: filtroCreatedHasta || '',
                    busqueda: busqueda || '',
                    filtroSegmento,
                    filtroActividad,
                    filtroCalificadoBot,
                    filtroQuiereReunion,
                    filtroProximaTarea,
                    filtroOptOut,
                    filtroExcluirConReunion,
                    filtroSoloCompromisos,
                    ordenarPor,
                    ordenDir,
                    columnasVisibles,
                    columnasOrden
                },
                ordenarPor,
                ordenDir
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
        setFiltroEstados([]);
        setFiltroLlamadaExitosa('');
        setBandejaActiva('nuevos');
        setFiltroFechaDesde('');
        setFiltroFechaHasta('');
        setFiltroSinFecha(false);
        setFiltroCreatedDesde('');
        setFiltroCreatedHasta('');
        setFiltroActividad('');
        setFiltroCalificadoBot('');
        setFiltroQuiereReunion('');
        setFiltroProximaTarea('');
        setFiltroOptOut('');
        setFiltroExcluirConReunion(false);
        setFiltroSoloCompromisos(false);
        setOrdenarPor('');
        setOrdenDir('asc');
        setBusqueda('');
        setColumnasVisibles(DEFAULT_COLUMNAS);
        setColumnasOrden(DEFAULT_COLUMNAS_ORDEN);
    };
    
    // Los contactos ya vienen ordenados del backend según ordenarPor/ordenDir
    // Aplicamos filtros locales: próximo contacto + actividad + calificación bot + quiere reunión
    // Filtrar por compromisos (estricto)
    const filtrarPorCompromisos = (lista) => {
        if (!filtroSoloCompromisos) return lista;
        return lista.filter(c => c.proximaTarea?.estricto === true);
    };

    const filtrarPorLlamadaExitosa = (lista) => {
        if (!filtroLlamadaExitosa) return lista;
        return lista.filter(c => {
            const tiene = (c.contadores?.llamadasAtendidas || 0) > 0;
            return filtroLlamadaExitosa === 'si' ? tiene : !tiene;
        });
    };

    const contactosOrdenados = filtrarPorLlamadaExitosa(filtrarPorCompromisos(filtrarPorProximaTarea(filtrarPorQuiereReunion(filtrarPorCalificadoBot(filtrarPorActividad(filtrarPorProximoContacto(contactos)))))));

    const nFiltrosActivos = [
        filtroFechaDesde, filtroFechaHasta, filtroSinFecha,
        filtroCreatedDesde, filtroCreatedHasta,
        filtroSegmento, filtroActividad, filtroCalificadoBot,
        filtroQuiereReunion, filtroProximaTarea, filtroOptOut,
        filtroExcluirConReunion, filtroSoloCompromisos, ordenarPor,
        filtroLlamadaExitosa
    ].filter(Boolean).length + (filtroEstados.length > 0 ? 1 : 0);

    const handleLimpiarFiltros = () => {
        setFiltroFechaDesde(''); setFiltroFechaHasta(''); setFiltroSinFecha(false);
        setFiltroCreatedDesde(''); setFiltroCreatedHasta('');
        setFiltroSegmento(''); setFiltroActividad(''); setFiltroCalificadoBot('');
        setFiltroQuiereReunion(''); setFiltroProximaTarea(''); setFiltroOptOut('');
        setFiltroExcluirConReunion(false); setFiltroSoloCompromisos(false); setOrdenarPor(''); setOrdenDir('asc');
        setFiltroEstados([]); setFiltroLlamadaExitosa('');
    };
    
    // Formatear próximo contacto para mostrar
    const formatearFechaCorta = (fecha) => {
        if (!fecha) return '—';
        return new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    };

    const formatearRelativo = (fecha) => {
        if (!fecha) return '—';
        const ahora = new Date();
        const d = new Date(fecha);
        const diff = ahora - d;
        const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        if (diff < 0) {
            // Fecha futura
            const dias = Math.floor(Math.abs(diff) / 86400000);
            if (dias === 0) return `hoy ${hora}`;
            if (dias === 1) return `mañana ${hora}`;
            return `en ${dias}d`;
        }
        const dias = Math.floor(diff / 86400000);
        if (dias === 0) return `hoy ${hora}`;
        if (dias === 1) return 'ayer';
        if (dias < 7) return `hace ${dias}d`;
        if (dias < 30) return `hace ${Math.floor(dias / 7)}sem`;
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    };

    const handleSortHeader = (campo) => {
        if (ordenarPor === campo) {
            setOrdenDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setOrdenarPor(campo);
            setOrdenDir('asc');
        }
    };

    const handleOrdenPredefinidoChange = (value) => {
        setOrdenarPor(value);
        setOrdenDir(getOrdenDirPorDefecto(value));
    };

    const handleComenzarSecuencial = () => {
        if (contactosOrdenados.length === 0) return;
        try {
            const ids = contactosOrdenados.map(c => c._id);
            sessionStorage.setItem('sdr_secuencial_ids', JSON.stringify(ids));
        } catch { /* ignore */ }
        guardarQueryParamsEnSession();
        router.push(`/sdr/contacto/${contactosOrdenados[0]._id}?modo=secuencial`);
    };

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
        window.location.href = `tel:+${tel}`;
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
                            color="success"
                            startIcon={<PlayArrowIcon />}
                            onClick={handleComenzarSecuencial}
                            disabled={contactosOrdenados.length === 0}
                            sx={{ mr: 0.5, textTransform: 'none', minWidth: 'auto', px: 1.5 }}
                        >
                            Comenzar
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
                        <IconButton 
                            onClick={async () => {
                                setModalConfigPrompt(true);
                                try {
                                    const config = await SDRService.obtenerConfig(empresaId);
                                    setPromptConfigs({
                                        audio: { custom: config.promptAudioResumen || '', default: config.promptAudioDefault || '' },
                                        transcripcion: { custom: config.promptTranscripcionReunion || '', default: config.promptTranscripcionReunionDefault || '' },
                                        resumen: { custom: config.promptResumenContacto || '', default: config.promptResumenContactoDefault || '' }
                                    });
                                } catch (err) {
                                    console.error('Error cargando config:', err);
                                }
                            }} 
                            size="small"
                            color="default"
                            title="Configurar prompt IA (audio y reuniones)"
                        >
                            <SmartToyIcon />
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
                    onChange={(_, v) => handleCambiarBandeja(v)}
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
                        value="todos"
                        icon={<ViewListIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label="Todos"
                    />
                </Tabs>
            </Box>

            {/* ── Barra de filtros colapsable ── */}
            {(() => {
                const nFiltros = nFiltrosActivos;

                return (
                    <>
                        <Box sx={{ px: 2, pb: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                    icon={<FilterListIcon sx={{ fontSize: 16 }} />}
                                    label={`Filtros${nFiltros > 0 ? ` (${nFiltros})` : ''}`}
                                    size="small"
                                    color={nFiltros > 0 ? 'primary' : 'default'}
                                    variant={filtrosExpandidos ? 'filled' : 'outlined'}
                                    onClick={() => setFiltrosExpandidos(v => !v)}
                                    sx={{ fontWeight: 600 }}
                                />
                                {nFiltros > 0 && (
                                    <Chip label="Limpiar" size="small" variant="outlined" onClick={handleLimpiarFiltros} sx={{ fontSize: '0.75rem', color: 'text.secondary' }} />
                                )}
                            </Stack>
                        </Box>

                        <Collapse in={filtrosExpandidos}>
                            <Box sx={{ px: 2, pb: 1.5 }}>
                                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="flex-end">
                                    {/* Rango de fecha próximo contacto */}
                                    <TextField
                                        type="date"
                                        size="small"
                                        label="Próx. desde"
                                        value={filtroFechaDesde}
                                        onChange={(e) => { setFiltroFechaDesde(e.target.value); setFiltroSinFecha(false); }}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ width: 150 }}
                                    />
                                    <TextField
                                        type="date"
                                        size="small"
                                        label="Próx. hasta"
                                        value={filtroFechaHasta}
                                        onChange={(e) => { setFiltroFechaHasta(e.target.value); setFiltroSinFecha(false); }}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ width: 150 }}
                                    />
                                    <FormControlLabel
                                        control={<Checkbox size="small" checked={filtroSinFecha} onChange={(e) => { setFiltroSinFecha(e.target.checked); if (e.target.checked) { setFiltroFechaDesde(''); setFiltroFechaHasta(''); } }} />}
                                        label={<Typography variant="caption">Sin fecha</Typography>}
                                        sx={{ m: 0, alignSelf: 'center' }}
                                    />

                                    {/* Rango de fecha de inicio (createdAt) */}
                                    <TextField
                                        type="date"
                                        size="small"
                                        label="Inicio desde"
                                        value={filtroCreatedDesde}
                                        onChange={(e) => setFiltroCreatedDesde(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ width: 150 }}
                                    />
                                    <TextField
                                        type="date"
                                        size="small"
                                        label="Inicio hasta"
                                        value={filtroCreatedHasta}
                                        onChange={(e) => setFiltroCreatedHasta(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ width: 150 }}
                                    />
                                </Stack>

                                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="flex-end">

                                    {/* Estado — multi-select OR */}
                                    <FormControl size="small" sx={{ minWidth: 175 }}>
                                        <InputLabel>Estado</InputLabel>
                                        <Select
                                            multiple
                                            value={filtroEstados}
                                            label="Estado"
                                            onChange={(e) => setFiltroEstados(e.target.value)}
                                            renderValue={(sel) => sel.length === 0 ? '' : `${sel.length} estado(s)`}
                                        >
                                            {[
                                                { key: 'nuevo', label: 'Nuevo' },
                                                { key: 'contactado', label: 'Contactado' },
                                                { key: 'calificado', label: 'Calificado' },
                                                { key: 'cierre', label: 'En Cierre' },
                                                { key: 'ganado', label: 'Ganado' },
                                                { key: 'no_contacto', label: 'No Contacto' },
                                                { key: 'no_responde', label: 'No Responde' },
                                                { key: 'revisar_mas_adelante', label: 'Revisar' },
                                                { key: 'no_califica', label: 'No Califica' },
                                                { key: 'perdido', label: 'Perdido' },
                                            ].map(({ key, label }) => (
                                                <MenuItem key={key} value={key}>
                                                    <Checkbox size="small" checked={filtroEstados.includes(key)} />
                                                    {label} ({contarPorEstado(key)})
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    {/* Actividad */}
                                    <FormControl size="small" sx={{ minWidth: 155 }}>
                                        <InputLabel>Actividad</InputLabel>
                                        <Select value={filtroActividad} label="Actividad" onChange={(e) => setFiltroActividad(e.target.value)}>
                                            <MenuItem value="">Todas</MenuItem>
                                            <MenuItem value="sin_actividad">🆕 Sin actividad</MenuItem>
                                            <MenuItem value="con_llamadas_no_atendidas">📵 No atendidas</MenuItem>
                                            <MenuItem value="con_llamadas_atendidas">📞 Atendidas</MenuItem>
                                            <MenuItem value="sin_llamadas">📴 Sin llamadas</MenuItem>
                                            <MenuItem value="con_mensajes">💬 Mensajes</MenuItem>
                                            <MenuItem value="con_reuniones">📅 Con reuniones</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {/* Calificado por bot */}
                                    <FormControl size="small" sx={{ minWidth: 140 }}>
                                        <InputLabel>Bot</InputLabel>
                                        <Select value={filtroCalificadoBot} label="Bot" onChange={(e) => setFiltroCalificadoBot(e.target.value)}>
                                            <MenuItem value="">Todos</MenuItem>
                                            <MenuItem value="calificado">🤖 Calificado</MenuItem>
                                            <MenuItem value="no_calificado">No calificado</MenuItem>
                                            <MenuItem value="quiere_meet">🤝 Quiere meet</MenuItem>
                                            <MenuItem value="no_llego">No llegó</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {/* Reunión */}
                                    <FormControl size="small" sx={{ minWidth: 130 }}>
                                        <InputLabel>Reunión</InputLabel>
                                        <Select value={filtroQuiereReunion} label="Reunión" onChange={(e) => setFiltroQuiereReunion(e.target.value)}>
                                            <MenuItem value="">Todos</MenuItem>
                                            <MenuItem value="si">📅 Quiere</MenuItem>
                                            <MenuItem value="no">No quiere</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {/* Próxima tarea */}
                                    <FormControl size="small" sx={{ minWidth: 140 }}>
                                        <InputLabel>Próx. tarea</InputLabel>
                                        <Select value={filtroProximaTarea} label="Próx. tarea" onChange={(e) => setFiltroProximaTarea(e.target.value)}>
                                            <MenuItem value="">Todas</MenuItem>
                                            <MenuItem value="sin_tarea">Sin tarea</MenuItem>
                                            <MenuItem value="llamada">📞 Llamada</MenuItem>
                                            <MenuItem value="whatsapp">💬 WhatsApp</MenuItem>
                                            <MenuItem value="email">✉️ Email</MenuItem>
                                            <MenuItem value="recordatorio">📝 Recordatorio</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {/* Segmento */}
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <InputLabel>Segmento</InputLabel>
                                        <Select value={filtroSegmento} label="Segmento" onChange={(e) => setFiltroSegmento(e.target.value)}>
                                            <MenuItem value="">Todos</MenuItem>
                                            <MenuItem value="inbound">🔵 Inbound</MenuItem>
                                            <MenuItem value="outbound">🟠 Outbound</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {/* Opt-out */}
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <InputLabel>Opt-out</InputLabel>
                                        <Select value={filtroOptOut} label="Opt-out" onChange={(e) => setFiltroOptOut(e.target.value)}>
                                            <MenuItem value="">Todos</MenuItem>
                                            <MenuItem value="si">🔇 Solo opt-out</MenuItem>
                                            <MenuItem value="no">✅ Sin opt-out</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {/* Ordenar */}
                                    <FormControl size="small" sx={{ minWidth: 140 }}>
                                        <InputLabel>Ordenar por</InputLabel>
                                        <Select value={ordenarPor} label="Ordenar por" onChange={(e) => handleOrdenPredefinidoChange(e.target.value)}>
                                            <MenuItem value="">Por defecto</MenuItem>
                                            <MenuItem value="proximoContacto">Próximo contacto</MenuItem>
                                            <MenuItem value="createdAt">Más nuevos</MenuItem>
                                            <MenuItem value="ultimaAccion">Última actividad</MenuItem>
                                            <MenuItem value="prioridad">Prioridad</MenuItem>
                                            <MenuItem value="estado">Estado</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {/* Llamada exitosa */}
                                    <FormControl size="small" sx={{ minWidth: 155 }}>
                                        <InputLabel>Llamada exitosa</InputLabel>
                                        <Select value={filtroLlamadaExitosa} label="Llamada exitosa" onChange={(e) => setFiltroLlamadaExitosa(e.target.value)}>
                                            <MenuItem value="">Todas</MenuItem>
                                            <MenuItem value="si">📞 Con llamada exitosa</MenuItem>
                                            <MenuItem value="no">📵 Sin llamada exitosa</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {/* Toggles */}
                                    <FormControlLabel
                                        control={<Checkbox size="small" checked={filtroExcluirConReunion} onChange={(e) => setFiltroExcluirConReunion(e.target.checked)} />}
                                        label={<Typography variant="caption">🚫 Excluir c/reunión</Typography>}
                                        sx={{ m: 0, alignSelf: 'center' }}
                                    />
                                    <FormControlLabel
                                        control={<Checkbox size="small" checked={filtroSoloCompromisos} onChange={(e) => setFiltroSoloCompromisos(e.target.checked)} />}
                                        label={<Typography variant="caption">🔔 Solo compromisos</Typography>}
                                        sx={{ m: 0, alignSelf: 'center' }}
                                    />
                                    {nFiltrosActivos > 0 && (
                                        <Button size="small" variant="outlined" color="inherit" onClick={handleLimpiarFiltros} sx={{ ml: 'auto', color: 'text.secondary', borderColor: 'divider', whiteSpace: 'nowrap' }}>
                                            Limpiar filtros
                                        </Button>
                                    )}
                                </Stack>
                            </Box>
                        </Collapse>
                    </>
                );
            })()}

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
                                <Button size="small" onClick={() => handleToggleFollowUpMasivo(false)} disabled={actionLoading}>
                                    ⏹ Follow-Up Off
                                </Button>
                                <Button size="small" onClick={() => handleToggleFollowUpMasivo(true)} disabled={actionLoading}>
                                    ▶️ Follow-Up On
                                </Button>
                                <Button size="small" onClick={async () => {
                                    setActionLoading(true);
                                    try {
                                        const res = await SDRService.recalcularContadores(seleccionados);
                                        setSnackbar({ open: true, message: `Contadores recalculados: ${res.exitosos} OK${res.fallidos > 0 ? `, ${res.fallidos} error(es)` : ''}`, severity: res.fallidos === 0 ? 'success' : 'warning' });
                                        cargarContactos();
                                    } catch (err) {
                                        setSnackbar({ open: true, message: 'Error al recalcular contadores', severity: 'error' });
                                    } finally {
                                        setActionLoading(false);
                                    }
                                }} disabled={actionLoading}>
                                    🔢 Contadores
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

            {/* Lista de contactos */}
            <Stack spacing={1.5} sx={{ px: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : contactosOrdenados.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            {bandejaActiva === 'reunionesPasadas' ? 'No hay reuniones pasadas' :
                             bandejaActiva === 'reunionesPendientes' ? 'No hay reuniones pendientes' :
                             filtroEstados.length > 0 ? `No hay contactos con estado "${filtroEstados.join(', ')}"` : 'No tienes contactos asignados'}
                        </Typography>
                    </Paper>
                ) : (
                    contactosOrdenados.map((contacto) => {
                        const proximo = formatearProximo(contacto.proximoContacto);
                        const vencido = estaVencido(contacto);
                        const reunFecha = (bandejaActiva === 'reunionesPendientes' || bandejaActiva === 'reunionesPasadas') && contacto.proximaReunion?.fecha ? new Date(contacto.proximaReunion.fecha) : null;
                        const reunEsHoy = reunFecha && new Date().toDateString() === reunFecha.toDateString();
                        const reunEsPasada = reunFecha && reunFecha < new Date() && !reunEsHoy;
                        
                        return (
                            <Paper
                                key={contacto._id}
                                elevation={seleccionados.includes(contacto._id) ? 4 : (vencido ? 3 : 0)}
                                onClick={() => handleOpenDrawer(contacto)}
                                sx={{ 
                                    p: 2,
                                    cursor: 'pointer',
                                    borderRadius: 3,
                                    border: seleccionados.includes(contacto._id) ? 2 : (reunEsHoy || reunEsPasada || vencido ? 2 : 1),
                                    borderColor: seleccionados.includes(contacto._id) ? 'primary.main' : reunEsHoy ? 'warning.main' : reunEsPasada ? 'error.main' : (vencido ? 'error.main' : 'divider'),
                                    bgcolor: seleccionados.includes(contacto._id) ? 'primary.50' : reunEsHoy ? 'warning.50' : reunEsPasada ? 'error.50' : (vencido ? 'error.50' : 'white'),
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
                                                {contacto.optOutWhatsApp && (
                                                    <Tooltip title="Opt-out: pidió no recibir más mensajes">
                                                        <span style={{ fontSize: '0.85rem', marginLeft: 4, cursor: 'default' }}>🔇</span>
                                                    </Tooltip>
                                                )}
                                            </Typography>
                                            <EstadoChip estado={contacto.estado} quiereReunion={contacto.quiereReunion} />
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
                                            {contacto.ab_test_variante && (
                                                <Chip
                                                    size="small"
                                                    label={`AB:${contacto.ab_test_variante}`}
                                                    color={contacto.ab_test_variante === 'B' ? 'secondary' : 'default'}
                                                    variant="outlined"
                                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                                />
                                            )}
                                            {contacto.datosBot?.agendarClickeado && (
                                                <Tooltip title="Tocó el link de agendar reunión">
                                                    <Chip
                                                        size="small"
                                                        label="📅 Agendar"
                                                        color="success"
                                                        variant="outlined"
                                                        sx={{ height: 20, fontSize: '0.65rem' }}
                                                    />
                                                </Tooltip>
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
                                        {/* Info de reunión en bandejas de reuniones */}
                                        {reunFecha && (
                                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                                                <Typography variant="caption" fontWeight={700} color={reunEsHoy ? 'warning.dark' : reunEsPasada ? 'error.main' : 'primary.main'}>
                                                    📅 {reunFecha.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                                    {contacto.proximaReunion?.hora ? ` · ${contacto.proximaReunion.hora}` : ''}
                                                </Typography>
                                                {contacto.proximaReunion?.link && (
                                                    <Button size="small" variant="outlined" href={contacto.proximaReunion.link} target="_blank"
                                                        onClick={(e) => e.stopPropagation()}
                                                        sx={{ textTransform: 'none', fontSize: '0.65rem', py: 0, minWidth: 'auto', px: 0.8 }}>
                                                        Unirse
                                                    </Button>
                                                )}
                                                {contacto.proximaReunion?.estadoReunion && (
                                                    <Chip size="small"
                                                        label={contacto.proximaReunion.estadoReunion === 'realizada' ? 'Realizada' : contacto.proximaReunion.estadoReunion === 'no_show' ? 'No show' : 'Cancelada'}
                                                        color={contacto.proximaReunion.estadoReunion === 'realizada' ? 'success' : 'error'}
                                                        variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }}
                                                    />
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
                            startIcon={<SmartToyIcon />}
                            onClick={async () => {
                                setModalConfigPrompt(true);
                                try {
                                    const config = await SDRService.obtenerConfig(empresaId);
                                    setPromptConfigs({
                                        audio: { custom: config.promptAudioResumen || '', default: config.promptAudioDefault || '' },
                                        transcripcion: { custom: config.promptTranscripcionReunion || '', default: config.promptTranscripcionReunionDefault || '' },
                                        resumen: { custom: config.promptResumenContacto || '', default: config.promptResumenContactoDefault || '' }
                                    });
                                } catch (err) {
                                    console.error('Error cargando config:', err);
                                }
                            }}
                            variant="outlined"
                            color="inherit"
                        >
                            Prompt IA
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
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Tabs
                        value={bandejaActiva}
                        onChange={(_, v) => handleCambiarBandeja(v)}
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
                            value="todos"
                            icon={<ViewListIcon />}
                            iconPosition="start"
                            label="Todos"
                        />
                    </Tabs>
                    <Box sx={{ px: 1.5 }}>
                        <Button
                            startIcon={<PlayArrowIcon />}
                            onClick={handleComenzarSecuencial}
                            variant="contained"
                            color="success"
                            size="small"
                            disabled={contactosOrdenados.length === 0}
                            sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                        >
                            Comenzar
                        </Button>
                    </Box>
                    </Stack>
                </Paper>

                {/* ── Filtros colapsables (desktop) ── */}
                <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                        icon={<FilterListIcon sx={{ fontSize: 16 }} />}
                        label={`Filtros${nFiltrosActivos > 0 ? ` (${nFiltrosActivos})` : ''}`}
                        size="small"
                        color={nFiltrosActivos > 0 ? 'primary' : 'default'}
                        variant={filtrosExpandidos ? 'filled' : 'outlined'}
                        onClick={() => setFiltrosExpandidos(v => !v)}
                        sx={{ fontWeight: 600 }}
                    />
                    {nFiltrosActivos > 0 && (
                        <Chip label="Limpiar" size="small" variant="outlined" onClick={handleLimpiarFiltros} sx={{ color: 'text.secondary' }} />
                    )}
                </Stack>
                <Collapse in={filtrosExpandidos}>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="flex-end">
                            <TextField type="date" size="small" label="Próx. desde" value={filtroFechaDesde}
                                onChange={(e) => { setFiltroFechaDesde(e.target.value); setFiltroSinFecha(false); }}
                                InputLabelProps={{ shrink: true }} sx={{ width: 155 }} />
                            <TextField type="date" size="small" label="Próx. hasta" value={filtroFechaHasta}
                                onChange={(e) => { setFiltroFechaHasta(e.target.value); setFiltroSinFecha(false); }}
                                InputLabelProps={{ shrink: true }} sx={{ width: 155 }} />
                            <FormControlLabel
                                control={<Checkbox size="small" checked={filtroSinFecha} onChange={(e) => { setFiltroSinFecha(e.target.checked); if (e.target.checked) { setFiltroFechaDesde(''); setFiltroFechaHasta(''); } }} />}
                                label={<Typography variant="body2">Sin fecha</Typography>}
                                sx={{ m: 0, alignSelf: 'center' }}
                            />
                            <TextField type="date" size="small" label="Inicio desde" value={filtroCreatedDesde}
                                onChange={(e) => setFiltroCreatedDesde(e.target.value)}
                                InputLabelProps={{ shrink: true }} sx={{ width: 155 }} />
                            <TextField type="date" size="small" label="Inicio hasta" value={filtroCreatedHasta}
                                onChange={(e) => setFiltroCreatedHasta(e.target.value)}
                                InputLabelProps={{ shrink: true }} sx={{ width: 155 }} />
                        </Stack>

                        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="flex-end">
                            {/* Estado — multi-select OR */}
                            <FormControl size="small" sx={{ minWidth: 175 }}>
                                <InputLabel>Estado</InputLabel>
                                <Select
                                    multiple
                                    value={filtroEstados}
                                    label="Estado"
                                    onChange={(e) => setFiltroEstados(e.target.value)}
                                    renderValue={(sel) => sel.length === 0 ? '' : `${sel.length} estado(s)`}
                                >
                                    {[
                                        { key: 'nuevo', label: 'Nuevo' },
                                        { key: 'contactado', label: 'Contactado' },
                                        { key: 'calificado', label: 'Calificado' },
                                        { key: 'cierre', label: 'En Cierre' },
                                        { key: 'ganado', label: 'Ganado' },
                                        { key: 'no_contacto', label: 'No Contacto' },
                                        { key: 'no_responde', label: 'No Responde' },
                                        { key: 'revisar_mas_adelante', label: 'Revisar' },
                                        { key: 'no_califica', label: 'No Califica' },
                                        { key: 'perdido', label: 'Perdido' },
                                    ].map(({ key, label }) => (
                                        <MenuItem key={key} value={key}>
                                            <Checkbox size="small" checked={filtroEstados.includes(key)} />
                                            {label} ({contarPorEstado(key)})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 155 }}>
                                <InputLabel>Actividad</InputLabel>
                                <Select value={filtroActividad} label="Actividad" onChange={(e) => setFiltroActividad(e.target.value)}>
                                    <MenuItem value="">Todas</MenuItem>
                                    <MenuItem value="sin_actividad">🆕 Sin actividad</MenuItem>
                                    <MenuItem value="con_llamadas_no_atendidas">📵 No atendidas</MenuItem>
                                    <MenuItem value="con_llamadas_atendidas">📞 Atendidas</MenuItem>
                                    <MenuItem value="sin_llamadas">📴 Sin llamadas</MenuItem>
                                    <MenuItem value="con_mensajes">💬 Mensajes</MenuItem>
                                    <MenuItem value="con_reuniones">📅 Con reuniones</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                                <InputLabel>Bot</InputLabel>
                                <Select value={filtroCalificadoBot} label="Bot" onChange={(e) => setFiltroCalificadoBot(e.target.value)}>
                                    <MenuItem value="">Todos</MenuItem>
                                    <MenuItem value="calificado">🤖 Calificado</MenuItem>
                                    <MenuItem value="no_calificado">No calificado</MenuItem>
                                    <MenuItem value="quiere_meet">🤝 Quiere meet</MenuItem>
                                    <MenuItem value="no_llego">No llegó</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 130 }}>
                                <InputLabel>Reunión</InputLabel>
                                <Select value={filtroQuiereReunion} label="Reunión" onChange={(e) => setFiltroQuiereReunion(e.target.value)}>
                                    <MenuItem value="">Todos</MenuItem>
                                    <MenuItem value="si">📅 Quiere</MenuItem>
                                    <MenuItem value="no">No quiere</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                                <InputLabel>Próx. tarea</InputLabel>
                                <Select value={filtroProximaTarea} label="Próx. tarea" onChange={(e) => setFiltroProximaTarea(e.target.value)}>
                                    <MenuItem value="">Todas</MenuItem>
                                    <MenuItem value="sin_tarea">Sin tarea</MenuItem>
                                    <MenuItem value="llamada">📞 Llamada</MenuItem>
                                    <MenuItem value="whatsapp">💬 WhatsApp</MenuItem>
                                    <MenuItem value="email">✉️ Email</MenuItem>
                                    <MenuItem value="recordatorio">📝 Recordatorio</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Segmento</InputLabel>
                                <Select value={filtroSegmento} label="Segmento" onChange={(e) => setFiltroSegmento(e.target.value)}>
                                    <MenuItem value="">Todos</MenuItem>
                                    <MenuItem value="inbound">🔵 Inbound</MenuItem>
                                    <MenuItem value="outbound">🟠 Outbound</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Opt-out</InputLabel>
                                <Select value={filtroOptOut} label="Opt-out" onChange={(e) => setFiltroOptOut(e.target.value)}>
                                    <MenuItem value="">Todos</MenuItem>
                                    <MenuItem value="si">🔇 Solo opt-out</MenuItem>
                                    <MenuItem value="no">✅ Sin opt-out</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 165 }}>
                                <InputLabel>Llamada exitosa</InputLabel>
                                <Select value={filtroLlamadaExitosa} label="Llamada exitosa" onChange={(e) => setFiltroLlamadaExitosa(e.target.value)}>
                                    <MenuItem value="">Todas</MenuItem>
                                    <MenuItem value="si">📞 Con llamada exitosa</MenuItem>
                                    <MenuItem value="no">📵 Sin llamada exitosa</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControlLabel
                                control={<Checkbox size="small" checked={filtroExcluirConReunion} onChange={(e) => setFiltroExcluirConReunion(e.target.checked)} />}
                                label={<Typography variant="body2">🚫 Excluir c/reunión</Typography>}
                                sx={{ m: 0, alignSelf: 'center' }}
                            />
                            <FormControlLabel
                                control={<Checkbox size="small" checked={filtroSoloCompromisos} onChange={(e) => setFiltroSoloCompromisos(e.target.checked)} />}
                                label={<Typography variant="body2">🔔 Solo compromisos</Typography>}
                                sx={{ m: 0, alignSelf: 'center' }}
                            />
                            {nFiltrosActivos > 0 && (
                                <Button size="small" variant="outlined" color="inherit" onClick={handleLimpiarFiltros} sx={{ ml: 'auto', color: 'text.secondary', borderColor: 'divider', whiteSpace: 'nowrap' }}>
                                    Limpiar filtros
                                </Button>
                            )}
                        </Stack>
                    </Paper>
                </Collapse>

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
                                <Button
                                    size="small"
                                    onClick={() => handleToggleFollowUpMasivo(false)}
                                    disabled={actionLoading}
                                >
                                    ⏹ Follow-Up Off
                                </Button>
                                <Button
                                    size="small"
                                    onClick={() => handleToggleFollowUpMasivo(true)}
                                    disabled={actionLoading}
                                >
                                    ▶️ Follow-Up On
                                </Button>
                                <Button
                                    size="small"
                                    startIcon={<CalculateIcon />}
                                    onClick={async () => {
                                        setActionLoading(true);
                                        try {
                                            const res = await SDRService.recalcularContadores(seleccionados);
                                            setSnackbar({ open: true, message: `Contadores recalculados: ${res.exitosos} OK${res.fallidos > 0 ? `, ${res.fallidos} error(es)` : ''}`, severity: res.fallidos === 0 ? 'success' : 'warning' });
                                            cargarContactos();
                                        } catch (err) {
                                            setSnackbar({ open: true, message: 'Error al recalcular contadores', severity: 'error' });
                                        } finally {
                                            setActionLoading(false);
                                        }
                                    }}
                                    disabled={actionLoading}
                                >
                                    Recalcular contadores
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
                        <FormControl size="small" sx={{ minWidth: 160, flexShrink: 0 }}>
                            <InputLabel>Ordenar por</InputLabel>
                            <Select value={ordenarPor} label="Ordenar por" onChange={(e) => handleOrdenPredefinidoChange(e.target.value)}>
                                <MenuItem value="">Por defecto</MenuItem>
                                <MenuItem value="vencidos">Vencidos primero</MenuItem>
                                <MenuItem value="createdAt">Más nuevos</MenuItem>
                                <MenuItem value="ultimaAccion">Última actividad</MenuItem>
                                <MenuItem value="estado">Estado</MenuItem>
                                <MenuItem value="prioridad">Prioridad</MenuItem>
                            </Select>
                        </FormControl>
                        <Tooltip title="Mostrar/ocultar columnas">
                            <IconButton size="small" onClick={(e) => setAnchorColumnas(e.currentTarget)} color={Object.values(columnasVisibles).some(v => !v) ? 'primary' : 'default'}>
                                <ViewColumnIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Popover
                            open={Boolean(anchorColumnas)}
                            anchorEl={anchorColumnas}
                            onClose={() => setAnchorColumnas(null)}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        >
                            <Box sx={{ p: 2, minWidth: 240 }}>
                                <Typography variant="subtitle2" gutterBottom>Columnas visibles y orden</Typography>
                                {columnasOrden.map((key, idx) => (
                                    <Stack key={key} direction="row" alignItems="center" spacing={0.5} sx={{ py: 0.2 }}>
                                        <IconButton
                                            size="small"
                                            disabled={idx === 0}
                                            onClick={() => setColumnasOrden(prev => {
                                                const arr = [...prev];
                                                [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                                                return arr;
                                            })}
                                            sx={{ p: 0.3 }}
                                        >
                                            <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            disabled={idx === columnasOrden.length - 1}
                                            onClick={() => setColumnasOrden(prev => {
                                                const arr = [...prev];
                                                [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                                                return arr;
                                            })}
                                            sx={{ p: 0.3 }}
                                        >
                                            <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={columnasVisibles[key] ?? true}
                                                    onChange={() => setColumnasVisibles(prev => ({ ...prev, [key]: !prev[key] }))}
                                                />
                                            }
                                            label={<Typography variant="body2">{COLUMNAS_LABELS[key]}</Typography>}
                                            sx={{ flex: 1, m: 0 }}
                                        />
                                    </Stack>
                                ))}
                                <Button
                                    size="small"
                                    onClick={() => { setColumnasOrden(DEFAULT_COLUMNAS_ORDEN); setColumnasVisibles(DEFAULT_COLUMNAS); }}
                                    sx={{ mt: 1, textTransform: 'none' }}
                                    fullWidth
                                >
                                    Restablecer
                                </Button>
                            </Box>
                        </Popover>
                    </Stack>
                </Paper>

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
                                    <TableCell sx={{ minWidth: 160 }}>
                                        <TableSortLabel
                                            active={ordenarPor === 'nombre'}
                                            direction={ordenarPor === 'nombre' ? ordenDir : 'asc'}
                                            onClick={() => handleSortHeader('nombre')}
                                        >
                                            Nombre
                                        </TableSortLabel>
                                    </TableCell>
                                    {columnasOrden.filter(k => columnasVisibles[k]).map(key => {
                                        const SORT_CAMPOS = { estado: 'estado', prioridad: 'prioridadScore', fechaAdded: 'createdAt', ultimaAccion: 'ultimaAccion', proximoContacto: 'proximoContacto' };
                                        const MIN_WIDTHS = { empresa: 100, estado: 100, calificado: 80, reunion: 70, plan: 90, prioridad: 60, actividad: 90, proximaTarea: 110, fechaAdded: 70, ultimaAccion: 90, proximoContacto: 90 };
                                        const sortCampo = SORT_CAMPOS[key];
                                        return (
                                            <TableCell key={key} sx={{ minWidth: MIN_WIDTHS[key] || 80 }}>
                                                {sortCampo ? (
                                                    <TableSortLabel
                                                        active={ordenarPor === sortCampo}
                                                        direction={ordenarPor === sortCampo ? ordenDir : 'asc'}
                                                        onClick={() => handleSortHeader(sortCampo)}
                                                    >
                                                        {COLUMNAS_LABELS[key]}
                                                    </TableSortLabel>
                                                ) : COLUMNAS_LABELS[key]}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {contactosOrdenados.map((contacto) => {
                                    const proximo = formatearProximo(contacto.proximoContacto);
                                    const vencido = estaVencido(contacto);
                                    const seleccionado = seleccionados.includes(contacto._id);
                                    const esCalificado = contacto.precalificacionBot === 'calificado' || contacto.precalificacionBot === 'quiere_meet';
                                    const quiereReunion = contacto.precalificacionBot === 'quiere_meet';
                                    const reunFechaD = (bandejaActiva === 'reunionesPendientes' || bandejaActiva === 'reunionesPasadas') && contacto.proximaReunion?.fecha ? new Date(contacto.proximaReunion.fecha) : null;
                                    const reunEsHoyD = reunFechaD && new Date().toDateString() === reunFechaD.toDateString();
                                    const reunEsPasadaD = reunFechaD && reunFechaD < new Date() && !reunEsHoyD;
                                    
                                    return (
                                        <TableRow 
                                            key={contacto._id}
                                            hover
                                            selected={seleccionado}
                                            sx={{ 
                                                cursor: 'pointer',
                                                bgcolor: reunEsHoyD ? 'warning.50' : reunEsPasadaD ? 'error.50' : (contacto.proximaTarea?.estricto && vencido) ? '#fff3e0' : vencido ? 'error.50' : (seleccionado ? 'primary.50' : 'inherit'),
                                                borderLeft: reunEsHoyD ? '3px solid #ff9800' : (contacto.proximaTarea?.estricto && vencido) ? '3px solid #ff9800' : 'none'
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
                                                    <Tooltip title="Abrir en nueva pestaña">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => { e.stopPropagation(); window.open(`/sdr/contacto/${contacto._id}`, '_blank'); }}
                                                            sx={{ p: 0.3, color: 'action.active' }}
                                                        >
                                                            <OpenInNewIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Typography variant="body2" fontWeight={contacto.estado === 'nuevo' ? 600 : 400}>
                                                        {contacto.nombre}
                                                    </Typography>
                                                    {contacto.optOutWhatsApp && (
                                                        <Tooltip title="Opt-out: pidió no recibir más mensajes">
                                                            <span style={{ fontSize: '0.85rem', cursor: 'default' }}>🔇</span>
                                                        </Tooltip>
                                                    )}
                                                    {contacto.segmento && (
                                                        <Chip 
                                                            size="small" 
                                                            label={contacto.segmento === 'inbound' ? 'In' : 'Out'}
                                                            variant="outlined"
                                                            color={contacto.segmento === 'inbound' ? 'info' : 'warning'}
                                                            sx={{ height: 18, fontSize: '0.6rem' }}
                                                        />
                                                    )}
                                                    {contacto.ab_test_variante && (
                                                        <Chip
                                                            size="small"
                                                            label={`AB:${contacto.ab_test_variante}`}
                                                            color={contacto.ab_test_variante === 'B' ? 'secondary' : 'default'}
                                                            variant="outlined"
                                                            sx={{ height: 18, fontSize: '0.6rem' }}
                                                        />
                                                    )}
                                                    {contacto.datosBot?.agendarClickeado && (
                                                        <Tooltip title="Tocó el link de agendar reunión">
                                                            <Chip
                                                                size="small"
                                                                label="📅"
                                                                color="success"
                                                                variant="outlined"
                                                                sx={{ height: 18, fontSize: '0.6rem' }}
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </Stack>
                                                {contacto.empresa && (
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        {contacto.empresa}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            {columnasOrden.filter(k => columnasVisibles[k]).map(key => {
                                                switch (key) {
                                                    case 'empresa': return <TableCell key={key}><Typography variant="caption">{contacto.telefono}</Typography></TableCell>;
                                                    case 'estado': return <TableCell key={key}><EstadoChip estado={contacto.estado} quiereReunion={contacto.quiereReunion} /></TableCell>;
                                                    case 'calificado': return <TableCell key={key}>
                                                        {esCalificado ? (
                                                            <Chip size="small" label="✅ Sí" color="success" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                                                        ) : contacto.precalificacionBot === 'no_llego' ? (
                                                            <Chip size="small" label="No llegó" color="default" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                                                        ) : (
                                                            <Typography variant="caption" color="text.secondary">—</Typography>
                                                        )}
                                                    </TableCell>;
                                                    case 'reunion': return <TableCell key={key}>
                                                        {quiereReunion ? (
                                                            <Chip size="small" label="📅 Sí" color="primary" variant="filled" sx={{ height: 22, fontSize: '0.7rem' }} />
                                                        ) : (
                                                            <Typography variant="caption" color="text.secondary">—</Typography>
                                                        )}
                                                    </TableCell>;
                                                    case 'plan': return <TableCell key={key}>
                                                        {contacto.planEstimado ? (
                                                            <Chip size="small" label={`${PLANES_SORBY[contacto.planEstimado]?.icon || ''} ${PLANES_SORBY[contacto.planEstimado]?.label || contacto.planEstimado}`} color={PLANES_SORBY[contacto.planEstimado]?.color || 'default'} variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                                                        ) : (
                                                            <Typography variant="caption" color="text.secondary">—</Typography>
                                                        )}
                                                    </TableCell>;
                                                    case 'prioridad': return <TableCell key={key}>
                                                        {contacto.prioridadScore > 0 ? (
                                                            <Chip size="small" label={contacto.prioridadScore} color={contacto.prioridadScore >= 70 ? 'error' : contacto.prioridadScore >= 40 ? 'warning' : 'default'} variant="filled" sx={{ height: 22, fontWeight: 700 }} />
                                                        ) : (
                                                            <Typography variant="caption" color="text.secondary">—</Typography>
                                                        )}
                                                    </TableCell>;
                                                    case 'actividad': return <TableCell key={key}><ContadoresActividad contadores={contacto.contadores} size="small" /></TableCell>;
                                                    case 'proximaTarea': return <TableCell key={key}>
                                                        {proximo ? (
                                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                                <Typography sx={{ fontSize: 12 }}>
                                                                    {contacto.proximaTarea?.estricto ? '🔔' : (contacto.proximaTarea?.tipo === 'llamada' ? '📞' : contacto.proximaTarea?.tipo === 'whatsapp' ? '💬' : contacto.proximaTarea?.tipo === 'email' ? '✉️' : '📅')}
                                                                </Typography>
                                                                <Chip size="small" label={`${contacto.proximaTarea?.tipo === 'llamada' ? 'Llamada' : contacto.proximaTarea?.tipo === 'whatsapp' ? 'WhatsApp' : contacto.proximaTarea?.tipo === 'email' ? 'Email' : 'Tarea'} · ${proximo.texto}`} color={contacto.proximaTarea?.estricto ? 'warning' : proximo.color} variant={contacto.proximaTarea?.estricto ? 'filled' : 'outlined'} />
                                                            </Stack>
                                                        ) : '-'}
                                                    </TableCell>;
                                                    case 'fechaAdded': return <TableCell key={key}>
                                                        <Tooltip title={contacto.createdAt ? new Date(contacto.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}>
                                                            <Typography variant="caption" color="text.secondary">{formatearFechaCorta(contacto.createdAt)}</Typography>
                                                        </Tooltip>
                                                    </TableCell>;
                                                    case 'ultimaAccion': return <TableCell key={key}>
                                                        <Tooltip title={contacto.ultimaAccion ? new Date(contacto.ultimaAccion).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}>
                                                            <Typography variant="caption" color="text.secondary">{formatearRelativo(contacto.ultimaAccion)}</Typography>
                                                        </Tooltip>
                                                    </TableCell>;
                                                    case 'proximoContacto': return <TableCell key={key}>
                                                        <Tooltip title={contacto.proximaTarea?.fecha ? new Date(contacto.proximaTarea.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}>
                                                            <Typography variant="caption" color={contacto.proximaTarea?.fecha && new Date(contacto.proximaTarea.fecha) < new Date() ? 'error.main' : 'text.secondary'}>
                                                                {contacto.proximaTarea?.fecha ? (
                                                                    <>{formatearRelativo(contacto.proximaTarea.fecha)}{contacto.proximaTarea?.estricto && ' 🔔'}</>
                                                                ) : '—'}
                                                            </Typography>
                                                        </Tooltip>
                                                    </TableCell>;
                                                    case 'fechaReunion': {
                                                        const r = contacto.proximaReunion;
                                                        const fd = r?.fecha ? new Date(r.fecha) : null;
                                                        const esHoyFd = fd && new Date().toDateString() === fd.toDateString();
                                                        const esPasadaFd = fd && fd < new Date() && !esHoyFd;
                                                        return <TableCell key={key}>
                                                            <Typography variant="body2" fontWeight={esHoyFd ? 700 : 400} color={esHoyFd ? 'warning.dark' : esPasadaFd ? 'error.main' : 'text.primary'}>
                                                                {fd ? fd.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '—'}
                                                            </Typography>
                                                        </TableCell>;
                                                    }
                                                    case 'horaReunion': return <TableCell key={key}>
                                                        <Typography variant="body2">{contacto.proximaReunion?.hora || '—'}</Typography>
                                                    </TableCell>;
                                                    case 'linkReunion': return <TableCell key={key}>
                                                        {contacto.proximaReunion?.link ? (
                                                            <Button size="small" variant="outlined" startIcon={<LinkIcon />} href={contacto.proximaReunion.link} target="_blank"
                                                                onClick={(e) => e.stopPropagation()}
                                                                sx={{ textTransform: 'none', fontSize: '0.75rem' }}>Unirse</Button>
                                                        ) : contacto.proximaReunion?.lugar ? (
                                                            <Typography variant="body2" color="text.secondary">{contacto.proximaReunion.lugar}</Typography>
                                                        ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                                                    </TableCell>;
                                                    case 'resultadoReunion': return <TableCell key={key}>
                                                        {contacto.proximaReunion?.estadoReunion ? (
                                                            <Chip size="small"
                                                                label={contacto.proximaReunion.estadoReunion === 'realizada' ? 'Realizada' : contacto.proximaReunion.estadoReunion === 'no_show' ? 'No show' : contacto.proximaReunion.estadoReunion === 'cancelada' ? 'Cancelada' : 'Vencida'}
                                                                color={contacto.proximaReunion.estadoReunion === 'realizada' ? 'success' : contacto.proximaReunion.estadoReunion === 'no_show' ? 'error' : 'warning'}
                                                                variant="outlined" sx={{ fontSize: '0.7rem' }}
                                                            />
                                                        ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                                                    </TableCell>;
                                                    default: return null;
                                                }
                                            })}
                                        </TableRow>
                                    );
                                })}
                                {contactosOrdenados.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2 + Object.values(columnasVisibles).filter(Boolean).length} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">
                                                {bandejaActiva === 'reunionesPasadas' ? 'No hay reuniones pasadas' :
                                                 bandejaActiva === 'reunionesPendientes' ? 'No hay reuniones pendientes' :
                                                 filtroEstados.length > 0 ? `No hay contactos con estado "${filtroEstados.join(', ')}"` : 'No tienes contactos asignados'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </Paper>

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

            {/* Modal Config Prompt IA */}
            <Dialog open={modalConfigPrompt} onClose={() => setModalConfigPrompt(false)} maxWidth="md" fullWidth>
                <DialogTitle>Configurar Prompts IA</DialogTitle>
                <DialogContent>
                    {[
                        { key: 'audio', icon: '🎙️', label: 'Prompt para análisis de audio grabado', desc: 'Instrucciones que recibe la IA al analizar audios grabados. Dejá vacío para usar el prompt por defecto.' },
                        { key: 'transcripcion', icon: '📝', label: 'Prompt para transcripción de reuniones', desc: 'Instrucciones que recibe la IA al analizar transcripciones de reuniones. Los datos del contacto y la transcripción se agregan automáticamente. Dejá vacío para usar el prompt por defecto.' },
                        { key: 'resumen', icon: '📊', label: 'Prompt para resumen ejecutivo del contacto', desc: 'Instrucciones para generar el resumen IA del contacto (tab "Resumen IA"). Los datos del contacto, historial y reuniones se agregan automáticamente. Dejá vacío para usar el prompt por defecto.' }
                    ].map(({ key, icon, label, desc }, idx) => (
                        <Fragment key={key}>
                            {idx > 0 && <Divider sx={{ my: 2 }} />}
                            <Typography variant="subtitle2" sx={{ mb: 1, mt: idx === 0 ? 1 : 0 }}>
                                {icon} {label}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {desc}
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={6}
                                value={promptConfigs[key].custom}
                                onChange={(e) => setPromptConfigs(prev => ({ ...prev, [key]: { ...prev[key], custom: e.target.value } }))}
                                placeholder={promptConfigs[key].default || 'Cargando prompt por defecto...'}
                                sx={{ fontFamily: 'monospace', fontSize: '0.85rem', mb: 1 }}
                            />
                            {promptConfigs[key].custom && (
                                <Button 
                                    size="small" 
                                    onClick={() => setPromptConfigs(prev => ({ ...prev, [key]: { ...prev[key], custom: '' } }))}
                                    sx={{ mb: idx < 2 ? 2 : 0 }}
                                >
                                    Restaurar prompt por defecto
                                </Button>
                            )}
                        </Fragment>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalConfigPrompt(false)}>Cancelar</Button>
                    <Button 
                        variant="contained" 
                        disabled={loadingConfig}
                        onClick={async () => {
                            setLoadingConfig(true);
                            try {
                                await SDRService.actualizarConfig({ 
                                    empresaId, 
                                    promptAudioResumen: promptConfigs.audio.custom || null,
                                    promptTranscripcionReunion: promptConfigs.transcripcion.custom || null,
                                    promptResumenContacto: promptConfigs.resumen.custom || null
                                });
                                setSnackbar({ open: true, message: 'Prompts actualizados', severity: 'success' });
                                setModalConfigPrompt(false);
                            } catch (err) {
                                setSnackbar({ open: true, message: 'Error guardando prompts', severity: 'error' });
                            } finally {
                                setLoadingConfig(false);
                            }
                        }}
                    >
                        {loadingConfig ? <CircularProgress size={20} /> : 'Guardar'}
                    </Button>
                </DialogActions>
            </Dialog>

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
                            { value: 'no_contacto', label: 'No Contactado', color: 'inherit' },
                            { value: 'no_responde', label: 'No Responde', color: 'inherit' },
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
                            Se guardarán los filtros actuales: estado, tipo, próximo contacto, búsqueda y columnas visibles.
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