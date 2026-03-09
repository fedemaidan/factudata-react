/**
 * BulkRegistrarAccionDialog
 * Modal para registrar acciones masivas sobre contactos SDR seleccionados.
 * Permite seleccionar tipo de acción (llamada, WA, email, etc.), agregar nota
 * y opcionalmente programar próximo contacto.
 */
import { useState, useEffect, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Button, Chip, Stack, TextField,
    Alert, CircularProgress, LinearProgress, Collapse
} from '@mui/material';
import {
    Phone as PhoneIcon,
    PhoneMissed as PhoneMissedIcon,
    WhatsApp as WhatsAppIcon,
    DoNotDisturb as DoNotDisturbIcon,
    Comment as CommentIcon,
    Instagram as InstagramIcon,
    Link as LinkIcon,
    Description as DescriptionIcon,
    Handshake as HandshakeIcon,
    Email as EmailIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import SDRService from '../../services/sdrService';

// Tipos de acción disponibles para bulk (excluimos reunión y no califica que requieren datos individuales)
const TIPOS_ACCION_BULK = [
    {
        id: 'llamada_atendida',
        label: 'Llamada atendida',
        shortLabel: 'Atendió',
        icon: <PhoneIcon />,
        color: 'success',
        canal: 'llamada',
        resultado: 'atendio',
        requiereSeguimiento: false,
    },
    {
        id: 'llamada_no_atendida',
        label: 'Llamada no atendida',
        shortLabel: 'No atendió',
        icon: <PhoneMissedIcon />,
        color: 'warning',
        canal: 'llamada',
        resultado: 'no_atendio',
        requiereSeguimiento: true,
        seguimientoDefault: '3h',
    },
    {
        id: 'whatsapp_enviado',
        label: 'WhatsApp enviado',
        shortLabel: 'WhatsApp',
        icon: <WhatsAppIcon />,
        color: 'info',
        canal: 'whatsapp',
        resultado: 'pendiente',
        requiereSeguimiento: true,
        seguimientoDefault: '24h',
    },
    {
        id: 'nota',
        label: 'Agregar nota',
        shortLabel: 'Nota',
        icon: <CommentIcon />,
        color: 'default',
        canal: 'otro',
        resultado: undefined,
        requiereSeguimiento: false,
    },
    {
        id: 'instagram_contacto',
        label: 'Contacto por Instagram',
        shortLabel: 'Instagram',
        icon: <InstagramIcon />,
        color: 'secondary',
        canal: 'instagram',
        resultado: 'pendiente',
        requiereSeguimiento: true,
        seguimientoDefault: '24h',
    },
    {
        id: 'email_enviado',
        label: 'Email enviado',
        shortLabel: 'Email',
        icon: <EmailIcon />,
        color: 'info',
        canal: 'email',
        resultado: 'pendiente',
        requiereSeguimiento: true,
        seguimientoDefault: '24h',
    },
    {
        id: 'presupuesto_enviado',
        label: 'Presupuesto enviado',
        shortLabel: 'Presupuesto',
        icon: <DescriptionIcon />,
        color: 'primary',
        canal: 'otro',
        resultado: 'pendiente',
        requiereSeguimiento: true,
        seguimientoDefault: '3d',
    },
    {
        id: 'link_pago_enviado',
        label: 'Link de pago enviado',
        shortLabel: 'Link pago',
        icon: <LinkIcon />,
        color: 'success',
        canal: 'otro',
        resultado: 'pendiente',
        requiereSeguimiento: true,
        seguimientoDefault: '24h',
    },
    {
        id: 'negociacion_iniciada',
        label: 'Negociación iniciada',
        shortLabel: 'Negociación',
        icon: <HandshakeIcon />,
        color: 'warning',
        canal: 'otro',
        resultado: 'pendiente',
        requiereSeguimiento: true,
        seguimientoDefault: '3d',
    },
];

const OPCIONES_PROXIMO = [
    { label: '1h', valor: 1, unidad: 'horas' },
    { label: '3h', valor: 3, unidad: 'horas' },
    { label: '24h', valor: 24, unidad: 'horas' },
    { label: '3 días', valor: 3, unidad: 'dias' },
    { label: '1 sem', valor: 7, unidad: 'dias' },
    { label: 'Sin fecha', valor: null, unidad: null },
];

const calcularFecha = (valor, unidad) => {
    if (valor === null) return null;
    const fecha = new Date();
    if (unidad === 'horas') {
        fecha.setHours(fecha.getHours() + valor);
    } else if (unidad === 'dias') {
        fecha.setDate(fecha.getDate() + valor);
    }
    return fecha;
};

/**
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - contactoIds: string[] — IDs de contactos seleccionados
 * - empresaId: string
 * - onComplete: ({ exitosos, fallidos }) => void
 */
export default function BulkRegistrarAccionDialog({ open, onClose, contactoIds = [], empresaId, onComplete }) {
    const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
    const [nota, setNota] = useState('');
    const [proximoLabel, setProximoLabel] = useState(null);
    const [proximoContacto, setProximoContacto] = useState(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [results, setResults] = useState(null);
    const [progress, setProgress] = useState({ done: 0, total: 0 });

    // Reset al abrir
    useEffect(() => {
        if (open) {
            setTipoSeleccionado(null);
            setNota('');
            setProximoLabel(null);
            setProximoContacto(null);
            setSending(false);
            setError('');
            setResults(null);
            setProgress({ done: 0, total: 0 });
        }
    }, [open]);

    // Auto-seleccionar seguimiento por defecto al elegir tipo
    useEffect(() => {
        if (tipoSeleccionado?.requiereSeguimiento && tipoSeleccionado?.seguimientoDefault) {
            const opcion = OPCIONES_PROXIMO.find(o => o.label === tipoSeleccionado.seguimientoDefault);
            if (opcion) {
                setProximoContacto(calcularFecha(opcion.valor, opcion.unidad));
                setProximoLabel(opcion.label);
            }
        } else {
            setProximoContacto(null);
            setProximoLabel(null);
        }
    }, [tipoSeleccionado]);

    const handleSelectProximo = (opcion) => {
        setProximoLabel(opcion.label);
        setProximoContacto(calcularFecha(opcion.valor, opcion.unidad));
    };

    const handleSubmit = async () => {
        if (!tipoSeleccionado) {
            setError('Seleccioná un tipo de acción');
            return;
        }
        if (tipoSeleccionado.id === 'nota' && !nota.trim()) {
            setError('Ingresá una nota');
            return;
        }

        setSending(true);
        setError('');
        const total = contactoIds.length;
        setProgress({ done: 0, total });

        let exitosos = 0;
        let fallidos = 0;
        const errores = [];

        for (const contactoId of contactoIds) {
            try {
                // Registrar la acción
                await SDRService.registrarIntento(contactoId, {
                    tipo: tipoSeleccionado.id === 'nota' ? 'comentario' : tipoSeleccionado.id,
                    canal: tipoSeleccionado.canal,
                    resultado: tipoSeleccionado.resultado || undefined,
                    nota: nota.trim() || undefined,
                    empresaId,
                });

                // Actualizar próximo contacto si corresponde
                if (proximoContacto) {
                    await SDRService.actualizarProximoContacto(contactoId, proximoContacto, empresaId);
                }

                exitosos++;
            } catch (err) {
                fallidos++;
                errores.push({
                    contactoId,
                    error: err.response?.data?.error || err.message,
                });
            }
            setProgress(prev => ({ ...prev, done: prev.done + 1 }));
        }

        const finalResults = { exitosos, fallidos, errores };
        setResults(finalResults);
        setSending(false);

        if (onComplete) onComplete(finalResults);
    };

    const porcentaje = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

    return (
        <Dialog open={open} onClose={sending ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                📝 Registrar acción masiva
                <Typography variant="body2" color="text.secondary">
                    {contactoIds.length} contacto(s) seleccionado(s)
                </Typography>
            </DialogTitle>

            <DialogContent>
                {/* Resultado final */}
                {results && (
                    <Alert
                        severity={results.fallidos === 0 ? 'success' : 'warning'}
                        sx={{ mb: 2 }}
                    >
                        ✅ {results.exitosos} acción(es) registrada(s)
                        {results.fallidos > 0 && ` — ❌ ${results.fallidos} error(es)`}
                    </Alert>
                )}

                {/* Progreso */}
                {sending && (
                    <Box sx={{ mb: 2 }}>
                        <LinearProgress variant="determinate" value={porcentaje} sx={{ mb: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                            Procesando {progress.done} de {progress.total}...
                        </Typography>
                    </Box>
                )}

                {!results && (
                    <>
                        {/* Paso 1: Tipo de acción */}
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Tipo de acción
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                            {TIPOS_ACCION_BULK.map((tipo) => (
                                <Chip
                                    key={tipo.id}
                                    icon={tipo.icon}
                                    label={tipo.shortLabel}
                                    color={tipoSeleccionado?.id === tipo.id ? tipo.color : 'default'}
                                    variant={tipoSeleccionado?.id === tipo.id ? 'filled' : 'outlined'}
                                    onClick={() => {
                                        setTipoSeleccionado(tipo);
                                        setError('');
                                    }}
                                    disabled={sending}
                                    sx={{ cursor: 'pointer' }}
                                />
                            ))}
                        </Stack>

                        {/* Paso 2: Nota (siempre visible si hay tipo seleccionado) */}
                        <Collapse in={!!tipoSeleccionado}>
                            <TextField
                                label="Nota (opcional)"
                                value={nota}
                                onChange={(e) => setNota(e.target.value)}
                                fullWidth
                                multiline
                                minRows={2}
                                maxRows={4}
                                size="small"
                                disabled={sending}
                                placeholder="Ej: Contactados para campaña de marzo..."
                                sx={{ mb: 2 }}
                            />
                        </Collapse>

                        {/* Paso 3: Próximo contacto */}
                        <Collapse in={!!tipoSeleccionado}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Programar próximo contacto
                            </Typography>
                            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
                                {OPCIONES_PROXIMO.map((op) => (
                                    <Chip
                                        key={op.label}
                                        label={op.label}
                                        size="small"
                                        color={proximoLabel === op.label ? 'primary' : 'default'}
                                        variant={proximoLabel === op.label ? 'filled' : 'outlined'}
                                        onClick={() => handleSelectProximo(op)}
                                        disabled={sending}
                                    />
                                ))}
                            </Stack>
                        </Collapse>

                        {error && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                                {error}
                            </Alert>
                        )}
                    </>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={sending}>
                    {results ? 'Cerrar' : 'Cancelar'}
                </Button>
                {!results && (
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={sending || !tipoSeleccionado}
                        startIcon={sending ? <CircularProgress size={18} /> : null}
                    >
                        {sending
                            ? `Procesando (${progress.done}/${progress.total})`
                            : `Registrar en ${contactoIds.length} contacto(s)`}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
