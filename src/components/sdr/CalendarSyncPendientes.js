import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, CardActions, Button, Grid,
    Chip, Stack, CircularProgress, Skeleton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert
} from '@mui/material';
import {
    Link as LinkIcon,
    VisibilityOff as VisibilityOffIcon,
    Sync as SyncIcon
} from '@mui/icons-material';
import SDRService from 'src/services/sdrService';

const formatearFecha = (fecha) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const CalendarSyncPendientes = ({ empresaId, onVinculado }) => {
    const [pendientes, setPendientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState(null);

    const [vincularDialog, setVincularDialog] = useState(false);
    const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
    const [contactoIdInput, setContactoIdInput] = useState('');

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await SDRService.listarCalendarPendientes({ empresaId });
            setPendientes(data.items || []);
            setTotal(data.total || 0);
        } catch (err) {
            setError(err.message || 'Error cargando eventos pendientes');
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    useEffect(() => { cargar(); }, [cargar]);

    const handleForzarSync = async () => {
        setSyncing(true);
        try {
            await SDRService.forzarCalendarSync();
            await cargar();
        } catch (err) {
            setError(err.message);
        } finally {
            setSyncing(false);
        }
    };

    const handleIgnorar = async (syncEventId) => {
        setActionLoading(syncEventId);
        try {
            await SDRService.ignorarCalendarEvento(syncEventId);
            setPendientes(prev => prev.filter(p => p._id !== syncEventId));
            setTotal(prev => prev - 1);
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleAbrirVincular = (evento) => {
        setEventoSeleccionado(evento);
        setContactoIdInput('');
        setVincularDialog(true);
    };

    const handleConfirmarVincular = async () => {
        if (!contactoIdInput.trim() || !eventoSeleccionado) return;
        setActionLoading(eventoSeleccionado._id);
        try {
            await SDRService.vincularCalendarEvento(eventoSeleccionado._id, contactoIdInput.trim());
            setPendientes(prev => prev.filter(p => p._id !== eventoSeleccionado._id));
            setTotal(prev => prev - 1);
            setVincularDialog(false);
            onVinculado?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <Grid container spacing={2}>
                {[1, 2, 3].map(i => (
                    <Grid item xs={12} md={6} key={i}>
                        <Skeleton variant="rounded" height={120} />
                    </Grid>
                ))}
            </Grid>
        );
    }

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    {total} evento{total !== 1 ? 's' : ''} sin vincular
                </Typography>
                <Button
                    size="small"
                    startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
                    onClick={handleForzarSync}
                    disabled={syncing}
                >
                    Sincronizar ahora
                </Button>
            </Stack>

            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {pendientes.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                        No hay eventos pendientes de vincular
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {pendientes.map(evento => (
                        <Grid item xs={12} md={6} key={evento._id}>
                            <Card variant="outlined">
                                <CardContent sx={{ pb: 1 }}>
                                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                                        {evento.titulo || 'Sin título'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {formatearFecha(evento.fechaInicio)}
                                    </Typography>
                                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                                        {evento.emailInvitado && (
                                            <Chip label={evento.emailInvitado} size="small" variant="outlined" />
                                        )}
                                        {evento.nombreInvitado && (
                                            <Chip label={evento.nombreInvitado} size="small" />
                                        )}
                                        {evento.telefonoExtraido && (
                                            <Chip label={evento.telefonoExtraido} size="small" color="info" variant="outlined" />
                                        )}
                                    </Stack>
                                </CardContent>
                                <CardActions>
                                    <Button size="small" startIcon={<LinkIcon />} onClick={() => handleAbrirVincular(evento)}>
                                        Vincular
                                    </Button>
                                    <Button
                                        size="small"
                                        color="inherit"
                                        startIcon={actionLoading === evento._id ? <CircularProgress size={16} /> : <VisibilityOffIcon />}
                                        onClick={() => handleIgnorar(evento._id)}
                                        disabled={actionLoading === evento._id}
                                    >
                                        Ignorar
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Dialog open={vincularDialog} onClose={() => setVincularDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Vincular evento con contacto</DialogTitle>
                <DialogContent>
                    {eventoSeleccionado && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2">{eventoSeleccionado.titulo}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {formatearFecha(eventoSeleccionado.fechaInicio)}
                                {eventoSeleccionado.emailInvitado && ` · ${eventoSeleccionado.emailInvitado}`}
                            </Typography>
                        </Box>
                    )}
                    <TextField
                        fullWidth
                        label="ID del Contacto"
                        value={contactoIdInput}
                        onChange={(e) => setContactoIdInput(e.target.value)}
                        placeholder="Pegar ID del contacto desde la ficha"
                        helperText="Copiá el ID del contacto desde la vista de detalle"
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setVincularDialog(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmarVincular}
                        disabled={!contactoIdInput.trim() || !!actionLoading}
                    >
                        {actionLoading ? <CircularProgress size={20} /> : 'Vincular y crear reunión'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CalendarSyncPendientes;
