import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import {
    Box, Container, Paper, Stack, Typography, Button, TextField, MenuItem,
    Select, FormControl, InputLabel, Tabs, Tab, Card, CardContent, Grid,
    Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer, TableSortLabel,
    Checkbox, Alert, Snackbar, CircularProgress, Avatar, Divider,
    InputAdornment, LinearProgress, useMediaQuery, useTheme, Fab, Badge, Collapse, Menu
} from '@mui/material';

// Firebase
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from 'src/config/firebase';

// Icons
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import GroupsIcon from '@mui/icons-material/Groups';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import DeleteIcon from '@mui/icons-material/Delete';
import PhoneMissedIcon from '@mui/icons-material/PhoneMissed';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FilterListIcon from '@mui/icons-material/FilterList';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import CancelIcon from '@mui/icons-material/Cancel';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import SDRService from 'src/services/sdrService';
import { useAuthContext } from 'src/contexts/auth-context';
import * as XLSX from 'xlsx';

// Componente compartido del Drawer
import DrawerDetalleContactoSDR, { EstadoChip } from 'src/components/sdr/DrawerDetalleContactoSDR';
import ModalCrearReunion from 'src/components/sdr/ModalCrearReunion';
import { ESTADOS_CONTACTO as ESTADOS_SDR, ESTADOS_REUNION, PLANES_SORBY, PRECALIFICACION_BOT, INTENCIONES_COMPRA } from 'src/constant/sdrConstants';
import SortIcon from '@mui/icons-material/Sort';

// ==================== CONSTANTES ====================

// Mapear formato de sdrConstants a formato local (solo label + color, sin icon)
const ESTADOS_CONTACTO = Object.fromEntries(
    Object.entries(ESTADOS_SDR).map(([key, val]) => [key, { label: val.label, color: val.color }])
);

const TAMANOS_EMPRESA = ['1-10', '11-50', '51-200', '200+'];

// ==================== COMPONENTES AUXILIARES ====================

const MetricCard = ({ title, value, icon, color = 'primary', subtitle, onClick }) => (
    <Card sx={{ height: '100%', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
        <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                    <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 600 }}>
                        {title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: `${color}.main` }}>
                        {value}
                    </Typography>
                    {subtitle && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 48, height: 48 }}>
                    {icon}
                </Avatar>
            </Stack>
        </CardContent>
    </Card>
);

// Acciones rápidas para la tabla
const AccionesRapidas = ({ contacto, onAccion, loading }) => (
    <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
        <Tooltip title="Llamada atendida">
            <IconButton size="small" color="success" disabled={loading} onClick={() => onAccion(contacto, 'llamada', true)}>
                <PhoneIcon fontSize="small" />
            </IconButton>
        </Tooltip>
        <Tooltip title="Llamada no atendida">
            <IconButton size="small" color="warning" disabled={loading} onClick={() => onAccion(contacto, 'llamada', false)}>
                <PhoneMissedIcon fontSize="small" />
            </IconButton>
        </Tooltip>
        <Tooltip title="WhatsApp enviado">
            <IconButton size="small" color="success" disabled={loading} onClick={() => onAccion(contacto, 'whatsapp')}>
                <WhatsAppIcon fontSize="small" />
            </IconButton>
        </Tooltip>
        <Tooltip title="Agendar reunión">
            <IconButton size="small" color="primary" disabled={loading} onClick={() => onAccion(contacto, 'reunion')}>
                <EventIcon fontSize="small" />
            </IconButton>
        </Tooltip>
        <Tooltip title="No responde">
            <IconButton size="small" disabled={loading} onClick={() => onAccion(contacto, 'no_responde')}>
                <DoNotDisturbIcon fontSize="small" />
            </IconButton>
        </Tooltip>
    </Stack>
);

// ==================== PÁGINA GESTIÓN SDR (LÍDER/MANAGER) ====================

const GestionSDRPage = () => {
    // Estado de la aplicación
    const [tabActual, setTabActual] = useState(0);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    
    // Datos
    const [contactos, setContactos] = useState([]);
    const [totalContactos, setTotalContactos] = useState(0);
    const [reuniones, setReuniones] = useState([]);
    const [metricas, setMetricas] = useState(null);
    const [contactoSeleccionado, setContactoSeleccionado] = useState(null);
    const [contactosSeleccionados, setContactosSeleccionados] = useState([]);
    
    // Filtros
    const [filtros, setFiltros] = useState({
        estado: '',
        sdrAsignado: '',
        busqueda: '',
        soloSinAsignar: false,
        statusNotion: '',
        precalificacionBot: '',
        planEstimado: '',
        intencionCompra: '',
        segmento: '',
        proximoContactoHoy: false,
        ordenarPor: 'updatedAt',
        ordenDir: 'desc'
    });
    const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);
    const [page, setPage] = useState(1);
    const [historialVersion, setHistorialVersion] = useState(0);
    
    // Lista única de Status Notion disponibles (se llena al cargar contactos)
    const [statusNotionOpciones, setStatusNotionOpciones] = useState([]);
    
    // Lista de SDRs disponibles para filtro
    const [sdrsDisponibles, setSdrsDisponibles] = useState([]);
    
    // Navegación de contactos
    const [indiceContactoActual, setIndiceContactoActual] = useState(-1);
    
    // Theme para responsive
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    // Modales
    const [modalCrear, setModalCrear] = useState(false);
    const [modalDetalle, setModalDetalle] = useState(false);
    const [modalImportar, setModalImportar] = useState(false);
    const [modalAsignar, setModalAsignar] = useState(false);
    const [modalEvaluar, setModalEvaluar] = useState({ open: false, reunion: null });
    const [modalAgregarSDR, setModalAgregarSDR] = useState(false);
    const [modalReunion, setModalReunion] = useState(false);
    const [modalNota, setModalNota] = useState({ open: false, contacto: null, tipo: '', atendida: null });
    const [modalEditarReunion, setModalEditarReunion] = useState({ open: false, reunion: null });
    
    // Estado para importación
    const [importTab, setImportTab] = useState(0);
    const [importPreview, setImportPreview] = useState([]);
    const [importLoading, setImportLoading] = useState(false);
    const [notionDbId, setNotionDbId] = useState('Outbound');
    const [contactosNotion, setContactosNotion] = useState([]);
    const [schemaNotion, setSchemaNotion] = useState(null);
    
    // Obtener usuario del contexto de auth
    const { user, isLoading: authLoading } = useAuthContext();
    const router = useRouter();
    const userId = user?.id || user?.user_id;
    const empresaId = user?.empresa?.id || 'demo-empresa';
    // Usar user_id del perfil (que es el Firebase UID guardado en Firestore)
    const sdrId = user?.user_id;
    const sdrNombre = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'SDR';
    
    // Control de carga inicial
    const initialLoadDone = useRef(false);
    const prevFilters = useRef({ page: 1, filtros: {} });
    
    // Abrir contacto en página dedicada
    const handleAbrirContacto = (contacto, idx) => {
        try {
            const ids = contactos.map(c => c._id);
            sessionStorage.setItem('sdr_contacto_ids', JSON.stringify(ids));
        } catch { /* ignore */ }
        router.push(`/sdr/contacto/${contacto._id}`);
    };
    
    // ==================== CARGA DE DATOS ====================
    
    const cargarContactos = async () => {
        if (!userId) return;
        
        setLoading(true);
        try {
            const params = {
                page,
                limit: 50,
                ...filtros
            };
            
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === false) delete params[key];
            });
            
            const data = await SDRService.listarContactos(params);
            setContactos(data.contactos);
            setTotalContactos(data.total);
            
            // Extraer los statusNotion únicos de los contactos para el filtro
            const statusUnicos = [...new Set(
                data.contactos
                    .map(c => c.statusNotion)
                    .filter(Boolean)
            )].sort();
            setStatusNotionOpciones(prev => {
                // Combinar con los anteriores para no perder opciones al paginar
                const combined = [...new Set([...prev, ...statusUnicos])].sort();
                return combined;
            });
        } catch (error) {
            console.error('Error cargando contactos:', error);
            mostrarSnackbar('Error al cargar contactos', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const cargarReuniones = async () => {
        if (!userId) return;
        
        try {
            const data = await SDRService.listarReuniones({ estado: 'agendada' });
            const ordenadas = (data.reuniones || []).sort((a, b) => {
                const fa = new Date(a.fecha || a.fechaHora || 0);
                const fb = new Date(b.fecha || b.fechaHora || 0);
                return fa - fb;
            });
            setReuniones(ordenadas);
        } catch (error) {
            console.error('Error cargando reuniones:', error);
        }
    };
    
    const cargarMetricas = async () => {
        if (!userId) return;
        
        try {
            const data = await SDRService.obtenerMetricasDiarias();
            setMetricas(data);
        } catch (error) {
            console.error('Error cargando métricas:', error);
        }
    };
    
    // Cargar SDRs disponibles para el filtro
    useEffect(() => {
        if (authLoading || !userId) return;
        const fetchSDRs = async () => {
            try {
                const snapshot = await getDocs(query(
                    collection(db, 'profile'),
                    where('sdr', '==', true)
                ));
                const sdrs = snapshot.docs
                    .filter(doc => doc.data().user_id)
                    .map(doc => {
                        const data = doc.data();
                        return {
                            id: data.user_id,
                            nombre: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email
                        };
                    });
                setSdrsDisponibles(sdrs);
            } catch (error) {
                console.error('Error cargando SDRs para filtro:', error);
            }
        };
        fetchSDRs();
    }, [authLoading, userId]);

    // Resetear página a 1 cuando cambian los filtros
    useEffect(() => {
        setPage(1);
    }, [filtros.estado, filtros.sdrAsignado, filtros.busqueda, filtros.soloSinAsignar, filtros.statusNotion, filtros.precalificacionBot, filtros.planEstimado, filtros.intencionCompra, filtros.segmento, filtros.proximoContactoHoy]);
    
    // Cargar datos cuando el usuario esté listo
    useEffect(() => {
        if (authLoading || !userId) return;
        
        if (!initialLoadDone.current) {
            initialLoadDone.current = true;
            cargarContactos();
            cargarReuniones();
            cargarMetricas();
            prevFilters.current = { page, filtros: JSON.stringify(filtros) };
            return;
        }
        
        const currentFilters = JSON.stringify(filtros);
        if (page !== prevFilters.current.page || currentFilters !== prevFilters.current.filtros) {
            prevFilters.current = { page, filtros: currentFilters };
            cargarContactos();
        }
    }, [authLoading, userId, page, filtros]);
    
    // ==================== HELPERS ====================
    
    const mostrarSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };
    
    const refrescar = () => {
        cargarContactos();
        cargarReuniones();
        cargarMetricas();
    };
    
    // ==================== ACCIONES ====================
    
    const handleCrearContacto = async (data) => {
        try {
            await SDRService.crearContacto({ ...data, empresaId });
            mostrarSnackbar('Contacto creado correctamente');
            setModalCrear(false);
            cargarContactos();
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error al crear contacto', 'error');
        }
    };
    
    const handleAccion = (contacto, tipo, atendida = null) => {
        if (tipo === 'reunion') {
            setContactoSeleccionado(contacto);
            setModalReunion(true);
        } else if (tipo === 'no_responde') {
            handleMarcarNoResponde(contacto);
        } else {
            setModalNota({ open: true, contacto, tipo, atendida });
        }
    };
    
    const handleRegistrarIntento = async (nota = '') => {
        const { contacto, tipo, atendida } = modalNota;
        setActionLoading(true);
        try {
            await SDRService.registrarIntento(contacto._id, {
                tipo: tipo === 'llamada' ? (atendida ? 'llamada_atendida' : 'llamada_no_atendida') : 'whatsapp_enviado',
                canal: tipo === 'llamada' ? 'llamada' : 'whatsapp',
                resultado: tipo === 'llamada' ? (atendida ? 'atendio' : 'no_atendio') : undefined,
                nota,
                empresaId
            });
            mostrarSnackbar(tipo === 'llamada' 
                ? (atendida ? 'Llamada atendida registrada' : 'Llamada no atendida registrada')
                : 'WhatsApp registrado'
            );
            setModalNota({ open: false, contacto: null, tipo: '', atendida: null });
            setHistorialVersion(v => v + 1); // Trigger drawer reload
            cargarContactos();
            cargarMetricas();
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error al registrar', 'error');
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleMarcarNoResponde = async (contacto) => {
        setActionLoading(true);
        try {
            await SDRService.marcarNoResponde(contacto._id, { empresaId });
            mostrarSnackbar('Marcado como No responde');
            setHistorialVersion(v => v + 1);
            cargarContactos();
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error', 'error');
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleMarcarNoCalifica = async (contacto, motivo) => {
        try {
            await SDRService.marcarNoCalifica(contacto._id, { motivo, empresaId });
            mostrarSnackbar('Marcado como No califica');
            setHistorialVersion(v => v + 1);
            cargarContactos();
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error', 'error');
        }
    };
    
    const handleRegistrarReunion = async (data) => {
        if (!contactoSeleccionado) return;
        setActionLoading(true);
        try {
            await SDRService.registrarReunion(contactoSeleccionado._id, {
                ...data,
                empresaId,
                registradoPor: sdrId,
                registradoPorNombre: sdrNombre
            });
            mostrarSnackbar('¡Reunión registrada! Pendiente de aprobación');
            setModalReunion(false);
            cargarContactos();
            cargarMetricas();
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error al registrar reunión', 'error');
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleAgregarComentario = async (contactoId, comentario) => {
        try {
            await SDRService.registrarIntento(contactoId, {
                tipo: 'comentario',
                canal: 'otro',
                nota: comentario,
                empresaId
            });
            mostrarSnackbar('Comentario agregado');
            return true;
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error al agregar comentario', 'error');
            return false;
        }
    };
    
    const handleEvaluarReunion = async (estado, motivoRechazo, notasEvaluador, reunionDirecta = null) => {
        const reunion = reunionDirecta || modalEvaluar.reunion;
        if (!reunion) return;
        try {
            await SDRService.evaluarReunion(reunion._id, {
                estado,
                motivoRechazo,
                notasEvaluador
            });
            const labels = { realizada: 'marcada como realizada', no_show: 'marcada como no show', cancelada: 'cancelada', aprobada: 'aprobada', rechazada: 'rechazada' };
            mostrarSnackbar(`Reunión ${labels[estado] || estado}`);
            setModalEvaluar({ open: false, reunion: null });
            cargarReuniones();
            cargarContactos();
            cargarMetricas();
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error al evaluar reunión', 'error');
        }
    };

    const handleGuardarEdicionReunion = async (formData) => {
        const reunion = modalEditarReunion.reunion;
        if (!reunion) return;
        try {
            await SDRService.actualizarReunion(reunion._id, formData);
            mostrarSnackbar('Reunión actualizada correctamente');
            setModalEditarReunion({ open: false, reunion: null });
            cargarReuniones();
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error al actualizar reunión', 'error');
        }
    };
    
    const handleAsignarContactos = async (sdrIdAsignar, sdrNombreAsignar, proximoContacto = null) => {
        if (contactosSeleccionados.length === 0) return;
        try {
            await SDRService.asignarContactos(contactosSeleccionados, sdrIdAsignar, sdrNombreAsignar, empresaId, proximoContacto);
            mostrarSnackbar(`${contactosSeleccionados.length} contacto(s) asignado(s)`);
            setContactosSeleccionados([]);
            setModalAsignar(false);
            cargarContactos();
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error al asignar', 'error');
        }
    };
    
    const handleDesasignarContactos = async () => {
        if (contactosSeleccionados.length === 0) return;
        try {
            await SDRService.desasignarContactos(contactosSeleccionados, empresaId);
            mostrarSnackbar(`${contactosSeleccionados.length} contacto(s) desasignado(s)`);
            setContactosSeleccionados([]);
            cargarContactos();
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error al desasignar', 'error');
        }
    };

    const handleEliminarContactos = async () => {
        if (contactosSeleccionados.length === 0) return;
        if (!window.confirm(`¿Estás seguro de eliminar ${contactosSeleccionados.length} contacto(s)? Esta acción no se puede deshacer.`)) return;
        
        try {
            const resultado = await SDRService.eliminarContactos(contactosSeleccionados);
            mostrarSnackbar(`Eliminados: ${resultado.contactosEliminados} contacto(s), ${resultado.eventosEliminados} evento(s), ${resultado.reunionesEliminadas} reunión(es)`);
            setContactosSeleccionados([]);
            cargarContactos();
            cargarMetricas();
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error al eliminar contactos', 'error');
        }
    };
    
    const handleExportar = async () => {
        try {
            const datos = await SDRService.exportarContactos(empresaId);
            const ws = XLSX.utils.json_to_sheet(datos);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Contactos');
            XLSX.writeFile(wb, `contactos_sdr_${new Date().toISOString().split('T')[0]}.xlsx`);
            mostrarSnackbar('Exportación completada');
        } catch (error) {
            mostrarSnackbar('Error al exportar', 'error');
        }
    };
    
    // ==================== RENDER DASHBOARD ====================
    
    const renderDashboard = () => (
        <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Métricas del equipo - Hoy</Typography>
            <Grid container spacing={isMobile ? 1 : 2} sx={{ mb: 4 }}>
                <Grid item xs={6} sm={6} md={2.4}>
                    <MetricCard
                        title="Llamadas"
                        value={metricas?.llamadasRealizadas || 0}
                        subtitle={!isMobile ? `${metricas?.llamadasAtendidas || 0} atendidas` : null}
                        icon={<PhoneIcon />}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={6} sm={6} md={2.4}>
                    <MetricCard
                        title="WhatsApp"
                        value={metricas?.whatsappEnviados || 0}
                        icon={<WhatsAppIcon />}
                        color="success"
                    />
                </Grid>
                <Grid item xs={6} sm={6} md={2.4}>
                    <MetricCard
                        title="Reuniones"
                        value={metricas?.reunionesCoordinadas || 0}
                        subtitle={!isMobile ? `${metricas?.reunionesAprobadas || 0} aprobadas` : null}
                        icon={<EventIcon />}
                        color="warning"
                    />
                </Grid>
                <Grid item xs={6} sm={6} md={2.4}>
                    <MetricCard
                        title="Pendientes"
                        value={metricas?.reunionesPendientes || 0}
                        subtitle={!isMobile ? "por evaluar" : null}
                        icon={<ScheduleIcon />}
                        color="info"
                        onClick={() => setTabActual(2)}
                    />
                </Grid>
                {!isMobile && (
                    <Grid item xs={6} sm={6} md={2.4}>
                        <MetricCard
                            title="Sin asignar"
                            value={metricas?.contactosSinAsignar || 0}
                            subtitle="en pool"
                            icon={<PeopleOutlineIcon />}
                            color="secondary"
                            onClick={() => setTabActual(1)}
                        />
                    </Grid>
                )}
            </Grid>
            
            {/* Métricas por SDR */}
            {metricas?.metricasPorSDR?.length > 0 && (
                <>
                    <Typography variant="h6" sx={{ mb: 2 }}>Actividad por SDR</Typography>
                    <TableContainer component={Paper} sx={{ mb: 4 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>SDR</TableCell>
                                    <TableCell align="center">Llamadas</TableCell>
                                    <TableCell align="center">WhatsApp</TableCell>
                                    <TableCell align="center">Reuniones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {metricas.metricasPorSDR.map((sdr, idx) => {
                                    const eventos = {};
                                    sdr.eventos?.forEach(e => { eventos[e.tipo] = e.count; });
                                    return (
                                        <TableRow key={idx}>
                                            <TableCell>{sdr._id?.sdrNombre || 'Sin nombre'}</TableCell>
                                            <TableCell align="center">
                                                {(eventos.llamada_atendida || 0) + (eventos.llamada_no_atendida || 0)}
                                            </TableCell>
                                            <TableCell align="center">{eventos.whatsapp_enviado || 0}</TableCell>
                                            <TableCell align="center">{eventos.reunion_coordinada || 0}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}
            
            {/* Reuniones agendadas */}
            <Typography variant="h6" sx={{ mb: 2 }}>
                Próximas reuniones
                {reuniones.length > 0 && (
                    <Chip label={reuniones.length} color="warning" size="small" sx={{ ml: 1 }} />
                )}
            </Typography>
            {reuniones.length === 0 ? (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                    No hay reuniones agendadas
                </Alert>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>📅 Fecha</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>🕐 Hora</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Contacto</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Empresa</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Tamaño</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>SDR</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Link / Lugar</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reuniones.map(reunion => {
                                const fechaReunion = reunion.fecha || reunion.fechaHora ? new Date(reunion.fecha || reunion.fechaHora) : null;
                                const esHoy = fechaReunion && new Date().toDateString() === fechaReunion.toDateString();
                                const esPasada = fechaReunion && fechaReunion < new Date() && !esHoy;
                                return (
                                    <TableRow 
                                        key={reunion._id}
                                        sx={{ bgcolor: esHoy ? 'warning.50' : esPasada ? 'error.50' : 'inherit' }}
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
                                                {reunion.hora || (fechaReunion ? fechaReunion.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {reunion.contactoId ? (
                                                <NextLink href={`/sdr/contacto/${reunion.contactoId._id || reunion.contactoId}`} passHref legacyBehavior>
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
                                                        {reunion.contactoPrincipal}
                                                    </Typography>
                                                </NextLink>
                                            ) : (
                                                <Typography variant="body2">{reunion.contactoPrincipal}</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">{reunion.empresaNombre || '—'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {reunion.tamanoEmpresa ? <Chip label={reunion.tamanoEmpresa} size="small" variant="outlined" /> : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">{reunion.registradoPorNombre || reunion.sdrNombre || '—'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {reunion.link ? (
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
                                            ) : reunion.lugar ? (
                                                <Typography variant="body2" color="text.secondary">📍 {reunion.lugar}</Typography>
                                            ) : reunion.linkAgenda ? (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<LinkIcon />}
                                                    href={reunion.linkAgenda}
                                                    target="_blank"
                                                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                                >
                                                    Unirse
                                                </Button>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">—</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Editar reunión">
                                                <IconButton size="small" onClick={() => setModalEditarReunion({ open: true, reunion })}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
    
    // ==================== RENDER CONTACTOS ====================
    
    // Estado para menú mobile
    const [menuAnchor, setMenuAnchor] = React.useState(null);
    
    const renderContactos = () => (
        <Box>
            {/* Barra de filtros - MOBILE */}
            {isMobile ? (
                <Box sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <TextField
                            size="small"
                            placeholder="Buscar..."
                            value={filtros.busqueda}
                            onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                            }}
                            sx={{ flex: 1 }}
                        />
                        <IconButton onClick={() => setMostrarFiltrosAvanzados(v => !v)} color={mostrarFiltrosAvanzados ? 'primary' : 'default'}>
                            <FilterListIcon />
                        </IconButton>
                        <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
                            <MoreVertIcon />
                        </IconButton>
                    </Stack>
                    {/* Estado */}
                    <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto', pb: 0.5 }}>
                        <Chip label="Todos" size="small" color={!filtros.estado ? 'primary' : 'default'} variant={!filtros.estado ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, estado: '' })} />
                        {Object.entries(ESTADOS_CONTACTO).map(([key, { label, color }]) => (
                            <Chip key={key} label={label} size="small" color={filtros.estado === key ? color : 'default'} variant={filtros.estado === key ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, estado: filtros.estado === key ? '' : key })} />
                        ))}
                    </Stack>
                    {/* Ordenar */}
                    <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto', py: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', whiteSpace: 'nowrap' }}>Ordenar:</Typography>
                        <Chip label="Vencidos" size="small" color={filtros.ordenarPor === 'proximoContacto' && filtros.ordenDir === 'asc' ? 'primary' : 'default'} variant={filtros.ordenarPor === 'proximoContacto' && filtros.ordenDir === 'asc' ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, ordenarPor: 'proximoContacto', ordenDir: 'asc' })} />
                        <Chip label="Más nuevos" size="small" color={filtros.ordenarPor === 'createdAt' ? 'primary' : 'default'} variant={filtros.ordenarPor === 'createdAt' ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, ordenarPor: 'createdAt', ordenDir: 'desc' })} />
                        <Chip label="Últ. actividad" size="small" color={filtros.ordenarPor === 'ultimaAccion' ? 'primary' : 'default'} variant={filtros.ordenarPor === 'ultimaAccion' ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, ordenarPor: 'ultimaAccion', ordenDir: 'desc' })} />
                        <Chip label="Prioridad" size="small" color={filtros.ordenarPor === 'prioridad' ? 'primary' : 'default'} variant={filtros.ordenarPor === 'prioridad' ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, ordenarPor: 'prioridad', ordenDir: 'desc' })} />
                    </Stack>
                    {/* Filtros avanzados colapsables */}
                    <Collapse in={mostrarFiltrosAvanzados}>
                        <Stack spacing={0.5} sx={{ pt: 0.5 }}>
                            {/* SDR */}
                            <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', whiteSpace: 'nowrap' }}>SDR:</Typography>
                                <Chip label="Sin asignar" size="small" color={filtros.soloSinAsignar ? 'secondary' : 'default'} variant={filtros.soloSinAsignar ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, soloSinAsignar: !filtros.soloSinAsignar })} />
                                {sdrsDisponibles.map((sdr) => (
                                    <Chip key={sdr.id} label={sdr.nombre.split(' ')[0]} size="small" color={filtros.sdrAsignado === sdr.id ? 'info' : 'default'} variant={filtros.sdrAsignado === sdr.id ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, sdrAsignado: filtros.sdrAsignado === sdr.id ? '' : sdr.id })} />
                                ))}
                            </Stack>
                            {/* Calificación bot */}
                            <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', whiteSpace: 'nowrap' }}>Bot:</Typography>
                                {Object.entries(PRECALIFICACION_BOT).map(([key, { label }]) => (
                                    <Chip key={key} label={label} size="small" color={filtros.precalificacionBot === key ? 'info' : 'default'} variant={filtros.precalificacionBot === key ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, precalificacionBot: filtros.precalificacionBot === key ? '' : key })} />
                                ))}
                            </Stack>
                            {/* Plan */}
                            <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', whiteSpace: 'nowrap' }}>Plan:</Typography>
                                {Object.entries(PLANES_SORBY).map(([key, { label, icon }]) => (
                                    <Chip key={key} label={`${icon} ${label}`} size="small" color={filtros.planEstimado === key ? 'primary' : 'default'} variant={filtros.planEstimado === key ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, planEstimado: filtros.planEstimado === key ? '' : key })} />
                                ))}
                            </Stack>
                            {/* Intención + Hoy */}
                            <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', whiteSpace: 'nowrap' }}>Intención:</Typography>
                                {Object.entries(INTENCIONES_COMPRA).map(([key, { label, icon }]) => (
                                    <Chip key={key} label={`${icon} ${label}`} size="small" color={filtros.intencionCompra === key ? 'warning' : 'default'} variant={filtros.intencionCompra === key ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, intencionCompra: filtros.intencionCompra === key ? '' : key })} />
                                ))}
                                <Chip label="📅 Hoy" size="small" color={filtros.proximoContactoHoy ? 'error' : 'default'} variant={filtros.proximoContactoHoy ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, proximoContactoHoy: !filtros.proximoContactoHoy })} />
                            </Stack>
                            {/* Segmento */}
                            <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', whiteSpace: 'nowrap' }}>Segmento:</Typography>
                                <Chip label="Todos" size="small" color={!filtros.segmento ? 'primary' : 'default'} variant={!filtros.segmento ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, segmento: '' })} />
                                <Chip label="🔵 Inbound" size="small" color={filtros.segmento === 'inbound' ? 'info' : 'default'} variant={filtros.segmento === 'inbound' ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, segmento: filtros.segmento === 'inbound' ? '' : 'inbound' })} />
                                <Chip label="🟠 Outbound" size="small" color={filtros.segmento === 'outbound' ? 'warning' : 'default'} variant={filtros.segmento === 'outbound' ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, segmento: filtros.segmento === 'outbound' ? '' : 'outbound' })} />
                            </Stack>
                        </Stack>
                    </Collapse>
                    <Menu
                        anchorEl={menuAnchor}
                        open={Boolean(menuAnchor)}
                        onClose={() => setMenuAnchor(null)}
                    >
                        <MenuItem onClick={() => { refrescar(); setMenuAnchor(null); }}>
                            <RefreshIcon sx={{ mr: 1 }} /> Actualizar
                        </MenuItem>
                        <MenuItem onClick={() => { handleExportar(); setMenuAnchor(null); }}>
                            <DownloadIcon sx={{ mr: 1 }} /> Exportar
                        </MenuItem>
                        <MenuItem onClick={() => { setModalCrear(true); setMenuAnchor(null); }}>
                            <AddIcon sx={{ mr: 1 }} /> Nuevo contacto
                        </MenuItem>
                    </Menu>
                </Box>
            ) : (
                /* Barra de filtros - DESKTOP */
                <Paper sx={{ p: 2, mb: 2 }}>
                    {/* Fila 1: Búsqueda + acciones */}
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                        <TextField
                            size="small"
                            placeholder="Buscar por nombre, empresa, teléfono..."
                            value={filtros.busqueda}
                            onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                            }}
                            sx={{ minWidth: 280, flex: 1 }}
                        />
                        <Box sx={{ flexGrow: 1 }} />
                        <Stack direction="row" spacing={1}>
                            <Button size="small" startIcon={<RefreshIcon />} onClick={refrescar}>Actualizar</Button>
                            <Button size="small" startIcon={<DownloadIcon />} onClick={handleExportar}>Exportar</Button>
                            <Button size="small" startIcon={<UploadFileIcon />} onClick={() => setModalImportar(true)}>Importar</Button>
                            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setModalCrear(true)}>Nuevo</Button>
                        </Stack>
                    </Stack>
                    {/* Fila 2: Filtros compactos en una sola línea */}
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ rowGap: 1 }}>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Estado</InputLabel>
                            <Select value={filtros.estado} label="Estado" onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
                                <MenuItem value="">Todos</MenuItem>
                                {Object.entries(ESTADOS_CONTACTO).map(([key, { label }]) => (
                                    <MenuItem key={key} value={key}>{label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>SDR</InputLabel>
                            <Select value={filtros.sdrAsignado} label="SDR" onChange={(e) => setFiltros({ ...filtros, sdrAsignado: e.target.value })}>
                                <MenuItem value="">Todos</MenuItem>
                                {sdrsDisponibles.map((sdr) => (
                                    <MenuItem key={sdr.id} value={sdr.id}>{sdr.nombre}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel>Calificación</InputLabel>
                            <Select value={filtros.precalificacionBot} label="Calificación" onChange={(e) => setFiltros({ ...filtros, precalificacionBot: e.target.value })}>
                                <MenuItem value="">Todas</MenuItem>
                                {Object.entries(PRECALIFICACION_BOT).map(([key, { label }]) => (
                                    <MenuItem key={key} value={key}>{label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 110 }}>
                            <InputLabel>Plan</InputLabel>
                            <Select value={filtros.planEstimado} label="Plan" onChange={(e) => setFiltros({ ...filtros, planEstimado: e.target.value })}>
                                <MenuItem value="">Todos</MenuItem>
                                {Object.entries(PLANES_SORBY).map(([key, { label, icon }]) => (
                                    <MenuItem key={key} value={key}>{icon} {label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Intención</InputLabel>
                            <Select value={filtros.intencionCompra} label="Intención" onChange={(e) => setFiltros({ ...filtros, intencionCompra: e.target.value })}>
                                <MenuItem value="">Todas</MenuItem>
                                {Object.entries(INTENCIONES_COMPRA).map(([key, { label, icon }]) => (
                                    <MenuItem key={key} value={key}>{icon} {label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {statusNotionOpciones.length > 0 && (
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                                <InputLabel>Status Notion</InputLabel>
                                <Select value={filtros.statusNotion} label="Status Notion" onChange={(e) => setFiltros({ ...filtros, statusNotion: e.target.value })}>
                                    <MenuItem value="">Todos</MenuItem>
                                    {statusNotionOpciones.map((status) => (
                                        <MenuItem key={status} value={status}>{status}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Segmento</InputLabel>
                            <Select value={filtros.segmento} label="Segmento" onChange={(e) => setFiltros({ ...filtros, segmento: e.target.value })}>
                                <MenuItem value="">Todos</MenuItem>
                                <MenuItem value="inbound">🔵 Inbound</MenuItem>
                                <MenuItem value="outbound">🟠 Outbound</MenuItem>
                            </Select>
                        </FormControl>
                        <Chip label="Sin asignar" size="small" color={filtros.soloSinAsignar ? 'secondary' : 'default'} variant={filtros.soloSinAsignar ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, soloSinAsignar: !filtros.soloSinAsignar })} />
                        <Chip label="📅 Contactar hoy" size="small" color={filtros.proximoContactoHoy ? 'error' : 'default'} variant={filtros.proximoContactoHoy ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, proximoContactoHoy: !filtros.proximoContactoHoy })} />
                    </Stack>
                    {/* Fila 3: Ordenamiento */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                        <SortIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">Ordenar:</Typography>
                        <Chip label="Vencidos primero" size="small" color={filtros.ordenarPor === 'proximoContacto' && filtros.ordenDir === 'asc' ? 'primary' : 'default'} variant={filtros.ordenarPor === 'proximoContacto' && filtros.ordenDir === 'asc' ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, ordenarPor: 'proximoContacto', ordenDir: 'asc' })} />
                        <Chip label="Más nuevos" size="small" color={filtros.ordenarPor === 'createdAt' ? 'primary' : 'default'} variant={filtros.ordenarPor === 'createdAt' ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, ordenarPor: 'createdAt', ordenDir: 'desc' })} />
                        <Chip label="Última actividad" size="small" color={filtros.ordenarPor === 'ultimaAccion' ? 'primary' : 'default'} variant={filtros.ordenarPor === 'ultimaAccion' ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, ordenarPor: 'ultimaAccion', ordenDir: 'desc' })} />
                        <Chip label="Estado" size="small" color={filtros.ordenarPor === 'estado' ? 'primary' : 'default'} variant={filtros.ordenarPor === 'estado' ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, ordenarPor: 'estado', ordenDir: 'asc' })} />
                        <Chip label="Prioridad" size="small" color={filtros.ordenarPor === 'prioridad' ? 'primary' : 'default'} variant={filtros.ordenarPor === 'prioridad' ? 'filled' : 'outlined'} onClick={() => setFiltros({ ...filtros, ordenarPor: 'prioridad', ordenDir: 'desc' })} />
                    </Stack>
                </Paper>
            )}
            
            {/* Acciones masivas */}
            {contactosSeleccionados.length > 0 && (
                <Alert 
                    severity="info" 
                    sx={{ mb: 2 }}
                    action={
                        isMobile ? (
                            <Stack direction="row" spacing={0.5}>
                                <IconButton size="small" color="primary" onClick={() => setModalAsignar(true)}>
                                    <AssignmentIndIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" onClick={handleDesasignarContactos}>
                                    <PersonOffIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={handleEliminarContactos}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        ) : (
                            <Stack direction="row" spacing={1}>
                                <Button size="small" startIcon={<AssignmentIndIcon />} onClick={() => setModalAsignar(true)}>
                                    Asignar
                                </Button>
                                <Button size="small" startIcon={<PersonOffIcon />} onClick={handleDesasignarContactos}>
                                    Desasignar
                                </Button>
                                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={handleEliminarContactos}>
                                    Eliminar
                                </Button>
                                <Button size="small" onClick={() => setContactosSeleccionados([])}>
                                    Limpiar
                                </Button>
                            </Stack>
                        )
                    }
                >
                    {contactosSeleccionados.length} seleccionado(s)
                </Alert>
            )}
            
            {/* Lista de contactos - MOBILE: Cards */}
            {isMobile ? (
                <Stack spacing={1.5}>
                    {loading && <LinearProgress />}
                    {contactos.map((contacto, idx) => {
                        const vencido = contacto.proximoContacto && new Date(contacto.proximoContacto) < new Date();
                        return (
                            <Paper
                                key={contacto._id}
                                sx={{
                                    p: 2,
                                    borderLeft: 4,
                                    borderColor: vencido ? 'error.main' : (contacto.estado === 'nuevo' ? 'info.main' : 'grey.300'),
                                    cursor: 'pointer'
                                }}
                                onClick={() => {
                                    handleAbrirContacto(contacto, idx);
                                }}
                            >
                                <Stack direction="row" alignItems="flex-start" spacing={1}>
                                    <Checkbox
                                        size="small"
                                        checked={contactosSeleccionados.includes(contacto._id)}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setContactosSeleccionados([...contactosSeleccionados, contacto._id]);
                                            } else {
                                                setContactosSeleccionados(contactosSeleccionados.filter(id => id !== contacto._id));
                                            }
                                        }}
                                    />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle2" fontWeight={700} noWrap>
                                                {contacto.nombre}
                                                {contacto.segmento && (
                                                    <Chip label={contacto.segmento === 'inbound' ? '🔵 In' : '🟠 Out'} size="small" variant="outlined" color={contacto.segmento === 'inbound' ? 'info' : 'warning'} sx={{ height: 18, fontSize: 10, ml: 0.5 }} />
                                                )}
                                            </Typography>
                                            <Stack direction="column" alignItems="flex-end" spacing={0.3}>
                                                <EstadoChip estado={contacto.estado} />
                                                {contacto.statusNotion && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', lineHeight: 1 }}>
                                                        {contacto.statusNotion}
                                                    </Typography>
                                                )}
                                            </Stack>
                                        </Stack>
                                        {contacto.empresa && (
                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                {contacto.empresa}
                                            </Typography>
                                        )}
                                        <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} alignItems="center" flexWrap="wrap" useFlexGap>
                                            {contacto.sdrAsignadoNombre ? (
                                                <Chip label={contacto.sdrAsignadoNombre} size="small" variant="outlined" />
                                            ) : (
                                                <Chip label="Pool" size="small" variant="outlined" color="secondary" />
                                            )}
                                            {contacto.precalificacionBot && contacto.precalificacionBot !== 'sin_calificar' && (
                                                <Chip label={PRECALIFICACION_BOT[contacto.precalificacionBot]?.label || contacto.precalificacionBot} size="small" color={PRECALIFICACION_BOT[contacto.precalificacionBot]?.color || 'default'} variant="outlined" />
                                            )}
                                            {contacto.planEstimado && PLANES_SORBY[contacto.planEstimado] && (
                                                <Chip label={`${PLANES_SORBY[contacto.planEstimado].icon} ${PLANES_SORBY[contacto.planEstimado].label}`} size="small" variant="outlined" />
                                            )}
                                            {contacto.scoring?.total != null && (
                                                <Chip label={`⚡${contacto.scoring.total}`} size="small" color={contacto.scoring.total >= 400 ? 'error' : contacto.scoring.total >= 200 ? 'warning' : 'default'} />
                                            )}
                                            {contacto.proximoContacto && (
                                                <Chip
                                                    size="small"
                                                    icon={<ScheduleIcon />}
                                                    label={new Date(contacto.proximoContacto).toLocaleString('es-AR', {
                                                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                    color={vencido ? 'error' : 'success'}
                                                    variant="outlined"
                                                />
                                            )}
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Paper>
                        );
                    })}
                    <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} sx={{ py: 2 }}>
                        <IconButton 
                            size="small" 
                            disabled={page <= 1}
                            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        >
                            <NavigateBeforeIcon />
                        </IconButton>
                        <Typography variant="body2" color="text.secondary">
                            Pág. {page} de {Math.ceil(totalContactos / 50) || 1} ({totalContactos} contactos)
                        </Typography>
                        <IconButton 
                            size="small" 
                            disabled={page >= Math.ceil(totalContactos / 50)}
                            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        >
                            <NavigateNextIcon />
                        </IconButton>
                    </Stack>
                </Stack>
            ) : (
                /* Tabla de contactos - DESKTOP */
                <>
                    <TableContainer component={Paper}>
                        {loading && <LinearProgress />}
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            indeterminate={contactosSeleccionados.length > 0 && contactosSeleccionados.length < contactos.length}
                                            checked={contactos.length > 0 && contactosSeleccionados.length === contactos.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setContactosSeleccionados(contactos.map(c => c._id));
                                                } else {
                                                    setContactosSeleccionados([]);
                                                }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>Nombre</TableCell>
                                    <TableCell>Empresa</TableCell>
                                    <TableCell>Estado</TableCell>
                                    <TableCell>Calificado</TableCell>
                                    <TableCell>Quiere reunión</TableCell>
                                    <TableCell>Plan</TableCell>
                                    <TableCell>SDR</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>Prior.</TableCell>
                                    <TableCell>Próximo</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {contactos.map((contacto, idx) => (
                                    <TableRow 
                                        key={contacto._id} 
                                        hover 
                                        sx={{ cursor: 'pointer' }}
                                        onClick={() => { 
                                            handleAbrirContacto(contacto, idx);
                                        }}
                                    >
                                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={contactosSeleccionados.includes(contacto._id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setContactosSeleccionados([...contactosSeleccionados, contacto._id]);
                                                    } else {
                                                        setContactosSeleccionados(contactosSeleccionados.filter(id => id !== contacto._id));
                                                    }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>{contacto.nombre}</Typography>
                                            {contacto.segmento && (
                                                <Chip label={contacto.segmento === 'inbound' ? 'In' : 'Out'} size="small" variant="outlined" color={contacto.segmento === 'inbound' ? 'info' : 'warning'} sx={{ height: 18, fontSize: 10, ml: 0.5 }} />
                                            )}
                                        </TableCell>
                                        <TableCell>{contacto.empresa || '—'}</TableCell>
                                        <TableCell>
                                            <EstadoChip estado={contacto.estado} />
                                            {contacto.statusNotion && (
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.3, fontSize: '0.65rem' }}>
                                                    {contacto.statusNotion}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {contacto.precalificacionBot && contacto.precalificacionBot !== 'sin_calificar' ? (
                                                <Chip label={PRECALIFICACION_BOT[contacto.precalificacionBot]?.label || contacto.precalificacionBot} size="small" color={PRECALIFICACION_BOT[contacto.precalificacionBot]?.color || 'default'} variant="outlined" />
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell>
                                            {contacto.precalificacionBot === 'quiere_meet' ? (
                                                <Chip label="✅ Sí" size="small" color="success" variant="filled" />
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell>
                                            {contacto.planEstimado && PLANES_SORBY[contacto.planEstimado] ? (
                                                <Chip label={`${PLANES_SORBY[contacto.planEstimado].icon} ${PLANES_SORBY[contacto.planEstimado].label}`} size="small" color={PLANES_SORBY[contacto.planEstimado].color} variant="outlined" />
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell>
                                            {contacto.sdrAsignadoNombre || <Chip label="Pool" size="small" variant="outlined" color="secondary" />}
                                        </TableCell>
                                        <TableCell>
                                            {contacto.scoring?.total != null ? (
                                                <Chip label={contacto.scoring.total} size="small" color={contacto.scoring.total >= 400 ? 'error' : contacto.scoring.total >= 200 ? 'warning' : 'default'} />
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell>
                                            {contacto.proximoContacto ? (
                                                <Tooltip title={new Date(contacto.proximoContacto).toLocaleString('es-AR')}>
                                                    <Chip 
                                                        size="small" 
                                                        label={new Date(contacto.proximoContacto).toLocaleString('es-AR', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                        color={new Date(contacto.proximoContacto) < new Date() ? 'error' : 'success'}
                                                        variant="outlined"
                                                    />
                                                </Tooltip>
                                            ) : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    
                    <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} sx={{ mt: 2 }}>
                        <Button 
                            size="small" 
                            startIcon={<NavigateBeforeIcon />}
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            Anterior
                        </Button>
                        <Typography variant="body2" color="text.secondary">
                            Página {page} de {Math.ceil(totalContactos / 50) || 1} ({totalContactos} contactos)
                        </Typography>
                        <Button 
                            size="small" 
                            endIcon={<NavigateNextIcon />}
                            disabled={page >= Math.ceil(totalContactos / 50)}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Siguiente
                        </Button>
                    </Stack>
                </>
            )}
        </Box>
    );
    
    // ==================== RENDER REUNIONES ====================
    
    const renderReuniones = () => (
        <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Próximas reuniones agendadas</Typography>
            
            {reuniones.length === 0 ? (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                    No hay reuniones agendadas
                </Alert>
            ) : (
                <Grid container spacing={2}>
                    {reuniones.map(reunion => {
                        const reunContactoId = reunion.contactoId?._id || reunion.contactoId;
                        return (
                        <Grid item xs={12} md={6} lg={4} key={reunion._id}>
                            <Card>
                                <CardContent>
                                    <Stack spacing={1}>
                                        <Typography variant="h6">{reunion.empresaNombre}</Typography>
                                        {reunContactoId ? (
                                            <NextLink href={`/sdr/contacto/${reunContactoId}`} passHref legacyBehavior>
                                                <Typography variant="body2" component="a" sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, cursor: 'pointer' }}>
                                                    {reunion.contactoPrincipal} {reunion.rolContacto && `- ${reunion.rolContacto}`}
                                                </Typography>
                                            </NextLink>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                {reunion.contactoPrincipal} {reunion.rolContacto && `- ${reunion.rolContacto}`}
                                            </Typography>
                                        )}
                                        <Divider />
                                        <Stack direction="row" spacing={1}>
                                            <Chip label={reunion.tamanoEmpresa} size="small" />
                                            <Chip 
                                                label={new Date(reunion.fecha || reunion.fechaHora).toLocaleString('es-AR', {
                                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                })} 
                                                size="small" 
                                                icon={<EventIcon />}
                                            />
                                        </Stack>
                                        {reunion.puntosDeDolor && (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Puntos de dolor:</Typography>
                                                <Typography variant="body2">{reunion.puntosDeDolor}</Typography>
                                            </Box>
                                        )}
                                        <Divider />
                                        <Typography variant="caption" color="text.secondary">
                                            Registrada por: {reunion.registradoPorNombre}
                                        </Typography>
                                    </Stack>
                                </CardContent>
                                <Box sx={{ p: 2, pt: 0 }}>
                                    <Stack spacing={1}>
                                        <Stack direction="row" spacing={1}>
                                            <Button 
                                                variant="contained" 
                                                color="success" 
                                                size="small"
                                                startIcon={<CheckCircleIcon />}
                                                fullWidth
                                                onClick={() => handleEvaluarReunion('realizada', null, null, reunion)}
                                            >
                                                Realizada
                                            </Button>
                                            <Button 
                                                variant="outlined" 
                                                color="warning" 
                                                size="small"
                                                startIcon={<PersonRemoveIcon />}
                                                fullWidth
                                                onClick={() => handleEvaluarReunion('no_show', null, null, reunion)}
                                            >
                                                No Show
                                            </Button>
                                            <Button 
                                                variant="outlined" 
                                                color="error" 
                                                size="small"
                                                startIcon={<CancelIcon />}
                                                fullWidth
                                                onClick={() => handleEvaluarReunion('cancelada', null, null, reunion)}
                                            >
                                                Cancelar
                                            </Button>
                                        </Stack>
                                        <Button
                                            variant="text"
                                            size="small"
                                            startIcon={<EditIcon />}
                                            fullWidth
                                            onClick={() => setModalEditarReunion({ open: true, reunion })}
                                            sx={{ textTransform: 'none', color: 'text.secondary' }}
                                        >
                                            Editar reunión
                                        </Button>
                                    </Stack>
                                </Box>
                            </Card>
                        </Grid>
                        );
                    })}
                </Grid>
            )}
        </Box>
    );
    
    // ==================== MODALES ====================
    
    const ModalCrearContacto = () => {
        const [form, setForm] = useState({ nombre: '', telefono: '', email: '', empresa: '', cargo: '' });
        
        return (
            <Dialog open={modalCrear} onClose={() => setModalCrear(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Nuevo Contacto</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField label="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} fullWidth required />
                        <TextField label="Teléfono *" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} fullWidth required />
                        <TextField label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth />
                        <TextField label="Empresa" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} fullWidth />
                        <TextField label="Cargo" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} fullWidth />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalCrear(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={() => handleCrearContacto(form)} disabled={!form.nombre || !form.telefono}>
                        Crear
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };
    
    const ModalNota = () => {
        const [nota, setNota] = useState('');
        
        const getTitulo = () => {
            const { tipo, atendida } = modalNota;
            if (tipo === 'llamada') return atendida ? '📞 Llamada atendida' : '📵 Llamada no atendida';
            return '💬 WhatsApp enviado';
        };
        
        return (
            <Dialog 
                open={modalNota.open} 
                onClose={() => { setModalNota({ open: false, contacto: null, tipo: '', atendida: null }); setNota(''); }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{getTitulo()}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Contacto: {modalNota.contacto?.nombre}
                    </Typography>
                    <TextField
                        label="Nota (opcional)"
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Ej: Le dejé mensaje de voz, Le escribí presentándome..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setModalNota({ open: false, contacto: null, tipo: '', atendida: null }); setNota(''); }}>
                        Cancelar
                    </Button>
                    <Button variant="contained" onClick={() => { handleRegistrarIntento(nota); setNota(''); }} disabled={actionLoading}>
                        {actionLoading ? <CircularProgress size={20} /> : 'Registrar'}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };
    
    // ModalReunion extraído fuera del componente (ModalReunionGestion al final del archivo)
    
    const ModalEvaluarReunion = () => {
        const [notasEvaluador, setNotasEvaluador] = useState('');
        
        const { reunion } = modalEvaluar;
        if (!reunion) return null;
        
        return (
            <Dialog open={modalEvaluar.open} onClose={() => setModalEvaluar({ open: false, reunion: null })} maxWidth="sm" fullWidth>
                <DialogTitle>Evaluar Reunión</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">Empresa</Typography>
                            <Typography>{reunion.empresaNombre} ({reunion.tamanoEmpresa})</Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">Contacto</Typography>
                            <Typography>{reunion.contactoPrincipal} {reunion.rolContacto && `- ${reunion.rolContacto}`}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">Fecha</Typography>
                            <Typography>{new Date(reunion.fecha || reunion.fechaHora).toLocaleString('es-AR')}</Typography>
                        </Box>
                        {reunion.puntosDeDolor && (
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">Puntos de dolor</Typography>
                                <Typography>{reunion.puntosDeDolor}</Typography>
                            </Box>
                        )}
                        <Divider />
                        <TextField label="Notas" value={notasEvaluador} onChange={(e) => setNotasEvaluador(e.target.value)} fullWidth multiline rows={2} placeholder="¿Cómo fue la reunión?" />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalEvaluar({ open: false, reunion: null })}>Cerrar</Button>
                    <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => handleEvaluarReunion('cancelada', null, notasEvaluador)}>
                        Cancelar reunión
                    </Button>
                    <Button variant="outlined" color="warning" startIcon={<PersonRemoveIcon />} onClick={() => handleEvaluarReunion('no_show', null, notasEvaluador)}>
                        No Show
                    </Button>
                    <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleEvaluarReunion('realizada', null, notasEvaluador)}>
                        Realizada
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };
    
    const ModalEditarReunion = () => {
        const { reunion } = modalEditarReunion;
        const [form, setForm] = useState({});
        const [guardando, setGuardando] = useState(false);

        useEffect(() => {
            if (reunion) {
                const fechaObj = reunion.fecha ? new Date(reunion.fecha) : null;
                setForm({
                    fecha: fechaObj ? fechaObj.toISOString().split('T')[0] : '',
                    hora: reunion.hora || '',
                    link: reunion.link || reunion.linkAgenda || '',
                    lugar: reunion.lugar || '',
                    notas: reunion.notas || '',
                    empresaNombre: reunion.empresaNombre || '',
                    contactoPrincipal: reunion.contactoPrincipal || '',
                    rolContacto: reunion.rolContacto || '',
                    tamanoEmpresa: reunion.tamanoEmpresa || '',
                    puntosDeDolor: reunion.puntosDeDolor || '',
                    modulosPotenciales: reunion.modulosPotenciales || '',
                });
            }
        }, [reunion]);

        if (!reunion) return null;

        const handleGuardar = async () => {
            setGuardando(true);
            try {
                await handleGuardarEdicionReunion(form);
            } finally {
                setGuardando(false);
            }
        };

        return (
            <Dialog 
                open={modalEditarReunion.open} 
                onClose={() => setModalEditarReunion({ open: false, reunion: null })} 
                maxWidth="sm" 
                fullWidth
            >
                <DialogTitle>✏️ Editar Reunión</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Fecha"
                                type="date"
                                value={form.fecha || ''}
                                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Hora"
                                type="time"
                                value={form.hora || ''}
                                onChange={(e) => setForm({ ...form, hora: e.target.value })}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Stack>
                        <TextField
                            label="Empresa"
                            value={form.empresaNombre || ''}
                            onChange={(e) => setForm({ ...form, empresaNombre: e.target.value })}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>Tamaño de empresa</InputLabel>
                            <Select
                                value={form.tamanoEmpresa || ''}
                                label="Tamaño de empresa"
                                onChange={(e) => setForm({ ...form, tamanoEmpresa: e.target.value })}
                            >
                                {TAMANOS_EMPRESA.map(t => (
                                    <MenuItem key={t} value={t}>{t} empleados</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Contacto principal"
                                value={form.contactoPrincipal || ''}
                                onChange={(e) => setForm({ ...form, contactoPrincipal: e.target.value })}
                                fullWidth
                            />
                            <TextField
                                label="Rol"
                                value={form.rolContacto || ''}
                                onChange={(e) => setForm({ ...form, rolContacto: e.target.value })}
                                fullWidth
                                placeholder="Ej: Gerente, Dueño"
                            />
                        </Stack>
                        <TextField
                            label="Link de reunión"
                            value={form.link || ''}
                            onChange={(e) => setForm({ ...form, link: e.target.value })}
                            fullWidth
                            placeholder="Google Meet, Zoom, etc."
                        />
                        <TextField
                            label="Lugar"
                            value={form.lugar || ''}
                            onChange={(e) => setForm({ ...form, lugar: e.target.value })}
                            fullWidth
                            placeholder="Dirección física (si aplica)"
                        />
                        <TextField
                            label="Puntos de dolor"
                            value={form.puntosDeDolor || ''}
                            onChange={(e) => setForm({ ...form, puntosDeDolor: e.target.value })}
                            fullWidth
                            multiline
                            rows={2}
                        />
                        <TextField
                            label="Módulos potenciales"
                            value={form.modulosPotenciales || ''}
                            onChange={(e) => setForm({ ...form, modulosPotenciales: e.target.value })}
                            fullWidth
                            placeholder="Ej: Facturación, Stock, etc."
                        />
                        <TextField
                            label="Notas"
                            value={form.notas || ''}
                            onChange={(e) => setForm({ ...form, notas: e.target.value })}
                            fullWidth
                            multiline
                            rows={2}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalEditarReunion({ open: false, reunion: null })}>
                        Cancelar
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={handleGuardar} 
                        disabled={guardando}
                        startIcon={guardando ? <CircularProgress size={16} /> : null}
                    >
                        Guardar cambios
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };

    const ModalImportar = () => {
        const [archivo, setArchivo] = useState(null);
        const [sinTelefonoNotion, setSinTelefonoNotion] = useState([]);
        const [notionPageLink, setNotionPageLink] = useState('');
        
        const handleArchivoChange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setArchivo(file);
            setImportLoading(true);
            try {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet);
                const contactosExcel = json.map(row => ({
                    nombre: row.Nombre || row.nombre || row.Name || row.name || '',
                    telefono: String(row.Teléfono || row.telefono || row.Telefono || row.Phone || row.phone || ''),
                    email: row.Email || row.email || row.Mail || row.mail || '',
                    empresa: row.Empresa || row.empresa || row.Company || row.company || ''
                })).filter(c => c.nombre && c.telefono);
                const previewData = await SDRService.previewImportacion(contactosExcel, empresaId);
                setImportPreview(previewData);
            } catch (error) {
                mostrarSnackbar('Error al procesar el archivo', 'error');
            } finally {
                setImportLoading(false);
            }
        };
        
        const handleImportarExcel = async () => {
            const contactosAImportar = importPreview.filter(c => !c.esDuplicado);
            if (contactosAImportar.length === 0) {
                mostrarSnackbar('No hay contactos nuevos para importar', 'warning');
                return;
            }
            setImportLoading(true);
            mostrarSnackbar(`⏳ Importando ${contactosAImportar.length} contactos...`, 'info');
            try {
                const resultado = await SDRService.importarContactosConProgreso(
                    contactosAImportar, 
                    empresaId, 
                    'excel',
                    (progreso) => {
                        console.log(`📊 Progreso Excel: ${progreso.procesados}/${progreso.total}`);
                    }
                );
                mostrarSnackbar(`✅ Importados: ${resultado.importados}`);
                setModalImportar(false);
                resetImportState();
                cargarContactos();
                cargarMetricas();
            } catch (error) {
                mostrarSnackbar(error.message || 'Error al importar', 'error');
            } finally {
                setImportLoading(false);
            }
        };
        
        const extractNotionPageId = (link) => {
            if (!link) return null;
            const match = link.match(/([a-f0-9]{32})|([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
            if (match) return match[0];
            const parts = link.split('-');
            const lastPart = parts[parts.length - 1]?.replace(/[^a-f0-9]/gi, '');
            if (lastPart?.length === 32) return lastPart;
            return null;
        };
        
        const handleImportarPaginaNotion = async () => {
            const pageId = extractNotionPageId(notionPageLink);
            if (!pageId) {
                mostrarSnackbar('Link de Notion inválido', 'error');
                return;
            }
            setImportLoading(true);
            try {
                const resultado = await SDRService.importarPaginaNotion(pageId, empresaId);
                if (resultado.duplicado) {
                    mostrarSnackbar('Este contacto ya existe', 'warning');
                } else {
                    mostrarSnackbar('Contacto importado');
                    setNotionPageLink('');
                    cargarContactos();
                }
            } catch (error) {
                mostrarSnackbar(error.response?.data?.error || 'Error al importar', 'error');
            } finally {
                setImportLoading(false);
            }
        };
        
        const handleBuscarNotion = async () => {
            setImportLoading(true);
            setSinTelefonoNotion([]);
            try {
                const salesFilter = notionDbId || 'Outbound';
                const schema = await SDRService.obtenerSchemaNotion(null);
                if (schema.ok) setSchemaNotion(schema);
                const resultado = await SDRService.consultarNotion(null, empresaId, {}, salesFilter);
                setContactosNotion(resultado.contactos);
                setSinTelefonoNotion(resultado.nombresSinTelefono || []);
                mostrarSnackbar(`Encontrados: ${resultado.contactos.length} contactos`);
            } catch (error) {
                mostrarSnackbar(error.response?.data?.error || 'Error al consultar Notion', 'error');
            } finally {
                setImportLoading(false);
            }
        };
        
        const handleImportarNotion = async () => {
            if (contactosNotion.length === 0) return;
            setImportLoading(true);
            mostrarSnackbar(`⏳ Importando ${contactosNotion.length} contactos...`, 'info');
            try {
                const resultado = await SDRService.importarContactosConProgreso(
                    contactosNotion, 
                    empresaId, 
                    'notion',
                    (progreso) => {
                        // Actualizar UI con progreso
                        console.log(`📊 Progreso: ${progreso.procesados}/${progreso.total}`);
                    }
                );
                mostrarSnackbar(`✅ Importados: ${resultado.importados}${resultado.duplicados > 0 ? ` | ⚠️ Ya existían: ${resultado.duplicados}` : ''}`);
                setModalImportar(false);
                resetImportState();
                cargarContactos();
                cargarMetricas();
            } catch (error) {
                mostrarSnackbar(error.message || 'Error al importar', 'error');
            } finally {
                setImportLoading(false);
            }
        };
        
        const resetImportState = () => {
            setImportTab(0);
            setImportPreview([]);
            setNotionDbId('Outbound');
            setContactosNotion([]);
            setSchemaNotion(null);
        };
        
        const handleEliminarTodos = async () => {
            const confirmacion = window.prompt('⚠️ Escribe "ELIMINAR" para confirmar:');
            if (confirmacion !== 'ELIMINAR') return;
            setImportLoading(true);
            try {
                const resultado = await SDRService.eliminarTodosContactos(empresaId);
                mostrarSnackbar(`🗑️ Eliminados: ${resultado.contactosEliminados} contactos`);
                cargarContactos();
                cargarMetricas();
            } catch (error) {
                mostrarSnackbar(error.response?.data?.error || 'Error', 'error');
            } finally {
                setImportLoading(false);
            }
        };
        
        return (
            <Dialog open={modalImportar} onClose={() => { setModalImportar(false); resetImportState(); }} maxWidth="md" fullWidth>
                <DialogTitle>Importar Contactos</DialogTitle>
                <DialogContent>
                    <Tabs value={importTab} onChange={(_, v) => setImportTab(v)} sx={{ mb: 2 }}>
                        <Tab label="Desde Excel" />
                        <Tab label="Desde Notion" />
                    </Tabs>
                    
                    {importTab === 0 && (
                        <Box>
                            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                                Seleccionar archivo Excel
                                <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleArchivoChange} />
                            </Button>
                            {archivo && <Typography sx={{ mt: 1 }}>{archivo.name}</Typography>}
                            {importLoading && <LinearProgress sx={{ mt: 2 }} />}
                            {importPreview.length > 0 && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    {importPreview.filter(c => !c.esDuplicado).length} nuevos, {importPreview.filter(c => c.esDuplicado).length} duplicados
                                </Alert>
                            )}
                        </Box>
                    )}
                    
                    {importTab === 1 && (
                        <Stack spacing={2}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>Importar un contacto individual</Typography>
                                <Stack direction="row" spacing={1}>
                                    <TextField size="small" fullWidth placeholder="Pegar link de Notion..." value={notionPageLink} onChange={(e) => setNotionPageLink(e.target.value)} />
                                    <Button variant="contained" onClick={handleImportarPaginaNotion} disabled={!notionPageLink || importLoading}>Importar</Button>
                                </Stack>
                            </Paper>
                            <Divider>o importar varios</Divider>
                            <FormControl fullWidth size="small">
                                <InputLabel>Filtrar por Sales</InputLabel>
                                <Select value={notionDbId || 'Outbound'} onChange={(e) => setNotionDbId(e.target.value)} label="Filtrar por Sales">
                                    <MenuItem value="Outbound">Outbound</MenuItem>
                                    <MenuItem value="Inbound">Inbound</MenuItem>
                                    <MenuItem value="">Todos</MenuItem>
                                </Select>
                            </FormControl>
                            <Button variant="outlined" onClick={handleBuscarNotion} disabled={importLoading}>
                                {importLoading ? 'Buscando...' : 'Buscar contactos'}
                            </Button>
                            {importLoading && <LinearProgress />}
                            {contactosNotion.length > 0 && (
                                <Alert severity="success">{contactosNotion.length} contactos listos para importar</Alert>
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    <Button color="error" onClick={handleEliminarTodos} disabled={importLoading} size="small">🗑️ Limpiar todo</Button>
                    <Box>
                        <Button onClick={() => { setModalImportar(false); resetImportState(); }}>Cancelar</Button>
                        {importTab === 0 && importPreview.filter(c => !c.esDuplicado).length > 0 && (
                            <Button variant="contained" onClick={handleImportarExcel} disabled={importLoading}>
                                Importar {importPreview.filter(c => !c.esDuplicado).length}
                            </Button>
                        )}
                        {importTab === 1 && contactosNotion.length > 0 && (
                            <Button variant="contained" onClick={handleImportarNotion} disabled={importLoading}>
                                Importar {contactosNotion.length}
                            </Button>
                        )}
                    </Box>
                </DialogActions>
            </Dialog>
        );
    };
    
    const ModalAsignar = () => {
        const [sdrSeleccionado, setSdrSeleccionado] = useState({ id: '', nombre: '' });
        const [sdrsDisponibles, setSdrsDisponibles] = useState([]);
        const [loadingSDRs, setLoadingSDRs] = useState(false);
        const [proximoContactoSeleccionado, setProximoContactoSeleccionado] = useState('24h');
        const [modoAsignacion, setModoAsignacion] = useState('manual'); // 'manual' | 'equitativo'
        const [filtroStatusNotion, setFiltroStatusNotion] = useState('');
        const [sdrsParaDistribuir, setSdrsParaDistribuir] = useState([]); // SDRs seleccionados para distribución equitativa
        
        const botonesProximoContacto = [
            { label: 'Hoy tarde', value: 'tarde' },
            { label: 'Mañana AM', value: 'manana_am' },
            { label: 'Mañana PM', value: 'manana_pm' },
            { label: '3 días', value: '3d' },
            { label: '1 sem', value: '1w' },
            { label: '2 meses', value: '2m' },
        ];
        
        const calcularFechaProximo = (valor) => {
            if (!valor) return null;
            const ahora = new Date();
            const fecha = new Date();
            switch (valor) {
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
        
        // Obtener los contactos filtrados por statusNotion de los seleccionados
        const contactosFiltrados = contactosSeleccionados.map(id => contactos.find(c => c._id === id)).filter(Boolean);
        const contactosPorStatus = filtroStatusNotion 
            ? contactosFiltrados.filter(c => c.statusNotion === filtroStatusNotion)
            : contactosFiltrados;
        
        // Obtener status únicos de los contactos seleccionados
        const statusUnicos = [...new Set(contactosFiltrados.map(c => c.statusNotion).filter(Boolean))];
        
        useEffect(() => {
            if (modalAsignar) {
                setModoAsignacion('manual');
                setFiltroStatusNotion('');
                setSdrsParaDistribuir([]);
                const fetchSDRs = async () => {
                    setLoadingSDRs(true);
                    try {
                        // Buscar usuarios con sdr: true
                        const snapshot = await getDocs(query(
                            collection(db, 'profile'), 
                            where('sdr', '==', true)
                        ));
                        
                        const sdrs = snapshot.docs
                            .filter(doc => {
                                const data = doc.data();
                                if (!data.user_id) {
                                    console.warn(`⚠️ SDR sin user_id excluido: ${data.email} - debe corregirse en Firestore`);
                                    return false;
                                }
                                return true;
                            })
                            .map(doc => {
                                const data = doc.data();
                                return {
                                    id: data.user_id, // Siempre usar Firebase UID
                                    nombre: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email,
                                    email: data.email
                                };
                            });
                        
                        setSdrsDisponibles(sdrs);
                    } catch (error) {
                        console.error('Error al cargar SDRs:', error);
                    } finally {
                        setLoadingSDRs(false);
                    }
                };
                fetchSDRs();
            }
        }, [modalAsignar]);
        
        // Función para asignar equitativamente
        const handleAsignarEquitativo = async () => {
            if (sdrsParaDistribuir.length === 0) {
                mostrarSnackbar('Selecciona al menos un SDR para distribuir', 'warning');
                return;
            }
            
            const contactosAAsignar = contactosPorStatus;
            if (contactosAAsignar.length === 0) {
                mostrarSnackbar('No hay contactos para asignar con el filtro actual', 'warning');
                return;
            }
            
            // Distribuir equitativamente entre los SDRs seleccionados
            const asignaciones = [];
            contactosAAsignar.forEach((contacto, idx) => {
                const sdrIndex = idx % sdrsParaDistribuir.length;
                const sdr = sdrsParaDistribuir[sdrIndex];
                asignaciones.push({
                    contactoId: contacto._id,
                    sdrId: sdr.id, // Siempre es Firebase UID ahora
                    sdrNombre: sdr.nombre
                });
            });
            
            // Agrupar por SDR para hacer las asignaciones
            const porSdr = {};
            asignaciones.forEach(a => {
                if (!porSdr[a.sdrId]) {
                    porSdr[a.sdrId] = { sdrNombre: a.sdrNombre, contactos: [] };
                }
                porSdr[a.sdrId].contactos.push(a.contactoId);
            });
            
            try {
                const proximoContacto = calcularFechaProximo(proximoContactoSeleccionado);
                // Asignar cada grupo
                for (const [sdrId, data] of Object.entries(porSdr)) {
                    await SDRService.asignarContactos(data.contactos, sdrId, data.sdrNombre, empresaId, proximoContacto);
                }
                
                // Mensaje de resumen
                const resumen = Object.entries(porSdr)
                    .map(([_, data]) => `${data.sdrNombre}: ${data.contactos.length}`)
                    .join(', ');
                mostrarSnackbar(`✅ Distribuidos equitativamente - ${resumen}`);
                setContactosSeleccionados([]);
                setModalAsignar(false);
                cargarContactos();
                cargarMetricas();
            } catch (error) {
                mostrarSnackbar('Error al asignar: ' + error.message, 'error');
            }
        };
        
        const toggleSdrDistribuir = (sdr) => {
            setSdrsParaDistribuir(prev => {
                const existe = prev.find(s => s.id === sdr.id);
                if (existe) {
                    return prev.filter(s => s.id !== sdr.id);
                }
                return [...prev, sdr];
            });
        };
        
        return (
            <Dialog open={modalAsignar} onClose={() => setModalAsignar(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Asignar Contactos</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {contactosSeleccionados.length} contacto(s) seleccionado(s)
                    </Typography>
                    
                    {/* Selector de modo */}
                    <Tabs value={modoAsignacion} onChange={(_, v) => setModoAsignacion(v)} sx={{ mb: 2 }}>
                        <Tab value="manual" label="Asignación Manual" />
                        <Tab value="equitativo" label="Distribución Equitativa" />
                    </Tabs>
                    
                    {modoAsignacion === 'manual' && (
                        <>
                            {loadingSDRs ? <CircularProgress size={24} /> : (
                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <InputLabel>SDR</InputLabel>
                                    <Select
                                        value={sdrSeleccionado.id}
                                        label="SDR"
                                        onChange={(e) => {
                                            const sdr = sdrsDisponibles.find(s => s.id === e.target.value);
                                            setSdrSeleccionado(sdr || { id: '', nombre: '' });
                                        }}
                                    >
                                        {sdrsDisponibles.map(sdr => (
                                            <MenuItem key={sdr.id} value={sdr.id}>{sdr.nombre}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                        </>
                    )}
                    
                    {modoAsignacion === 'equitativo' && (
                        <Stack spacing={2}>
                            {/* Filtro por Status Notion */}
                            {statusUnicos.length > 0 && (
                                <FormControl fullWidth size="small">
                                    <InputLabel>Filtrar por Status Notion</InputLabel>
                                    <Select
                                        value={filtroStatusNotion}
                                        label="Filtrar por Status Notion"
                                        onChange={(e) => setFiltroStatusNotion(e.target.value)}
                                    >
                                        <MenuItem value="">Todos ({contactosFiltrados.length})</MenuItem>
                                        {statusUnicos.map((status) => (
                                            <MenuItem key={status} value={status}>
                                                {status} ({contactosFiltrados.filter(c => c.statusNotion === status).length})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                            
                            <Alert severity="info" sx={{ py: 0.5 }}>
                                {contactosPorStatus.length} contactos a distribuir
                            </Alert>
                            
                            {/* Selección de SDRs */}
                            <Typography variant="subtitle2">Selecciona los SDRs para distribuir:</Typography>
                            {loadingSDRs ? <CircularProgress size={24} /> : (
                                <Stack spacing={1}>
                                    {sdrsDisponibles.map(sdr => (
                                        <Paper 
                                            key={sdr.id} 
                                            variant="outlined" 
                                            sx={{ 
                                                p: 1, 
                                                cursor: 'pointer',
                                                bgcolor: sdrsParaDistribuir.find(s => s.id === sdr.id) ? 'primary.light' : 'transparent',
                                                '&:hover': { bgcolor: 'action.hover' }
                                            }}
                                            onClick={() => toggleSdrDistribuir(sdr)}
                                        >
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Checkbox 
                                                    checked={!!sdrsParaDistribuir.find(s => s.id === sdr.id)} 
                                                    size="small"
                                                />
                                                <Typography variant="body2">{sdr.nombre}</Typography>
                                                {sdrsParaDistribuir.find(s => s.id === sdr.id) && contactosPorStatus.length > 0 && (
                                                    <Chip 
                                                        label={`~${Math.ceil(contactosPorStatus.length / sdrsParaDistribuir.length)} contactos`} 
                                                        size="small" 
                                                        color="primary"
                                                    />
                                                )}
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                            )}
                            
                            {sdrsParaDistribuir.length > 0 && contactosPorStatus.length > 0 && (
                                <Alert severity="success" sx={{ py: 0.5 }}>
                                    Se asignarán ~{Math.ceil(contactosPorStatus.length / sdrsParaDistribuir.length)} contactos a cada SDR
                                </Alert>
                            )}
                        </Stack>
                    )}
                    
                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                        Próximo contacto
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {botonesProximoContacto.map(btn => (
                            <Chip
                                key={btn.value}
                                label={btn.label}
                                size="small"
                                color={proximoContactoSeleccionado === btn.value ? 'primary' : 'default'}
                                variant={proximoContactoSeleccionado === btn.value ? 'filled' : 'outlined'}
                                onClick={() => setProximoContactoSeleccionado(btn.value)}
                            />
                        ))}
                        <Chip
                            label="Sin definir"
                            size="small"
                            color={!proximoContactoSeleccionado ? 'default' : 'default'}
                            variant={!proximoContactoSeleccionado ? 'filled' : 'outlined'}
                            onClick={() => setProximoContactoSeleccionado(null)}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalAsignar(false)}>Cancelar</Button>
                    {modoAsignacion === 'manual' && (
                        <Button 
                            variant="contained" 
                            onClick={() => handleAsignarContactos(
                                sdrSeleccionado.id, // Siempre es Firebase UID ahora
                                sdrSeleccionado.nombre,
                                calcularFechaProximo(proximoContactoSeleccionado)
                            )} 
                            disabled={!sdrSeleccionado.id}
                        >
                            Asignar a {sdrSeleccionado.nombre || 'SDR'}
                        </Button>
                    )}
                    {modoAsignacion === 'equitativo' && (
                        <Button 
                            variant="contained" 
                            onClick={handleAsignarEquitativo} 
                            disabled={sdrsParaDistribuir.length === 0 || contactosPorStatus.length === 0}
                        >
                            Distribuir Equitativamente
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        );
    };
    
    const ModalAgregarSDR = () => {
        const [emailSDR, setEmailSDR] = useState('');
        const [loadingAgregar, setLoadingAgregar] = useState(false);
        const [resultado, setResultado] = useState(null);
        const [sdrsActuales, setSdrsActuales] = useState([]);
        const [loadingLista, setLoadingLista] = useState(false);
        
        // Cargar lista de SDRs actuales (usuarios con sdr: true)
        useEffect(() => {
            if (modalAgregarSDR) {
                const fetchSDRsActuales = async () => {
                    setLoadingLista(true);
                    try {
                        // Buscar usuarios con sdr: true
                        const snapshot = await getDocs(query(
                            collection(db, 'profile'), 
                            where('sdr', '==', true)
                        ));
                        
                        setSdrsActuales(snapshot.docs.map(doc => {
                            const data = doc.data();
                            return {
                                id: doc.id,
                                nombre: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email,
                                email: data.email
                            };
                        }));
                    } catch (error) {
                        console.error('Error al cargar SDRs:', error);
                    } finally {
                        setLoadingLista(false);
                    }
                };
                fetchSDRsActuales();
            }
        }, [modalAgregarSDR]);
        
        const handleAgregarSDR = async () => {
            if (!emailSDR.trim()) return;
            setLoadingAgregar(true);
            try {
                // Buscar usuario por email
                const snapshot = await getDocs(query(collection(db, 'profile'), where('email', '==', emailSDR.trim().toLowerCase())));
                if (snapshot.empty) {
                    setResultado({ tipo: 'error', mensaje: 'No se encontró el usuario' });
                    return;
                }
                
                const userDoc = snapshot.docs[0];
                const userData = userDoc.data();
                
                // Verificar si ya es SDR
                if (userData.sdr === true) {
                    setResultado({ tipo: 'warning', mensaje: 'Este usuario ya es SDR' });
                    return;
                }
                
                // Marcar usuario como SDR
                await updateDoc(doc(db, 'profile', userDoc.id), { sdr: true });
                
                setResultado({ tipo: 'success', mensaje: 'SDR agregado correctamente' });
                setEmailSDR('');
                
                // Refrescar lista de SDRs
                setSdrsActuales(prev => [...prev, {
                    id: userDoc.id,
                    nombre: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
                    email: userData.email
                }]);
            } catch (error) {
                console.error('Error al agregar SDR:', error);
                setResultado({ tipo: 'error', mensaje: 'Error al actualizar' });
            } finally {
                setLoadingAgregar(false);
            }
        };
        
        const handleQuitarSDR = async (sdr) => {
            setLoadingAgregar(true);
            try {
                // Quitar el flag sdr del usuario
                await updateDoc(doc(db, 'profile', sdr.id), { sdr: false });
                
                setResultado({ tipo: 'success', mensaje: `${sdr.nombre} ya no es SDR` });
                setSdrsActuales(prev => prev.filter(s => s.id !== sdr.id));
            } catch (error) {
                console.error('Error al quitar SDR:', error);
                setResultado({ tipo: 'error', mensaje: 'Error al quitar SDR' });
            } finally {
                setLoadingAgregar(false);
            }
        };
        
        return (
            <Dialog open={modalAgregarSDR} onClose={() => { setModalAgregarSDR(false); setResultado(null); }} maxWidth="sm" fullWidth>
                <DialogTitle>Gestionar SDRs</DialogTitle>
                <DialogContent>
                    {/* Lista de SDRs actuales */}
                    <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>SDRs actuales</Typography>
                    {loadingLista ? (
                        <CircularProgress size={24} />
                    ) : sdrsActuales.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No hay SDRs configurados</Typography>
                    ) : (
                        <Stack spacing={1} sx={{ mb: 2 }}>
                            {sdrsActuales.map(sdr => (
                                <Stack key={sdr.id} direction="row" alignItems="center" justifyContent="space-between" 
                                    sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                    <Box>
                                        <Typography variant="body2" fontWeight={500}>{sdr.nombre}</Typography>
                                        <Typography variant="caption" color="text.secondary">{sdr.email}</Typography>
                                    </Box>
                                    <IconButton size="small" color="error" onClick={() => handleQuitarSDR(sdr)} disabled={loadingAgregar}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            ))}
                        </Stack>
                    )}
                    
                    <Divider sx={{ my: 2 }} />
                    
                    {/* Agregar nuevo SDR */}
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Agregar nuevo SDR</Typography>
                    <TextField label="Email del usuario" value={emailSDR} onChange={(e) => setEmailSDR(e.target.value)} fullWidth type="email" size="small" />
                    {resultado && <Alert severity={resultado.tipo} sx={{ mt: 2 }}>{resultado.mensaje}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalAgregarSDR(false)}>Cerrar</Button>
                    <Button variant="contained" onClick={handleAgregarSDR} disabled={!emailSDR.trim() || loadingAgregar}>
                        {loadingAgregar ? <CircularProgress size={20} /> : 'Agregar como SDR'}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };
    
    // ==================== RENDER PRINCIPAL ====================
    
    return (
        <>
            <Head>
                <title>Gestión SDR | Sorby</title>
            </Head>
            <Box component="main" sx={{ flexGrow: 1, py: isMobile ? 1 : 3 }}>
                <Container maxWidth="xl" sx={{ px: isMobile ? 1 : 3 }}>
                    {/* Header */}
                    {isMobile ? (
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, px: 1 }}>
                            <Typography variant="h5" fontWeight={700}>Gestión SDR</Typography>
                            <Stack direction="row" spacing={0.5}>
                                <IconButton size="small" onClick={refrescar}>
                                    <RefreshIcon />
                                </IconButton>
                                <IconButton size="small" onClick={() => setModalAgregarSDR(true)}>
                                    <PersonIcon />
                                </IconButton>
                            </Stack>
                        </Stack>
                    ) : (
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                            <Typography variant="h4">Gestión SDR</Typography>
                            <Stack direction="row" spacing={1}>
                                <Button startIcon={<RefreshIcon />} onClick={refrescar}>
                                    Actualizar
                                </Button>
                                <Button variant="outlined" startIcon={<PersonIcon />} onClick={() => setModalAgregarSDR(true)}>
                                    Gestionar SDRs
                                </Button>
                            </Stack>
                        </Stack>
                    )}
                    
                    {/* Tabs */}
                    <Tabs 
                        value={tabActual} 
                        onChange={(_, v) => setTabActual(v)} 
                        sx={{ mb: isMobile ? 2 : 3 }}
                        variant={isMobile ? "fullWidth" : "standard"}
                    >
                        <Tab 
                            icon={<TrendingUpIcon />} 
                            label={isMobile ? "" : "Dashboard"} 
                            iconPosition="start" 
                            sx={{ minWidth: isMobile ? 0 : 'auto' }}
                        />
                        <Tab 
                            icon={<GroupsIcon />} 
                            label={isMobile ? "" : "Contactos"} 
                            iconPosition="start" 
                            sx={{ minWidth: isMobile ? 0 : 'auto' }}
                        />
                        <Tab 
                            icon={
                                <Badge badgeContent={reuniones.length} color="warning">
                                    <EventIcon />
                                </Badge>
                            } 
                            label={
                                isMobile ? "" : (
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <span>Reuniones</span>
                                        {reuniones.length > 0 && <Chip label={reuniones.length} size="small" color="warning" />}
                                    </Stack>
                                )
                            } 
                            iconPosition="start" 
                            sx={{ minWidth: isMobile ? 0 : 'auto' }}
                        />
                    </Tabs>
                    
                    {tabActual === 0 && renderDashboard()}
                    {tabActual === 1 && renderContactos()}
                    {tabActual === 2 && renderReuniones()}
                </Container>
            </Box>
            
            {/* Drawer de detalle - COMPONENTE COMPARTIDO */}
            <DrawerDetalleContactoSDR
                open={modalDetalle}
                onClose={() => setModalDetalle(false)}
                contacto={contactoSeleccionado}
                contactos={contactos}
                indiceActual={indiceContactoActual}
                onCambiarIndice={(nuevoIndice) => {
                    setIndiceContactoActual(nuevoIndice);
                    setContactoSeleccionado(contactos[nuevoIndice]);
                }}
                onAccion={handleAccion}
                onAgregarComentario={handleAgregarComentario}
                onMarcarNoCalifica={handleMarcarNoCalifica}
                onRefresh={refrescar}
                mostrarSnackbar={mostrarSnackbar}
                empresaId={empresaId}
                historialVersion={historialVersion}
            />
            
            {/* Modales */}
            <ModalCrearContacto />
            <ModalNota />
            <ModalCrearReunion
                open={modalReunion}
                onClose={() => setModalReunion(false)}
                contacto={contactoSeleccionado}
                onSubmit={handleRegistrarReunion}
                loading={actionLoading}
            />
            <ModalEvaluarReunion />
            <ModalEditarReunion />
            <ModalImportar />
            <ModalAsignar />
            <ModalAgregarSDR />
            
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
        </>
    );
};

GestionSDRPage.getLayout = (page) => (
    <DashboardLayout>
        {page}
    </DashboardLayout>
);

export default GestionSDRPage;
