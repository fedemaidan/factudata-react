import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
    Box, Container, Stack, Typography, Button, TextField, Chip,
    Table, TableBody, TableCell, TableHead, TableRow,
    CircularProgress, MenuItem, Select, FormControl, InputLabel,
    Snackbar, Alert, Paper, InputAdornment, Grid, IconButton,
    Card, CardContent, CardActions, Divider, useTheme, useMediaQuery,
    Avatar, Badge, Fab
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
    ArrowUpward as ArrowUpwardIcon
} from '@mui/icons-material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import SDRService from 'src/services/sdrService';
import DrawerDetalleContactoSDR, { EstadoChip } from 'src/components/sdr/DrawerDetalleContactoSDR';

const ContactosSDRPage = () => {
    const { user } = useAuthContext();
    const empresaId = user?.empresa?.id || 'demo-empresa';
    const sdrId = user?.user_id || user?.id;
    
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Estado principal
    const [contactos, setContactos] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    
    // Drawer de contacto
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [contactoSeleccionado, setContactoSeleccionado] = useState(null);
    
    // Métricas del SDR
    const [metricas, setMetricas] = useState(null);
    const [loadingMetricas, setLoadingMetricas] = useState(false);
    
    // Para refrescar historial en drawer
    const [historialVersion, setHistorialVersion] = useState(0);
    
    // Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Cargar contactos asignados al SDR
    const cargarContactos = useCallback(async () => {
        if (!empresaId || !sdrId) return;
        setLoading(true);
        try {
            const params = { 
                empresaId,
                sdrAsignado: sdrId // Solo contactos del SDR logueado
            };
            if (filtroEstado) params.estado = filtroEstado;
            if (busqueda) params.busqueda = busqueda;
            
            const data = await SDRService.listarContactos(params);
            setContactos(data.contactos || []);
        } catch (err) {
            console.error('Error cargando contactos:', err);
            setSnackbar({ open: true, message: 'Error cargando contactos', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, [empresaId, sdrId, filtroEstado, busqueda]);

    // Cargar métricas del SDR
    const cargarMetricas = useCallback(async () => {
        if (!empresaId || !sdrId) return;
        setLoadingMetricas(true);
        try {
            const data = await SDRService.obtenerMetricasDiarias(empresaId, null, sdrId);
            setMetricas(data);
        } catch (err) {
            console.error('Error cargando métricas:', err);
        } finally {
            setLoadingMetricas(false);
        }
    }, [empresaId, sdrId]);

    useEffect(() => {
        cargarContactos();
        cargarMetricas();
    }, [cargarContactos, cargarMetricas]);

    // Abrir drawer
    const handleOpenDrawer = (contacto) => {
        setContactoSeleccionado(contacto);
        setDrawerOpen(true);
    };

    // Manejar acciones desde el drawer
    const handleAccion = async (contacto, tipo, atendida = null) => {
        try {
            if (tipo === 'reunion') {
                // Abrir modal de reunión - por ahora solo mostrar mensaje
                setSnackbar({ open: true, message: 'Función de agendar reunión próximamente', severity: 'info' });
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
            setSnackbar({ open: true, message: 'Marcado como No califica', severity: 'success' });
            cargarContactos();
        } catch (error) {
            setSnackbar({ open: true, message: 'Error', severity: 'error' });
        }
    };

    // Contar por estado
    const contarPorEstado = (estado) => {
        return contactos.filter(c => c.estado === estado).length;
    };
    
    // Verificar si un contacto tiene próximo contacto vencido
    const estaVencido = (contacto) => {
        if (!contacto.proximoContacto) return false;
        return new Date(contacto.proximoContacto) < new Date();
    };
    
    // Ordenar contactos: vencidos primero, luego por próximo contacto
    const contactosOrdenados = [...contactos].sort((a, b) => {
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
                    <Stack direction="row" spacing={1} alignItems="center">
                        {loading && <CircularProgress size={20} />}
                        <IconButton onClick={() => { cargarContactos(); cargarMetricas(); }} size="small">
                            <RefreshIcon />
                        </IconButton>
                    </Stack>
                </Stack>
            </Box>

            {/* Filtros por estado */}
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
                        label={`En Gestión: ${contarPorEstado('en_gestion')}`} 
                        color="warning" 
                        size="small"
                        variant={filtroEstado === 'en_gestion' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'en_gestion' ? '' : 'en_gestion')}
                    />
                    <Chip 
                        label={`Reuniones: ${contarPorEstado('meet')}`} 
                        color="secondary" 
                        size="small"
                        variant={filtroEstado === 'meet' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'meet' ? '' : 'meet')}
                    />
                    <Chip 
                        label={`Calificados: ${contarPorEstado('calificado')}`} 
                        color="success" 
                        size="small"
                        variant={filtroEstado === 'calificado' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'calificado' ? '' : 'calificado')}
                    />
                    <Chip 
                        label={`No Califica: ${contarPorEstado('no_califica')}`} 
                        color="error" 
                        size="small"
                        variant={filtroEstado === 'no_califica' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'no_califica' ? '' : 'no_califica')}
                    />
                    <Chip 
                        label={`No Responde: ${contarPorEstado('no_responde')}`} 
                        size="small"
                        variant={filtroEstado === 'no_responde' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'no_responde' ? '' : 'no_responde')}
                    />
                </Stack>
            </Box>

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
                                elevation={vencido ? 3 : 0}
                                onClick={() => handleOpenDrawer(contacto)}
                                sx={{ 
                                    p: 2,
                                    cursor: 'pointer',
                                    borderRadius: 3,
                                    border: vencido ? 2 : 1,
                                    borderColor: vencido ? 'error.main' : 'divider',
                                    bgcolor: vencido ? 'error.50' : 'white',
                                    '&:active': { bgcolor: 'grey.100' }
                                }}
                            >
                                <Stack direction="row" spacing={2} alignItems="center">
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
                                            width: 48,
                                            height: 48
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
                    <Button
                        startIcon={<RefreshIcon />}
                        onClick={() => { cargarContactos(); cargarMetricas(); }}
                        disabled={loading}
                    >
                        Actualizar
                    </Button>
                </Stack>

                {/* Métricas del día (del SDR) */}
                {metricas && (
                    <Grid container spacing={2}>
                        <Grid item xs={6} sm={4} md={2}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <PhoneIcon color="primary" />
                                <Typography variant="h5">{metricas.llamadasRealizadas}</Typography>
                                <Typography variant="caption">Llamadas hoy</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} sm={4} md={2}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <CheckCircleIcon color="success" />
                                <Typography variant="h5">{metricas.llamadasAtendidas}</Typography>
                                <Typography variant="caption">Atendidas</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} sm={4} md={2}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <WhatsAppIcon sx={{ color: '#25D366' }} />
                                <Typography variant="h5">{metricas.whatsappEnviados}</Typography>
                                <Typography variant="caption">WhatsApp</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} sm={4} md={2}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <EventIcon color="secondary" />
                                <Typography variant="h5">{metricas.reunionesCoordinadas}</Typography>
                                <Typography variant="caption">Reuniones</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} sm={4} md={2}>
                            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
                                <TrendingUpIcon sx={{ color: 'white' }} />
                                <Typography variant="h5" sx={{ color: 'white' }}>{contarPorEstado('nuevo')}</Typography>
                                <Typography variant="caption" sx={{ color: 'white' }}>Nuevos</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} sm={4} md={2}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="h5">{contactos.length}</Typography>
                                <Typography variant="caption">Total asignados</Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                )}

                {/* Estadísticas por estado */}
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip 
                        label={`Nuevos: ${contarPorEstado('nuevo')}`} 
                        color="info" 
                        variant={filtroEstado === 'nuevo' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'nuevo' ? '' : 'nuevo')}
                    />
                    <Chip 
                        label={`En Gestión: ${contarPorEstado('en_gestion')}`} 
                        color="warning" 
                        variant={filtroEstado === 'en_gestion' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'en_gestion' ? '' : 'en_gestion')}
                    />
                    <Chip 
                        label={`Reuniones: ${contarPorEstado('meet')}`} 
                        color="secondary" 
                        variant={filtroEstado === 'meet' ? 'filled' : 'outlined'}
                        onClick={() => setFiltroEstado(filtroEstado === 'meet' ? '' : 'meet')}
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
                </Stack>

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
                                    <TableCell>Nombre</TableCell>
                                    <TableCell>Empresa</TableCell>
                                    <TableCell>Teléfono</TableCell>
                                    <TableCell>Estado</TableCell>
                                    <TableCell>Próximo</TableCell>
                                    <TableCell>Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {contactosOrdenados.map((contacto) => {
                                    const proximo = formatearProximo(contacto.proximoContacto);
                                    const vencido = estaVencido(contacto);
                                    
                                    return (
                                        <TableRow 
                                            key={contacto._id}
                                            hover
                                            sx={{ 
                                                cursor: 'pointer',
                                                bgcolor: vencido ? 'error.50' : 'inherit'
                                            }}
                                            onClick={() => handleOpenDrawer(contacto)}
                                        >
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
                                                {proximo ? (
                                                    <Chip 
                                                        size="small" 
                                                        label={proximo.texto}
                                                        color={proximo.color}
                                                        variant="outlined"
                                                    />
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Stack direction="row" spacing={0.5}>
                                                    <IconButton 
                                                        size="small"
                                                        onClick={(e) => handleLlamarDirecto(e, contacto)}
                                                        sx={{ color: '#4caf50' }}
                                                    >
                                                        <PhoneIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton 
                                                        size="small"
                                                        onClick={(e) => handleWhatsAppDirecto(e, contacto)}
                                                        sx={{ color: '#25D366' }}
                                                    >
                                                        <WhatsAppIcon fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {contactos.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
                onClose={() => setDrawerOpen(false)}
                contacto={contactoSeleccionado}
                contactos={contactos}
                indiceActual={contactos.findIndex(c => c._id === contactoSeleccionado?._id)}
                onCambiarIndice={(nuevoIndice) => setContactoSeleccionado(contactos[nuevoIndice])}
                onAccion={handleAccion}
                onAgregarComentario={handleAgregarComentario}
                onMarcarNoCalifica={handleMarcarNoCalifica}
                onRefresh={() => { cargarContactos(); cargarMetricas(); }}
                mostrarSnackbar={(msg, sev) => setSnackbar({ open: true, message: msg, severity: sev || 'success' })}
                empresaId={empresaId}
                historialVersion={historialVersion}
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
        </>
    );
};

ContactosSDRPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ContactosSDRPage;
