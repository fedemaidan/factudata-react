import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
    Box, Container, Stack, Typography, Button, Chip, Grid,
    CircularProgress, Paper, IconButton,
    Snackbar, Alert, TextField,
    Accordion, AccordionSummary, AccordionDetails,
    List, ListItem, ListItemText, ListItemSecondaryAction,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    Tooltip, Divider, MenuItem, FormControl, InputLabel, Select,
    Popover, Badge
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Sync as SyncIcon,
    CalendarMonth as CalendarIcon,
    Email as EmailIcon,
    People as PeopleIcon,
    Settings as SettingsIcon,
    PowerSettingsNew as PowerIcon,
    VerifiedUser as VerifiedIcon,
    Edit as EditIcon,
    FilterList as FilterListIcon
} from '@mui/icons-material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import SDRService from 'src/services/sdrService';

// ==================== SECCIÓN: CALENDARIOS ====================

const SeccionCalendarios = ({ snack }) => {
    const [calendarios, setCalendarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [nuevoCalendar, setNuevoCalendar] = useState({ calendarId: '', sdrId: '', sdrNombre: '', calendarUrl: '' });
    const [verificando, setVerificando] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [equipo, setEquipo] = useState([]);
    const [editandoUrl, setEditandoUrl] = useState(null); // _id del cal que se está editando
    const [urlTmp, setUrlTmp] = useState('');
    const [kwPopover, setKwPopover] = useState({ anchorEl: null, calId: null });
    const [kwActuales, setKwActuales] = useState([]);
    const [kwNueva, setKwNueva] = useState('');

    const handleCargar = useCallback(async () => {
        try {
            setLoading(true);
            const data = await SDRService.adminListarCalendarios();
            setCalendarios(data);
        } catch (e) {
            snack('Error cargando calendarios: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [snack]);

    const handleCargarEquipo = useCallback(async () => {
        try {
            const data = await SDRService.adminObtenerEquipoSDR();
            setEquipo(data);
        } catch (e) { /* ignore */ }
    }, []);

    useEffect(() => { handleCargar(); handleCargarEquipo(); }, [handleCargar, handleCargarEquipo]);

    const handleAgregar = async () => {
        if (!nuevoCalendar.calendarId || !nuevoCalendar.sdrId) return;
        try {
            setGuardando(true);
            await SDRService.adminAgregarCalendario(nuevoCalendar);
            snack('Calendario agregado', 'success');
            setDialogOpen(false);
            setNuevoCalendar({ calendarId: '', sdrId: '', sdrNombre: '', calendarUrl: '' });
            handleCargar();
            handleCargarEquipo();
        } catch (e) {
            snack(e.response?.data?.error || e.message, 'error');
        } finally {
            setGuardando(false);
        }
    };

    const handleToggle = async (id, activo) => {
        try {
            await SDRService.adminToggleCalendario(id, !activo);
            snack(activo ? 'Calendario desactivado' : 'Calendario activado', 'success');
            handleCargar();
        } catch (e) {
            snack('Error: ' + e.message, 'error');
        }
    };

    const handleAbrirKeywords = (e, cal) => {
        setKwPopover({ anchorEl: e.currentTarget, calId: cal._id });
        setKwActuales(cal.keywordsFiltro || []);
        setKwNueva('');
    };

    const handleCerrarKeywords = () => {
        setKwPopover({ anchorEl: null, calId: null });
        handleCargar();
    };

    const handleAgregarKeyword = async () => {
        const kw = kwNueva.trim();
        if (!kw || !kwPopover.calId) return;
        if (kwActuales.map(k => k.toLowerCase()).includes(kw.toLowerCase())) return;
        const nuevos = [...kwActuales, kw];
        try {
            await SDRService.adminActualizarCalendarioFiltro(kwPopover.calId, nuevos);
            setKwActuales(nuevos);
            setKwNueva('');
        } catch (e) {
            snack('Error: ' + e.message, 'error');
        }
    };

    const handleQuitarKeyword = async (keyword) => {
        const nuevos = kwActuales.filter(k => k !== keyword);
        try {
            await SDRService.adminActualizarCalendarioFiltro(kwPopover.calId, nuevos);
            setKwActuales(nuevos);
        } catch (e) {
            snack('Error: ' + e.message, 'error');
        }
    };

    const handleEliminar = async (id) => {
        if (!confirm('¿Eliminar este calendario?')) return;
        try {
            await SDRService.adminEliminarCalendario(id);
            snack('Calendario eliminado', 'success');
            handleCargar();
        } catch (e) {
            snack('Error: ' + e.message, 'error');
        }
    };

    const handleGuardarUrl = async (calId) => {
        try {
            await SDRService.adminActualizarCalendarUrl(calId, urlTmp.trim());
            snack('URL de agendamiento actualizada', 'success');
            setEditandoUrl(null);
            handleCargar();
        } catch (e) {
            snack('Error guardando URL: ' + e.message, 'error');
        }
    };

    const handleVerificar = async (calendarId) => {
        try {
            setVerificando(calendarId);
            const res = await SDRService.adminVerificarCalendario(calendarId);
            if (res.ok) {
                snack(`✅ Calendario accesible: ${res.summary || calendarId}`, 'success');
            } else {
                snack(`❌ Sin acceso: ${res.error}`, 'error');
            }
        } catch (e) {
            snack('Error verificando: ' + e.message, 'error');
        } finally {
            setVerificando(null);
        }
    };

    return (
        <>
            <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarIcon color="primary" />
                        <Typography variant="h6">Calendarios Conectados</Typography>
                        <Chip label={calendarios.length} size="small" />
                    </Stack>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button startIcon={<AddIcon />} variant="contained" size="small"
                                onClick={() => setDialogOpen(true)}>
                                Agregar calendario
                            </Button>
                        </Box>
                        {loading ? (
                            <CircularProgress size={24} sx={{ alignSelf: 'center' }} />
                        ) : calendarios.length === 0 ? (
                            <Typography color="text.secondary" textAlign="center" py={2}>
                                No hay calendarios configurados
                            </Typography>
                        ) : (
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Calendar ID</TableCell>
                                            <TableCell>Vendedor</TableCell>
                                            <TableCell>URL Agendamiento</TableCell>
                                            <TableCell align="center">Estado</TableCell>
                                            <TableCell align="right">Acciones</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {calendarios.map((cal) => (
                                            <TableRow key={cal._id}>
                                                <TableCell sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <Typography variant="body2" noWrap>{cal.calendarId}</Typography>
                                                </TableCell>
                                                <TableCell>{cal.sdrNombre}</TableCell>
                                                <TableCell sx={{ maxWidth: 260 }}>
                                                    {editandoUrl === cal._id ? (
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            autoFocus
                                                            placeholder="https://calendar.app.google/..."
                                                            value={urlTmp}
                                                            onChange={(e) => setUrlTmp(e.target.value)}
                                                            onBlur={() => handleGuardarUrl(cal._id)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleGuardarUrl(cal._id);
                                                                if (e.key === 'Escape') setEditandoUrl(null);
                                                            }}
                                                            InputProps={{ sx: { fontSize: '0.875rem' } }}
                                                        />
                                                    ) : (
                                                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ cursor: 'pointer' }}
                                                            onClick={() => { setEditandoUrl(cal._id); setUrlTmp(cal.calendarUrl || ''); }}>
                                                            <Typography variant="body2" noWrap color={cal.calendarUrl ? 'text.primary' : 'text.disabled'}>
                                                                {cal.calendarUrl || 'Sin configurar (usa default)'}
                                                            </Typography>
                                                            <EditIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                                                        </Stack>
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={cal.activo ? 'Activo' : 'Inactivo'}
                                                        color={cal.activo ? 'success' : 'default'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                        <Tooltip title="Verificar acceso">
                                                            <IconButton size="small" onClick={() => handleVerificar(cal.calendarId)}
                                                                disabled={verificando === cal.calendarId}>
                                                                {verificando === cal.calendarId ?
                                                                    <CircularProgress size={16} /> : <VerifiedIcon fontSize="small" />}
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title={`Filtro por palabras clave: ${(cal.keywordsFiltro || []).length > 0 ? (cal.keywordsFiltro || []).join(', ') : 'sin filtro (todos los eventos)'}`}>
                                                            <IconButton size="small" onClick={(e) => handleAbrirKeywords(e, cal)}>
                                                                <Badge badgeContent={(cal.keywordsFiltro || []).length} color="primary" invisible={(cal.keywordsFiltro || []).length === 0}>
                                                                    <FilterListIcon fontSize="small" color={(cal.keywordsFiltro || []).length > 0 ? 'primary' : 'disabled'} />
                                                                </Badge>
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title={cal.activo ? 'Desactivar' : 'Activar'}>
                                                            <IconButton size="small" onClick={() => handleToggle(cal._id, cal.activo)}>
                                                                <PowerIcon fontSize="small" color={cal.activo ? 'success' : 'disabled'} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Eliminar">
                                                            <IconButton size="small" color="error" onClick={() => handleEliminar(cal._id)}>
                                                                <DeleteIcon fontSize="small" />
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
                    </Stack>
                </AccordionDetails>
            </Accordion>

            {/* Popover: gestión de keywords de filtro */}
            <Popover
                open={Boolean(kwPopover.anchorEl)}
                anchorEl={kwPopover.anchorEl}
                onClose={handleCerrarKeywords}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{ sx: { p: 2, minWidth: 300, maxWidth: 380 } }}
            >
                <Typography variant="subtitle2" gutterBottom>Filtrar eventos por palabras clave</Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                    Solo se procesan eventos cuyo título contenga alguna de estas palabras. Si no hay palabras configuradas, se procesan todos.
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5} mb={1.5} minHeight={24}>
                    {kwActuales.length === 0 && (
                        <Typography variant="caption" color="text.disabled">Sin filtro — se procesan todos los eventos</Typography>
                    )}
                    {kwActuales.map(kw => (
                        <Chip key={kw} label={kw} size="small" onDelete={() => handleQuitarKeyword(kw)} />
                    ))}
                </Stack>
                <Stack direction="row" spacing={1}>
                    <TextField
                        size="small"
                        placeholder="Ej: Demo, Meet, Comercial"
                        value={kwNueva}
                        onChange={e => setKwNueva(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAgregarKeyword()}
                        sx={{ flex: 1 }}
                    />
                    <Button
                        size="small"
                        variant="contained"
                        onClick={handleAgregarKeyword}
                        disabled={!kwNueva.trim()}
                    >Agregar</Button>
                </Stack>
            </Popover>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Agregar Calendario</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Calendar ID (email del calendario)"
                            placeholder="usuario@empresa.com"
                            fullWidth
                            value={nuevoCalendar.calendarId}
                            onChange={(e) => setNuevoCalendar(p => ({ ...p, calendarId: e.target.value }))}
                            helperText="Email del calendario de Google compartido con la cuenta de servicio"
                        />
                        <FormControl fullWidth>
                            <InputLabel>Vendedor SDR</InputLabel>
                            <Select
                                value={nuevoCalendar.sdrId}
                                label="Vendedor SDR"
                                onChange={(e) => {
                                    const sdr = equipo.find(s => s.sdrId === e.target.value);
                                    setNuevoCalendar(p => ({
                                        ...p,
                                        sdrId: e.target.value,
                                        sdrNombre: sdr?.nombre || ''
                                    }));
                                }}
                            >
                                {equipo.filter(s => !s.calendario).map((s) => (
                                    <MenuItem key={s.sdrId} value={s.sdrId}>{s.nombre}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="URL de agendamiento (opcional)"
                            placeholder="https://calendar.app.google/..."
                            fullWidth
                            value={nuevoCalendar.calendarUrl}
                            onChange={(e) => setNuevoCalendar(p => ({ ...p, calendarUrl: e.target.value }))}
                            helperText="Link público para agendar reunión. Si no se configura, se usa la URL por defecto."
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleAgregar} variant="contained" disabled={guardando || !nuevoCalendar.calendarId || !nuevoCalendar.sdrId}>
                        {guardando ? <CircularProgress size={20} /> : 'Agregar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

// ==================== SECCIÓN: EMAILS INTERNOS ====================

const SeccionEmailsInternos = ({ snack }) => {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nuevoEmail, setNuevoEmail] = useState('');
    const [guardando, setGuardando] = useState(false);

    const handleCargar = useCallback(async () => {
        try {
            setLoading(true);
            const data = await SDRService.adminObtenerEmailsInternos();
            setEmails(data);
        } catch (e) {
            snack('Error cargando emails: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [snack]);

    useEffect(() => { handleCargar(); }, [handleCargar]);

    const handleAgregar = async () => {
        const email = nuevoEmail.trim().toLowerCase();
        if (!email || !email.includes('@')) return;
        if (emails.includes(email)) {
            snack('Ese email ya está en la lista', 'warning');
            return;
        }
        try {
            setGuardando(true);
            await SDRService.adminActualizarEmailsInternos([...emails, email]);
            snack('Email agregado', 'success');
            setNuevoEmail('');
            handleCargar();
        } catch (e) {
            snack('Error: ' + e.message, 'error');
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = async (emailToRemove) => {
        try {
            await SDRService.adminActualizarEmailsInternos(emails.filter(e => e !== emailToRemove));
            snack('Email eliminado', 'success');
            handleCargar();
        } catch (e) {
            snack('Error: ' + e.message, 'error');
        }
    };

    return (
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <EmailIcon color="primary" />
                    <Typography variant="h6">Emails Internos</Typography>
                    <Chip label={emails.length} size="small" />
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                        Emails de tu equipo que se excluyen al buscar invitados externos en los eventos de calendario.
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            size="small"
                            label="Nuevo email"
                            placeholder="vendedor@empresa.com"
                            value={nuevoEmail}
                            onChange={(e) => setNuevoEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAgregar()}
                            sx={{ flex: 1 }}
                        />
                        <Button variant="contained" size="small" onClick={handleAgregar}
                            disabled={guardando || !nuevoEmail.trim()}>
                            Agregar
                        </Button>
                    </Stack>
                    {loading ? (
                        <CircularProgress size={24} sx={{ alignSelf: 'center' }} />
                    ) : emails.length === 0 ? (
                        <Typography color="text.secondary" textAlign="center" py={1}>
                            No hay emails internos configurados
                        </Typography>
                    ) : (
                        <List dense>
                            {emails.map((email) => (
                                <ListItem key={email} divider>
                                    <ListItemText primary={email} />
                                    <ListItemSecondaryAction>
                                        <IconButton edge="end" size="small" color="error"
                                            onClick={() => handleEliminar(email)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
};

// ==================== SECCIÓN: ESTADO DEL SYNC ====================

const SeccionSyncStatus = ({ snack }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sincronizando, setSincronizando] = useState(false);

    const handleCargar = useCallback(async () => {
        try {
            setLoading(true);
            const data = await SDRService.adminObtenerSyncStatus();
            setStatus(data);
        } catch (e) {
            snack('Error cargando status: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [snack]);

    useEffect(() => { handleCargar(); }, [handleCargar]);

    const handleForzarSync = async () => {
        try {
            setSincronizando(true);
            await SDRService.forzarCalendarSync();
            snack('Sincronización ejecutada', 'success');
            handleCargar();
        } catch (e) {
            snack('Error: ' + e.message, 'error');
        } finally {
            setSincronizando(false);
        }
    };

    const formatFecha = (f) => f ? new Date(f).toLocaleString('es-AR') : 'Nunca';

    return (
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <SyncIcon color="primary" />
                    <Typography variant="h6">Estado del Sync</Typography>
                    {status && (
                        <Chip
                            icon={status.schedulerActivo ? <CheckCircleIcon /> : <ErrorIcon />}
                            label={status.schedulerActivo ? 'Activo' : 'Inactivo'}
                            color={status.schedulerActivo ? 'success' : 'default'}
                            size="small"
                        />
                    )}
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                {loading ? (
                    <CircularProgress size={24} sx={{ alignSelf: 'center', display: 'block', mx: 'auto' }} />
                ) : !status ? (
                    <Typography color="text.secondary">No se pudo cargar el estado</Typography>
                ) : (
                    <Stack spacing={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={6} md={3}>
                                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                    <Typography variant="h4" color="primary">{status.stats?.total ?? 0}</Typography>
                                    <Typography variant="body2" color="text.secondary">Eventos total</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                    <Typography variant="h4" color="success.main">{status.stats?.matched ?? 0}</Typography>
                                    <Typography variant="body2" color="text.secondary">Matcheados</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                    <Typography variant="h4" color="warning.main">{status.stats?.unmatched ?? 0}</Typography>
                                    <Typography variant="body2" color="text.secondary">Pendientes</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                    <Typography variant="h4" color="text.secondary">{status.stats?.ignorado ?? 0}</Typography>
                                    <Typography variant="body2" color="text.secondary">Ignorados</Typography>
                                </Paper>
                            </Grid>
                        </Grid>

                        <Divider />

                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack spacing={0.5}>
                                <Typography variant="body2">
                                    <strong>Último sync:</strong> {formatFecha(status.ultimoSync)}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Sync token:</strong> {status.syncToken === 'configurado' ? '✅ Configurado' : '❌ Sin configurar'}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Intervalo:</strong> cada {status.intervaloMinutos ?? '?'} minutos
                                </Typography>
                            </Stack>
                            <Button
                                variant="outlined"
                                startIcon={sincronizando ? <CircularProgress size={16} /> : <SyncIcon />}
                                onClick={handleForzarSync}
                                disabled={sincronizando}
                            >
                                Sincronizar ahora
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </AccordionDetails>
        </Accordion>
    );
};

// ==================== SECCIÓN: EQUIPO SDR ====================

const SeccionEquipo = ({ snack }) => {
    const [equipo, setEquipo] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleCargar = useCallback(async () => {
        try {
            setLoading(true);
            const data = await SDRService.adminObtenerEquipoSDR();
            setEquipo(data);
        } catch (e) {
            snack('Error cargando equipo: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [snack]);

    useEffect(() => { handleCargar(); }, [handleCargar]);

    return (
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <PeopleIcon color="primary" />
                    <Typography variant="h6">Equipo SDR</Typography>
                    <Chip label={equipo.length} size="small" />
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                        Usuarios con acceso al módulo SDR y sus estadísticas de reuniones.
                    </Typography>
                    {loading ? (
                        <CircularProgress size={24} sx={{ alignSelf: 'center' }} />
                    ) : equipo.length === 0 ? (
                        <Typography color="text.secondary" textAlign="center" py={1}>
                            No hay usuarios SDR configurados
                        </Typography>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Nombre</TableCell>
                                        <TableCell align="center">Contactos</TableCell>
                                        <TableCell align="center">Reuniones</TableCell>
                                        <TableCell align="center">Calendario</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {equipo.map((u) => (
                                        <TableRow key={u.sdrId}>
                                            <TableCell>{u.nombre || '-'}</TableCell>
                                            <TableCell align="center">{u.contactos ?? 0}</TableCell>
                                            <TableCell align="center">{u.reunionesActivas ?? 0}</TableCell>
                                            <TableCell align="center">
                                                {u.calendario ? (
                                                    <Chip label="Conectado" color="success" size="small" />
                                                ) : (
                                                    <Chip label="Sin calendario" size="small" />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
};

// ==================== PÁGINA PRINCIPAL ====================

const AdminSDRPage = () => {
    useAuthContext();
    const [snackState, setSnackState] = useState({ open: false, message: '', severity: 'info' });

    const snack = useCallback((message, severity = 'info') => {
        setSnackState({ open: true, message, severity });
    }, []);

    return (
        <>
            <Head>
                <title>Admin SDR | Sorby</title>
            </Head>
            <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
                <Container maxWidth="lg">
                    <Stack spacing={3}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                                <SettingsIcon />
                                <Typography variant="h4">Admin SDR</Typography>
                            </Stack>
                        </Stack>

                        <SeccionCalendarios snack={snack} />
                        <SeccionEmailsInternos snack={snack} />
                        <SeccionSyncStatus snack={snack} />
                        <SeccionEquipo snack={snack} />
                    </Stack>
                </Container>
            </Box>

            <Snackbar
                open={snackState.open}
                autoHideDuration={4000}
                onClose={() => setSnackState(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackState.severity} onClose={() => setSnackState(s => ({ ...s, open: false }))}>
                    {snackState.message}
                </Alert>
            </Snackbar>
        </>
    );
};

AdminSDRPage.getLayout = (page) => (
    <DashboardLayout>{page}</DashboardLayout>
);

export default AdminSDRPage;
