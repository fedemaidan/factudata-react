import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
    Box, Container, Stack, Typography, Button, TextField, Chip,
    Table, TableBody, TableCell, TableHead, TableRow,
    CircularProgress, MenuItem, Select, FormControl, InputLabel,
    Snackbar, Alert, Paper, InputAdornment, Grid
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Phone as PhoneIcon,
    WhatsApp as WhatsAppIcon,
    Event as EventIcon,
    CheckCircle as CheckCircleIcon,
    TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import SDRService from 'src/services/sdrService';
import DrawerDetalleContactoSDR, { EstadoChip } from 'src/components/sdr/DrawerDetalleContactoSDR';

const ContactosSDRPage = () => {
    const { user } = useAuthContext();
    const empresaId = user?.empresa?.id || 'demo-empresa';
    const sdrId = user?.user_id || user?.id;

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

    return (
        <>
            <Head>
                <title>Mis Contactos SDR</title>
            </Head>
            <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
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
                                            <TableCell>Segmento</TableCell>
                                            <TableCell>Intentos</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {contactos.map((contacto) => (
                                            <TableRow 
                                                key={contacto._id}
                                                hover
                                                sx={{ cursor: 'pointer' }}
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
                                                    <Chip 
                                                        size="small" 
                                                        variant="outlined"
                                                        label={contacto.segmento === 'outbound' ? 'Outbound' : 'Inbound'} 
                                                    />
                                                </TableCell>
                                                <TableCell>{contacto.cantidadIntentos || 0}</TableCell>
                                            </TableRow>
                                        ))}
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
