import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
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

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import SDRService from 'src/services/sdrService';
import { useAuthContext } from 'src/contexts/auth-context';
import * as XLSX from 'xlsx';

// Componente compartido del Drawer
import DrawerDetalleContactoSDR, { EstadoChip } from 'src/components/sdr/DrawerDetalleContactoSDR';

// ==================== CONSTANTES ====================

const ESTADOS_CONTACTO = {
    nuevo: { label: 'Nuevo', color: 'info' },
    en_gestion: { label: 'En gestión', color: 'warning' },
    meet: { label: 'Meet', color: 'primary' },
    calificado: { label: 'Calificado', color: 'success' },
    no_califica: { label: 'No califica', color: 'error' },
    no_responde: { label: 'No responde', color: 'default' }
};

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
        ordenarPor: 'updatedAt',
        ordenDir: 'desc'
    });
    const [page, setPage] = useState(1);
    const [historialVersion, setHistorialVersion] = useState(0);
    
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
    
    // Estado para importación
    const [importTab, setImportTab] = useState(0);
    const [importPreview, setImportPreview] = useState([]);
    const [importLoading, setImportLoading] = useState(false);
    const [notionDbId, setNotionDbId] = useState('Outbound');
    const [contactosNotion, setContactosNotion] = useState([]);
    const [schemaNotion, setSchemaNotion] = useState(null);
    
    // Obtener usuario del contexto de auth
    const { user, isLoading: authLoading } = useAuthContext();
    const userId = user?.id || user?.user_id;
    const empresaId = user?.empresa?.id || 'demo-empresa';
    const sdrId = user?.user_id || user?.id;
    const sdrNombre = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'SDR';
    
    // Control de carga inicial
    const initialLoadDone = useRef(false);
    const prevFilters = useRef({ page: 1, filtros: {} });
    
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
            const data = await SDRService.listarReuniones({ estado: 'pendiente' });
            setReuniones(data.reuniones);
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
    
    const handleEvaluarReunion = async (estado, motivoRechazo, notasEvaluador) => {
        if (!modalEvaluar.reunion) return;
        try {
            await SDRService.evaluarReunion(modalEvaluar.reunion._id, {
                estado,
                motivoRechazo,
                notasEvaluador
            });
            mostrarSnackbar(`Reunión ${estado === 'aprobada' ? 'aprobada' : 'rechazada'}`);
            setModalEvaluar({ open: false, reunion: null });
            cargarReuniones();
            cargarContactos();
            cargarMetricas();
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error al evaluar reunión', 'error');
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
                        onClick={() => setTabActual(3)}
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
            
            {/* Reuniones pendientes */}
            <Typography variant="h6" sx={{ mb: 2 }}>
                Reuniones pendientes de evaluación
                {reuniones.length > 0 && (
                    <Chip label={reuniones.length} color="warning" size="small" sx={{ ml: 1 }} />
                )}
            </Typography>
            {reuniones.length === 0 ? (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                    No hay reuniones pendientes de evaluación
                </Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Contacto</TableCell>
                                <TableCell>Empresa</TableCell>
                                <TableCell>Tamaño</TableCell>
                                <TableCell>Fecha reunión</TableCell>
                                <TableCell>SDR</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reuniones.slice(0, 5).map(reunion => (
                                <TableRow key={reunion._id}>
                                    <TableCell>{reunion.contactoPrincipal}</TableCell>
                                    <TableCell>{reunion.empresaNombre}</TableCell>
                                    <TableCell><Chip label={reunion.tamanoEmpresa} size="small" variant="outlined" /></TableCell>
                                    <TableCell>
                                        {new Date(reunion.fechaHora).toLocaleString('es-AR', {
                                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </TableCell>
                                    <TableCell>{reunion.registradoPorNombre}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {reuniones.length > 5 && (
                        <Box sx={{ p: 1, textAlign: 'center' }}>
                            <Button size="small" onClick={() => setTabActual(3)}>
                                Ver todas ({reuniones.length})
                            </Button>
                        </Box>
                    )}
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
                        <IconButton onClick={() => setModalImportar(true)}>
                            <UploadFileIcon />
                        </IconButton>
                        <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
                            <MoreVertIcon />
                        </IconButton>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                        <Chip
                            label="Todos"
                            size="small"
                            color={!filtros.estado ? 'primary' : 'default'}
                            variant={!filtros.estado ? 'filled' : 'outlined'}
                            onClick={() => setFiltros({ ...filtros, estado: '' })}
                        />
                        {Object.entries(ESTADOS_CONTACTO).map(([key, { label, color }]) => (
                            <Chip
                                key={key}
                                label={label}
                                size="small"
                                color={filtros.estado === key ? color : 'default'}
                                variant={filtros.estado === key ? 'filled' : 'outlined'}
                                onClick={() => setFiltros({ ...filtros, estado: key })}
                            />
                        ))}
                        <Chip
                            label="Sin asignar"
                            size="small"
                            color={filtros.soloSinAsignar ? 'secondary' : 'default'}
                            variant={filtros.soloSinAsignar ? 'filled' : 'outlined'}
                            onClick={() => setFiltros({ ...filtros, soloSinAsignar: !filtros.soloSinAsignar })}
                        />
                    </Stack>
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
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                        <TextField
                            size="small"
                            placeholder="Buscar..."
                            value={filtros.busqueda}
                            onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                            }}
                            sx={{ minWidth: 200 }}
                        />
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Estado</InputLabel>
                            <Select
                                value={filtros.estado}
                                label="Estado"
                                onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                {Object.entries(ESTADOS_CONTACTO).map(([key, { label }]) => (
                                    <MenuItem key={key} value={key}>{label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant={filtros.soloSinAsignar ? 'contained' : 'outlined'}
                            size="small"
                            startIcon={<PeopleOutlineIcon />}
                            onClick={() => setFiltros({ ...filtros, soloSinAsignar: !filtros.soloSinAsignar })}
                        >
                            Sin asignar
                        </Button>
                        <Box sx={{ flexGrow: 1 }} />
                        <Button startIcon={<RefreshIcon />} onClick={refrescar}>
                            Actualizar
                        </Button>
                        <Button startIcon={<DownloadIcon />} onClick={handleExportar}>
                            Exportar
                        </Button>
                        <Button startIcon={<UploadFileIcon />} onClick={() => setModalImportar(true)}>
                            Importar
                        </Button>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalCrear(true)}>
                            Nuevo
                        </Button>
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
                                    setContactoSeleccionado(contacto);
                                    setIndiceContactoActual(idx);
                                    setModalDetalle(true);
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
                                            </Typography>
                                            <EstadoChip estado={contacto.estado} />
                                        </Stack>
                                        {contacto.empresa && (
                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                {contacto.empresa}
                                            </Typography>
                                        )}
                                        <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                                            {contacto.sdrAsignadoNombre ? (
                                                <Chip label={contacto.sdrAsignadoNombre} size="small" variant="outlined" />
                                            ) : (
                                                <Chip label="Pool" size="small" variant="outlined" color="secondary" />
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
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                        Mostrando {contactos.length} de {totalContactos}
                    </Typography>
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
                                    <TableCell>Teléfono</TableCell>
                                    <TableCell>Estado</TableCell>
                                    <TableCell>SDR</TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={filtros.ordenarPor === 'ultimaAccion'}
                                            direction={filtros.ordenarPor === 'ultimaAccion' ? filtros.ordenDir : 'desc'}
                                            onClick={() => setFiltros({
                                                ...filtros,
                                                ordenarPor: 'ultimaAccion',
                                                ordenDir: filtros.ordenarPor === 'ultimaAccion' && filtros.ordenDir === 'desc' ? 'asc' : 'desc'
                                            })}
                                        >
                                            Última
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={filtros.ordenarPor === 'proximoContacto'}
                                            direction={filtros.ordenarPor === 'proximoContacto' ? filtros.ordenDir : 'asc'}
                                            onClick={() => setFiltros({
                                                ...filtros,
                                                ordenarPor: 'proximoContacto',
                                                ordenDir: filtros.ordenarPor === 'proximoContacto' && filtros.ordenDir === 'asc' ? 'desc' : 'asc'
                                            })}
                                        >
                                            Próximo
                                        </TableSortLabel>
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {contactos.map((contacto, idx) => (
                                    <TableRow 
                                        key={contacto._id} 
                                        hover 
                                        sx={{ cursor: 'pointer' }}
                                        onClick={() => { 
                                            setContactoSeleccionado(contacto); 
                                            setIndiceContactoActual(idx);
                                            setModalDetalle(true); 
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
                                            {contacto.cargo && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {contacto.cargo}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>{contacto.empresa || '-'}</TableCell>
                                        <TableCell>{contacto.telefono}</TableCell>
                                        <TableCell><EstadoChip estado={contacto.estado} /></TableCell>
                                        <TableCell>
                                            {contacto.sdrAsignadoNombre || <Chip label="Pool" size="small" variant="outlined" color="secondary" />}
                                        </TableCell>
                                        <TableCell>
                                            {contacto.ultimaAccion 
                                                ? new Date(contacto.ultimaAccion).toLocaleDateString('es-AR') 
                                                : '-'
                                            }
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
                                            ) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    
                    <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            Mostrando {contactos.length} de {totalContactos} contactos
                        </Typography>
                    </Stack>
                </>
            )}
        </Box>
    );
    
    // ==================== RENDER REUNIONES ====================
    
    const renderReuniones = () => (
        <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Todas las reuniones pendientes de evaluación</Typography>
            
            {reuniones.length === 0 ? (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                    No hay reuniones pendientes de evaluación
                </Alert>
            ) : (
                <Grid container spacing={2}>
                    {reuniones.map(reunion => (
                        <Grid item xs={12} md={6} lg={4} key={reunion._id}>
                            <Card>
                                <CardContent>
                                    <Stack spacing={1}>
                                        <Typography variant="h6">{reunion.empresaNombre}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {reunion.contactoPrincipal} {reunion.rolContacto && `- ${reunion.rolContacto}`}
                                        </Typography>
                                        <Divider />
                                        <Stack direction="row" spacing={1}>
                                            <Chip label={reunion.tamanoEmpresa} size="small" />
                                            <Chip 
                                                label={new Date(reunion.fechaHora).toLocaleString('es-AR', {
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
                                    <Stack direction="row" spacing={1}>
                                        <Button 
                                            variant="contained" 
                                            color="success" 
                                            size="small"
                                            startIcon={<ThumbUpIcon />}
                                            fullWidth
                                            onClick={() => setModalEvaluar({ open: true, reunion })}
                                        >
                                            Aprobar
                                        </Button>
                                        <Button 
                                            variant="outlined" 
                                            color="error" 
                                            size="small"
                                            startIcon={<ThumbDownIcon />}
                                            fullWidth
                                            onClick={() => setModalEvaluar({ open: true, reunion })}
                                        >
                                            Rechazar
                                        </Button>
                                    </Stack>
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
    
    // ==================== RENDER ASIGNACIÓN (VISTA KANBAN) ====================
    
    const [sdrsConContactos, setSdrsConContactos] = useState([]);
    const [contactosSinAsignar, setContactosSinAsignar] = useState([]);
    const [loadingAsignacion, setLoadingAsignacion] = useState(false);
    const [seleccionAsignacion, setSeleccionAsignacion] = useState([]); // IDs seleccionados para mover
    
    const cargarVistaAsignacion = async () => {
        setLoadingAsignacion(true);
        try {
            // Cargar todos los contactos
            const params = { limit: 500 };
            const data = await SDRService.listarContactos(params);
            const todosContactos = data.contactos || [];
            
            // Cargar SDRs disponibles
            const snapshot = await getDocs(query(collection(db, 'profile'), where('sdr', '==', true)));
            const sdrsBase = snapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    id: d.user_id || doc.id,
                    docId: doc.id,
                    nombre: `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.email,
                    email: d.email,
                    contactos: [],
                    metricas: { llamadas: 0, whatsapp: 0, reuniones: 0 }
                };
            });
            
            // Separar sin asignar y agrupar por SDR
            const sinAsignar = todosContactos.filter(c => !c.sdrAsignado);
            setContactosSinAsignar(sinAsignar);
            
            // Asignar contactos a cada SDR
            const sdrsConData = sdrsBase.map(sdr => ({
                ...sdr,
                contactos: todosContactos.filter(c => c.sdrAsignado === sdr.id)
            }));
            
            // Obtener métricas del día para cada SDR
            if (metricas?.metricasPorSDR) {
                sdrsConData.forEach(sdr => {
                    const metricaSDR = metricas.metricasPorSDR.find(m => m.sdrId === sdr.id);
                    if (metricaSDR) {
                        sdr.metricas = {
                            llamadas: metricaSDR.llamadasRealizadas || 0,
                            whatsapp: metricaSDR.whatsappEnviados || 0,
                            reuniones: metricaSDR.reunionesCoordinadas || 0
                        };
                    }
                });
            }
            
            setSdrsConContactos(sdrsConData);
        } catch (error) {
            console.error('Error cargando vista asignación:', error);
            mostrarSnackbar('Error cargando vista de asignación', 'error');
        } finally {
            setLoadingAsignacion(false);
        }
    };
    
    // Cargar vista asignación cuando se entra al tab
    useEffect(() => {
        if (tabActual === 1) {
            cargarVistaAsignacion();
        }
    }, [tabActual, metricas]);
    
    const handleSeleccionarParaAsignar = (contactoId) => {
        setSeleccionAsignacion(prev => 
            prev.includes(contactoId) 
                ? prev.filter(id => id !== contactoId)
                : [...prev, contactoId]
        );
    };
    
    const handleAsignarASDR = async (sdrId, sdrNombre) => {
        if (seleccionAsignacion.length === 0) return;
        try {
            await SDRService.asignarContactos(seleccionAsignacion, sdrId, sdrNombre, empresaId, null);
            mostrarSnackbar(`${seleccionAsignacion.length} contacto(s) asignado(s) a ${sdrNombre}`);
            setSeleccionAsignacion([]);
            cargarVistaAsignacion();
            cargarMetricas();
        } catch (error) {
            mostrarSnackbar('Error al asignar', 'error');
        }
    };
    
    const handleMoverAPool = async (contactoIds) => {
        try {
            await SDRService.desasignarContactos(contactoIds, empresaId);
            mostrarSnackbar(`${contactoIds.length} contacto(s) movido(s) al pool`);
            setSeleccionAsignacion([]);
            cargarVistaAsignacion();
        } catch (error) {
            mostrarSnackbar('Error al desasignar', 'error');
        }
    };
    
    const renderAsignacion = () => (
        <Box>
            {/* Header con acciones */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">
                    Asignación de Contactos
                    {seleccionAsignacion.length > 0 && (
                        <Chip label={`${seleccionAsignacion.length} seleccionados`} color="primary" size="small" sx={{ ml: 1 }} />
                    )}
                </Typography>
                <Stack direction="row" spacing={1}>
                    {seleccionAsignacion.length > 0 && (
                        <Button size="small" onClick={() => setSeleccionAsignacion([])}>
                            Limpiar selección
                        </Button>
                    )}
                    <Button startIcon={<RefreshIcon />} onClick={cargarVistaAsignacion} disabled={loadingAsignacion}>
                        Actualizar
                    </Button>
                </Stack>
            </Stack>
            
            {loadingAsignacion && <LinearProgress sx={{ mb: 2 }} />}
            
            {/* Vista de columnas */}
            <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                overflowX: 'auto', 
                pb: 2,
                minHeight: 400
            }}>
                {/* Columna Pool (sin asignar) */}
                <Paper 
                    sx={{ 
                        minWidth: 280, 
                        maxWidth: 320,
                        bgcolor: 'grey.50',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <Box sx={{ p: 2, bgcolor: 'secondary.main', color: 'white' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1" fontWeight={700}>
                                🗂️ Pool (Sin asignar)
                            </Typography>
                            <Chip label={contactosSinAsignar.length} size="small" sx={{ bgcolor: 'white', fontWeight: 700 }} />
                        </Stack>
                    </Box>
                    <Box sx={{ p: 1, flex: 1, overflowY: 'auto', maxHeight: 500 }}>
                        {contactosSinAsignar.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                                No hay contactos sin asignar
                            </Typography>
                        ) : (
                            <Stack spacing={1}>
                                {contactosSinAsignar.slice(0, 50).map(contacto => (
                                    <Paper
                                        key={contacto._id}
                                        elevation={seleccionAsignacion.includes(contacto._id) ? 4 : 1}
                                        sx={{
                                            p: 1.5,
                                            cursor: 'pointer',
                                            border: seleccionAsignacion.includes(contacto._id) ? 2 : 0,
                                            borderColor: 'primary.main',
                                            '&:hover': { bgcolor: 'grey.100' }
                                        }}
                                        onClick={() => handleSeleccionarParaAsignar(contacto._id)}
                                    >
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Checkbox 
                                                size="small" 
                                                checked={seleccionAsignacion.includes(contacto._id)}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={() => handleSeleccionarParaAsignar(contacto._id)}
                                            />
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={600} noWrap>
                                                    {contacto.nombre}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {contacto.empresa || contacto.telefono}
                                                </Typography>
                                            </Box>
                                            <EstadoChip estado={contacto.estado} />
                                        </Stack>
                                    </Paper>
                                ))}
                                {contactosSinAsignar.length > 50 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                                        +{contactosSinAsignar.length - 50} más
                                    </Typography>
                                )}
                            </Stack>
                        )}
                    </Box>
                </Paper>
                
                {/* Columnas por SDR */}
                {sdrsConContactos.map(sdr => (
                    <Paper 
                        key={sdr.id}
                        sx={{ 
                            minWidth: 280, 
                            maxWidth: 320,
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        {/* Header del SDR */}
                        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        {sdr.nombre}
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                        {sdr.email}
                                    </Typography>
                                </Box>
                                <Chip label={sdr.contactos.length} size="small" sx={{ bgcolor: 'white', fontWeight: 700 }} />
                            </Stack>
                            {/* Métricas del día */}
                            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <PhoneIcon sx={{ fontSize: 14 }} />
                                    <Typography variant="caption">{sdr.metricas.llamadas}</Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <WhatsAppIcon sx={{ fontSize: 14 }} />
                                    <Typography variant="caption">{sdr.metricas.whatsapp}</Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <EventIcon sx={{ fontSize: 14 }} />
                                    <Typography variant="caption">{sdr.metricas.reuniones}</Typography>
                                </Stack>
                            </Stack>
                        </Box>
                        
                        {/* Botón para asignar seleccionados a este SDR */}
                        {seleccionAsignacion.length > 0 && (
                            <Box sx={{ p: 1, bgcolor: 'primary.light' }}>
                                <Button 
                                    fullWidth 
                                    size="small" 
                                    variant="contained"
                                    onClick={() => handleAsignarASDR(sdr.id, sdr.nombre)}
                                >
                                    Asignar {seleccionAsignacion.length} aquí
                                </Button>
                            </Box>
                        )}
                        
                        {/* Lista de contactos del SDR */}
                        <Box sx={{ p: 1, flex: 1, overflowY: 'auto', maxHeight: 450 }}>
                            {sdr.contactos.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                                    Sin contactos asignados
                                </Typography>
                            ) : (
                                <Stack spacing={1}>
                                    {sdr.contactos.slice(0, 30).map(contacto => {
                                        const vencido = contacto.proximoContacto && new Date(contacto.proximoContacto) < new Date();
                                        return (
                                            <Paper
                                                key={contacto._id}
                                                elevation={0}
                                                sx={{
                                                    p: 1.5,
                                                    bgcolor: vencido ? 'error.50' : 'grey.50',
                                                    borderLeft: 3,
                                                    borderColor: vencido ? 'error.main' : 'primary.light'
                                                }}
                                            >
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="body2" fontWeight={600} noWrap>
                                                            {contacto.nombre}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" noWrap>
                                                            {contacto.empresa || contacto.telefono}
                                                        </Typography>
                                                        {contacto.proximoContacto && (
                                                            <Typography variant="caption" color={vencido ? 'error.main' : 'text.secondary'} display="block">
                                                                ⏰ {new Date(contacto.proximoContacto).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                    <Stack direction="row" spacing={0.5}>
                                                        <EstadoChip estado={contacto.estado} />
                                                        <Tooltip title="Mover al pool">
                                                            <IconButton 
                                                                size="small" 
                                                                onClick={() => handleMoverAPool([contacto._id])}
                                                            >
                                                                <PersonOffIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </Stack>
                                            </Paper>
                                        );
                                    })}
                                    {sdr.contactos.length > 30 && (
                                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                                            +{sdr.contactos.length - 30} más
                                        </Typography>
                                    )}
                                </Stack>
                            )}
                        </Box>
                    </Paper>
                ))}
                
                {/* Columna para agregar SDR */}
                <Paper 
                    sx={{ 
                        minWidth: 200, 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'grey.100',
                        border: '2px dashed',
                        borderColor: 'grey.300',
                        cursor: 'pointer',
                        '&:hover': { borderColor: 'primary.main', bgcolor: 'grey.50' }
                    }}
                    onClick={() => setModalAgregarSDR(true)}
                >
                    <Stack alignItems="center" spacing={1}>
                        <AddIcon sx={{ fontSize: 40, color: 'grey.400' }} />
                        <Typography color="text.secondary">Agregar SDR</Typography>
                    </Stack>
                </Paper>
            </Box>
            
            {/* Resumen rápido */}
            <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                <Stack direction="row" spacing={4} justifyContent="center">
                    <Box textAlign="center">
                        <Typography variant="h5" color="secondary.main" fontWeight={700}>
                            {contactosSinAsignar.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Sin asignar</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box textAlign="center">
                        <Typography variant="h5" color="primary.main" fontWeight={700}>
                            {sdrsConContactos.reduce((acc, sdr) => acc + sdr.contactos.length, 0)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Asignados</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box textAlign="center">
                        <Typography variant="h5" fontWeight={700}>
                            {sdrsConContactos.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">SDRs activos</Typography>
                    </Box>
                </Stack>
            </Paper>
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
    
    const ModalReunion = () => {
        const [form, setForm] = useState({
            fechaHora: '',
            empresaNombre: contactoSeleccionado?.empresa || '',
            tamanoEmpresa: '',
            contactoPrincipal: contactoSeleccionado?.nombre || '',
            rolContacto: contactoSeleccionado?.cargo || '',
            puntosDeDolor: '',
            modulosPotenciales: '',
            linkAgenda: ''
        });
        
        useEffect(() => {
            if (contactoSeleccionado) {
                setForm(prev => ({
                    ...prev,
                    empresaNombre: contactoSeleccionado.empresa || '',
                    contactoPrincipal: contactoSeleccionado.nombre || '',
                    rolContacto: contactoSeleccionado.cargo || ''
                }));
            }
        }, [contactoSeleccionado]);
        
        return (
            <Dialog open={modalReunion} onClose={() => setModalReunion(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Registrar Reunión</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField label="Fecha y hora *" type="datetime-local" value={form.fechaHora} onChange={(e) => setForm({ ...form, fechaHora: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} required />
                        <TextField label="Nombre de la empresa *" value={form.empresaNombre} onChange={(e) => setForm({ ...form, empresaNombre: e.target.value })} fullWidth required />
                        <FormControl fullWidth required>
                            <InputLabel>Tamaño de empresa *</InputLabel>
                            <Select value={form.tamanoEmpresa} label="Tamaño de empresa *" onChange={(e) => setForm({ ...form, tamanoEmpresa: e.target.value })}>
                                {TAMANOS_EMPRESA.map(t => (<MenuItem key={t} value={t}>{t} empleados</MenuItem>))}
                            </Select>
                        </FormControl>
                        <TextField label="Contacto principal *" value={form.contactoPrincipal} onChange={(e) => setForm({ ...form, contactoPrincipal: e.target.value })} fullWidth required />
                        <TextField label="Rol del contacto" value={form.rolContacto} onChange={(e) => setForm({ ...form, rolContacto: e.target.value })} fullWidth placeholder="Ej: Gerente, Dueño, etc." />
                        <TextField label="Puntos de dolor" value={form.puntosDeDolor} onChange={(e) => setForm({ ...form, puntosDeDolor: e.target.value })} fullWidth multiline rows={2} placeholder="¿Qué problemas tiene la empresa?" />
                        <TextField label="Módulos potenciales" value={form.modulosPotenciales} onChange={(e) => setForm({ ...form, modulosPotenciales: e.target.value })} fullWidth placeholder="Ej: Facturación, Stock, etc." />
                        <TextField label="Link de la reunión" value={form.linkAgenda} onChange={(e) => setForm({ ...form, linkAgenda: e.target.value })} fullWidth placeholder="Google Meet, Zoom, etc." />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalReunion(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={() => handleRegistrarReunion(form)} disabled={!form.fechaHora || !form.empresaNombre || !form.tamanoEmpresa || !form.contactoPrincipal || actionLoading}>
                        {actionLoading ? <CircularProgress size={20} /> : 'Registrar Reunión'}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };
    
    const ModalEvaluarReunion = () => {
        const [motivoRechazo, setMotivoRechazo] = useState('');
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
                            <Typography>{new Date(reunion.fechaHora).toLocaleString('es-AR')}</Typography>
                        </Box>
                        {reunion.puntosDeDolor && (
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">Puntos de dolor</Typography>
                                <Typography>{reunion.puntosDeDolor}</Typography>
                            </Box>
                        )}
                        <Divider />
                        <TextField label="Notas del evaluador" value={notasEvaluador} onChange={(e) => setNotasEvaluador(e.target.value)} fullWidth multiline rows={2} />
                        <TextField label="Motivo de rechazo (requerido si rechazás)" value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} fullWidth />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalEvaluar({ open: false, reunion: null })}>Cancelar</Button>
                    <Button variant="contained" color="error" startIcon={<ThumbDownIcon />} onClick={() => handleEvaluarReunion('rechazada', motivoRechazo, notasEvaluador)} disabled={!motivoRechazo}>
                        Rechazar
                    </Button>
                    <Button variant="contained" color="success" startIcon={<ThumbUpIcon />} onClick={() => handleEvaluarReunion('aprobada', null, notasEvaluador)}>
                        Aprobar
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
            try {
                const resultado = await SDRService.importarContactos(contactosAImportar, empresaId, 'excel');
                mostrarSnackbar(`✅ Importados: ${resultado.importados}`);
                setModalImportar(false);
                resetImportState();
                cargarContactos();
                cargarMetricas();
            } catch (error) {
                mostrarSnackbar('Error al importar', 'error');
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
            try {
                const resultado = await SDRService.importarContactos(contactosNotion, empresaId, 'notion');
                mostrarSnackbar(`✅ Importados: ${resultado.importados}${resultado.duplicados > 0 ? ` | ⚠️ Ya existían: ${resultado.duplicados}` : ''}`);
                setModalImportar(false);
                resetImportState();
                cargarContactos();
                cargarMetricas();
            } catch (error) {
                mostrarSnackbar(error.response?.data?.error || 'Error al importar', 'error');
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
        
        const botonesProximoContacto = [
            { label: '1h', value: '1h' },
            { label: '3h', value: '3h' },
            { label: '24h', value: '24h' },
            { label: '3 días', value: '3d' },
            { label: '1 sem', value: '1w' },
        ];
        
        const calcularFechaProximo = (valor) => {
            if (!valor) return null;
            const ahora = new Date();
            switch (valor) {
                case '1h': return new Date(ahora.getTime() + 1 * 60 * 60 * 1000);
                case '3h': return new Date(ahora.getTime() + 3 * 60 * 60 * 1000);
                case '24h': return new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
                case '3d': return new Date(ahora.getTime() + 3 * 24 * 60 * 60 * 1000);
                case '1w': return new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
                default: return null;
            }
        };
        
        useEffect(() => {
            if (modalAsignar) {
                const fetchSDRs = async () => {
                    setLoadingSDRs(true);
                    try {
                        // Buscar usuarios con sdr: true
                        const snapshot = await getDocs(query(
                            collection(db, 'profile'), 
                            where('sdr', '==', true)
                        ));
                        
                        setSdrsDisponibles(snapshot.docs.map(doc => {
                            const data = doc.data();
                            return {
                                id: doc.id,
                                visibleId: data.user_id || doc.id,
                                nombre: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email,
                                email: data.email
                            };
                        }));
                    } catch (error) {
                        console.error('Error al cargar SDRs:', error);
                    } finally {
                        setLoadingSDRs(false);
                    }
                };
                fetchSDRs();
            }
        }, [modalAsignar]);
        
        return (
            <Dialog open={modalAsignar} onClose={() => setModalAsignar(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Asignar Contactos</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {contactosSeleccionados.length} contacto(s) seleccionado(s)
                    </Typography>
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
                    
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
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
                    <Button 
                        variant="contained" 
                        onClick={() => handleAsignarContactos(
                            sdrSeleccionado.visibleId || sdrSeleccionado.id, 
                            sdrSeleccionado.nombre,
                            calcularFechaProximo(proximoContactoSeleccionado)
                        )} 
                        disabled={!sdrSeleccionado.id}
                    >
                        Asignar
                    </Button>
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
                            icon={<AssignmentIndIcon />} 
                            label={isMobile ? "" : "Asignación"} 
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
                    {tabActual === 1 && renderAsignacion()}
                    {tabActual === 2 && renderContactos()}
                    {tabActual === 3 && renderReuniones()}
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
            <ModalReunion />
            <ModalEvaluarReunion />
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
