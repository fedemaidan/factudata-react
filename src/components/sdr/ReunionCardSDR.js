import { useState } from 'react';
import {
    Box, Stack, Typography, Chip, Button, IconButton, Tooltip,
    Paper, Card, CardContent, CardActions,
    Menu, MenuItem, ListItemIcon, ListItemText,
    Alert, Collapse, TextField, CircularProgress,
} from '@mui/material';
import {
    Event as EventIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Block as BlockIcon,
    MoreVert as MoreVertIcon,
    ContentCopy as ContentCopyIcon,
    OpenInNew as OpenInNewIcon,
    People as PeopleIcon,
} from '@mui/icons-material';
import { ESTADOS_REUNION } from 'src/constant/sdrConstants';

// ── Constantes internas ──────────────────────────────────────────────────────

const CALIFICACION_MAP = {
    frio:              { label: '❄️ Frío',             color: 'info' },
    tibio:             { label: '🌤️ Tibio',            color: 'warning' },
    caliente:          { label: '🔥 Caliente',          color: 'error' },
    listo_para_cerrar: { label: '🎯 Listo para cerrar', color: 'success' },
};

const BORDER_COLOR_DEFAULT = {
    agendada:  '#2196f3',
    realizada: '#4caf50',
    no_show:   '#f44336',
    cancelada: '#9e9e9e',
};

const getCountdown = (fecha) => {
    if (!fecha) return '';
    const diffMin = Math.round((new Date(fecha) - new Date()) / 60000);
    if (diffMin > 0    && diffMin < 60)    return `En ${diffMin} min`;
    if (diffMin >= 60  && diffMin < 1440)  return `En ${Math.floor(diffMin / 60)}h ${diffMin % 60}min`;
    if (diffMin < 0    && diffMin > -60)   return `Hace ${Math.abs(diffMin)} min`;
    if (diffMin <= -60 && diffMin > -1440) return `Hace ${Math.floor(Math.abs(diffMin) / 60)}h`;
    return '';
};

const getAntiguedadHoras = (fecha) =>
    fecha ? Math.floor((Date.now() - new Date(fecha)) / (1000 * 60 * 60)) : 0;

// ── Componente ───────────────────────────────────────────────────────────────

/**
 * ReunionCardSDR — tarjeta de reunión unificada y reutilizable.
 *
 * Modos:
 *  • "lista"   (cuando se pasa `onVerContacto`): Card con nombre de contacto,
 *               countdown, estado y botones de acción al pie. Ideal para
 *               la página de reuniones (/sdr/reuniones).
 *  • "detalle" (sin `onVerContacto`): Paper compacto con menú de 3 puntos.
 *               Ideal para el tab Reuniones dentro del detalle de contacto.
 *
 * Ambos modos muestran: notas previas (editables), resumen IA, transcripción,
 * próximos pasos, módulos de interés, duración y comentario del SDR.
 */
const ReunionCardSDR = ({
    reunion,

    // Precomputados opcionales — se calculan automáticamente si no se pasan
    estadoConf: estadoConfProp,
    fechaReunion: fechaReunionProp,
    calChip: calChipProp,
    borderColorMap: borderColorMapProp,

    // Contexto de contacto (modo lista — reuniones.js)
    contacto: contactoProp,
    variant,      // 'hoy' | 'proxima' | 'sin_registrar' | 'realizada' | 'no_show'
    mostrarSDR,

    // Acciones
    onCopy,         // (text, label) => void
    onEdit,         // () => void  — reagendar
    onDelete,       // () => void
    onRealizada,    // () => void
    onNoShow,       // () => void
    onCancelada,    // () => void
    onEditarNotas,  // ({ notas, puntosDeDolor, modulosPotenciales }) => void
    onVerContacto,  // () => void  — si se pasa, activa modo lista
    onCopiarLink,   // (link) => void — override para copiar link
}) => {
    const [expandResumen, setExpandResumen]             = useState(false);
    const [expandTranscripcion, setExpandTranscripcion] = useState(false);
    const [expandPreReunion, setExpandPreReunion]       = useState(false);
    const [editandoNotas, setEditandoNotas]             = useState(false);
    const [editNotas, setEditNotas]                     = useState('');
    const [editPuntosDeDolor, setEditPuntosDeDolor]     = useState('');
    const [editModulosPot, setEditModulosPot]           = useState('');
    const [guardandoNotas, setGuardandoNotas]           = useState(false);
    const [menuAnchor, setMenuAnchor]                   = useState(null);
    const [expandComentario, setExpandComentario]       = useState(false);

    // Modo lista (reuniones.js) vs modo detalle ([id].js)
    const modoLista = Boolean(onVerContacto);

    // Resolver props opcionales
    const fechaReunion   = fechaReunionProp ?? (reunion.fecha || reunion.fechaHora);
    const contacto       = contactoProp ?? (reunion.contactoId || {});
    const borderColorMap = borderColorMapProp ?? BORDER_COLOR_DEFAULT;
    const calChip        = calChipProp ?? (reunion.calificacionRapida ? CALIFICACION_MAP[reunion.calificacionRapida] : null);

    const estadoConf = estadoConfProp ?? (() => {
        const esVencida = reunion.estado === 'agendada' && new Date(fechaReunion) < new Date();
        if (esVencida) return { icon: '⏳', label: 'Vencida', color: 'warning' };
        return ESTADOS_REUNION[reunion.estado] || {};
    })();

    const countdown    = getCountdown(fechaReunion);
    const horasAntigua = variant === 'sin_registrar' ? getAntiguedadHoras(fechaReunion) : 0;

    const getBorderColor = () => {
        if (modoLista) {
            if (variant === 'sin_registrar' && horasAntigua > 24) return '#f44336';
            if (variant === 'sin_registrar') return '#ff9800';
            if (variant === 'hoy') return '#2196f3';
            return '#e0e0e0';
        }
        return borderColorMap[reunion.estado] || '#e0e0e0';
    };

    const tienePreReunion = reunion.puntosDeDolor || reunion.modulosPotenciales || reunion.notas;
    const tieneAcciones   = !modoLista && (onEdit || onDelete || onRealizada || onNoShow || onCancelada || onEditarNotas);

    const handleAbrirEditarNotas = () => {
        setEditNotas(reunion.notas || '');
        setEditPuntosDeDolor(reunion.puntosDeDolor || '');
        setEditModulosPot(reunion.modulosPotenciales || '');
        setEditandoNotas(true);
        setExpandPreReunion(true);
        setMenuAnchor(null);
    };

    const handleGuardarNotas = async () => {
        if (!onEditarNotas) return;
        setGuardandoNotas(true);
        try {
            await onEditarNotas({
                notas: editNotas,
                puntosDeDolor: editPuntosDeDolor,
                modulosPotenciales: editModulosPot,
            });
            setEditandoNotas(false);
        } finally {
            setGuardandoNotas(false);
        }
    };

    const handleCopyLink = (link) => {
        if (onCopiarLink) onCopiarLink(link);
        else if (onCopy)  onCopy(link, 'Link');
        else              navigator.clipboard.writeText(link);
    };

    // ── Sub-renders ──────────────────────────────────────────────────────────

    const renderFormNotas = () => (
        <Stack spacing={1} sx={{ mt: 0.5 }}>
            <TextField
                label="Puntos de dolor" size="small" fullWidth multiline rows={2}
                value={editPuntosDeDolor} onChange={(e) => setEditPuntosDeDolor(e.target.value)}
            />
            <TextField
                label="Módulos potenciales" size="small" fullWidth
                value={editModulosPot} onChange={(e) => setEditModulosPot(e.target.value)}
            />
            <TextField
                label="Notas" size="small" fullWidth multiline rows={2}
                value={editNotas} onChange={(e) => setEditNotas(e.target.value)}
            />
            <Stack direction="row" spacing={1}>
                <Button size="small" variant="contained" onClick={handleGuardarNotas} disabled={guardandoNotas}>
                    {guardandoNotas ? <CircularProgress size={16} color="inherit" /> : 'Guardar'}
                </Button>
                <Button size="small" onClick={() => setEditandoNotas(false)}>Cancelar</Button>
            </Stack>
        </Stack>
    );

    const renderPreReunionNotes = () => (
        <>
            {tienePreReunion && (
                <Box sx={{ mt: 1 }}>
                    <Chip
                        label={expandPreReunion ? '▲ Ocultar notas previas' : '▼ Ver notas previas'}
                        size="small" variant="outlined"
                        onClick={() => setExpandPreReunion(v => !v)}
                        sx={{ height: 22, fontSize: '0.7rem' }}
                    />
                    <Collapse in={expandPreReunion}>
                        <Box sx={{ mt: 1, pl: 1, borderLeft: '2px solid #e0e0e0' }}>
                            {editandoNotas ? renderFormNotas() : (
                                <Stack spacing={0.5}>
                                    {reunion.puntosDeDolor && (
                                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                            📌 <strong>Puntos de dolor:</strong> {reunion.puntosDeDolor}
                                        </Typography>
                                    )}
                                    {reunion.modulosPotenciales && (
                                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                            🧩 <strong>Módulos:</strong> {reunion.modulosPotenciales}
                                        </Typography>
                                    )}
                                    {reunion.notas && (
                                        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary', fontStyle: 'italic' }}>
                                            📝 {reunion.notas}
                                        </Typography>
                                    )}
                                </Stack>
                            )}
                        </Box>
                    </Collapse>
                </Box>
            )}
            {!tienePreReunion && onEditarNotas && editandoNotas && (
                <Box sx={{ mt: 1, pl: 1, borderLeft: '2px solid #e0e0e0' }}>
                    {renderFormNotas()}
                </Box>
            )}
        </>
    );

    const renderResumenIA = () => !reunion.resumenIA ? null : (
        <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.50' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    🤖 Resumen IA
                </Typography>
                <Stack direction="row" spacing={0.5}>
                    {onCopy && (
                        <Tooltip title="Copiar resumen">
                            <IconButton size="small" onClick={() => onCopy(reunion.resumenIA, 'Resumen')}>
                                <ContentCopyIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {reunion.resumenIA.length > 300 && (
                        <Chip
                            label={expandResumen ? 'Ver menos' : 'Ver todo'}
                            size="small" variant="outlined"
                            onClick={() => setExpandResumen(v => !v)}
                            sx={{ height: 22, fontSize: '0.7rem' }}
                        />
                    )}
                </Stack>
            </Stack>
            <Typography
                variant="body2"
                sx={{
                    mt: 0.5, whiteSpace: 'pre-line', fontSize: '0.8rem',
                    ...((!expandResumen && reunion.resumenIA.length > 300) ? {
                        maxHeight: 200, overflow: 'hidden', position: 'relative',
                        '&::after': {
                            content: '""', position: 'absolute',
                            bottom: 0, left: 0, right: 0, height: 40,
                            background: 'linear-gradient(transparent, rgba(250,250,250,1))',
                        },
                    } : {}),
                }}
            >
                {reunion.resumenIA}
            </Typography>
        </Paper>
    );

    const renderTranscripcion = () => !reunion.transcripcion ? null : (
        <Paper variant="outlined" sx={{ mt: 1, p: 1.5, bgcolor: '#fafafa' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    📝 Transcripción
                </Typography>
                <Stack direction="row" spacing={0.5}>
                    {onCopy && (
                        <Tooltip title="Copiar transcripción">
                            <IconButton size="small" onClick={() => onCopy(reunion.transcripcion, 'Transcripción')}>
                                <ContentCopyIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Chip
                        label={expandTranscripcion ? 'Ocultar' : 'Mostrar'}
                        size="small" variant="outlined"
                        onClick={() => setExpandTranscripcion(v => !v)}
                        sx={{ height: 22, fontSize: '0.7rem' }}
                    />
                </Stack>
            </Stack>
            {expandTranscripcion && (
                <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-line', fontSize: '0.75rem', color: 'text.secondary', maxHeight: 400, overflow: 'auto' }}>
                    {reunion.transcripcion}
                </Typography>
            )}
        </Paper>
    );

    // Secciones presentes en ambos modos
    const renderCuerpoComun = () => (
        <>
            {renderPreReunionNotes()}

            {reunion.comentario && (
                <Box sx={{ mt: 1, pl: 1, borderLeft: '2px solid #e0e0e0' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', whiteSpace: 'pre-line' }}>
                        💬 {!expandComentario && reunion.comentario.length > 600
                            ? reunion.comentario.substring(0, 600) + '...'
                            : reunion.comentario}
                    </Typography>
                    {reunion.comentario.length > 600 && (
                        <Button
                            size="small"
                            onClick={() => setExpandComentario(v => !v)}
                            sx={{ p: 0, minWidth: 0, fontSize: '0.72rem', mt: 0.25 }}
                        >
                            {expandComentario ? 'Ver menos' : 'Ver más'}
                        </Button>
                    )}
                </Box>
            )}

            {reunion.estado === 'cancelada' && reunion.motivoRechazo && (
                <Typography variant="body2" sx={{ mt: 1, pl: 1, borderLeft: '2px solid #f44336', color: 'error.main' }}>
                    🚫 {reunion.motivoRechazo}
                </Typography>
            )}

            {reunion.estado === 'no_show' && (
                <Typography variant="body2" sx={{ mt: 1, color: 'error.main', fontWeight: 500 }}>
                    ❌ El contacto no se presentó{reunion.notasEvaluador ? ` — ${reunion.notasEvaluador}` : ''}
                </Typography>
            )}

            {renderResumenIA()}
            {renderTranscripcion()}

            {reunion.nextSteps && (
                <Stack direction="row" alignItems="flex-start" spacing={0.5} sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', flex: 1 }}>
                        📋 <strong>Próximos pasos:</strong> {reunion.nextSteps}
                    </Typography>
                    {onCopy && (
                        <Tooltip title="Copiar próximos pasos">
                            <IconButton size="small" onClick={() => onCopy(reunion.nextSteps, 'Próximos pasos')}>
                                <ContentCopyIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            )}

            {reunion.modulosInteres?.length > 0 && (
                <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, alignSelf: 'center' }}>
                        Módulos:
                    </Typography>
                    {reunion.modulosInteres.map(m => (
                        <Chip key={m} label={m} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                    ))}
                </Stack>
            )}

            {reunion.duracionMinutos && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    ⏱️ Duración: {reunion.duracionMinutos} min
                </Typography>
            )}
        </>
    );

    // ══════════════════════════════════════════════════════════════════════════
    // MODO LISTA  (reuniones.js — cuando se pasa onVerContacto)
    // ══════════════════════════════════════════════════════════════════════════
    if (modoLista) {
        return (
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderLeft: `4px solid ${getBorderColor()}` }}>
                <CardContent sx={{ pb: 1, flex: 1, '&:last-child': { pb: 1 } }}>

                    {/* Hora + fecha chip + countdown + estado + calificación + bot + meet# */}
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                            {fechaReunion
                                ? new Date(fechaReunion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                                : 'Sin hora'}
                        </Typography>
                        <Chip
                            icon={<EventIcon fontSize="small" />}
                            label={fechaReunion
                                ? new Date(fechaReunion).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
                                : 'Sin fecha'}
                            size="small" variant="outlined"
                        />
                        {countdown && (
                            <Chip label={countdown} size="small" variant="outlined"
                                color={countdown.startsWith('Hace') ? 'warning' : 'info'} />
                        )}
                        <Chip
                            label={`${estadoConf.icon || ''} ${estadoConf.label || reunion.estado}`}
                            size="small" color={estadoConf.color || 'default'} sx={{ fontWeight: 600 }}
                        />
                        {calChip && <Chip label={calChip.label} size="small" color={calChip.color} />}
                        {reunion.origen === 'auto_calendar' && (
                            <Chip label="🤖 Bot" size="small" color="secondary" variant="outlined" />
                        )}
                        {reunion.numero && (
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                Meet #{reunion.numero}
                            </Typography>
                        )}
                    </Stack>

                    {/* Nombre del contacto */}
                    <Typography variant="body1" fontWeight={500}>
                        {contacto.nombre || reunion.contactoPrincipal || 'Sin nombre'}
                        {(contacto.empresa || reunion.empresaNombre) && (
                            <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                                — {contacto.empresa || reunion.empresaNombre}
                            </Typography>
                        )}
                    </Typography>

                    {mostrarSDR && (contacto.sdrAsignadoNombre || reunion.sdrAsignadoNombre) && (
                        <Chip
                            icon={<PeopleIcon fontSize="small" />}
                            label={contacto.sdrAsignadoNombre || reunion.sdrAsignadoNombre}
                            size="small" variant="outlined" sx={{ mt: 0.5 }}
                        />
                    )}

                    {/* Resumen SDR del contacto */}
                    {(variant === 'hoy' || variant === 'sin_registrar') && contacto.resumenSDR && (
                        <Paper variant="outlined" sx={{ p: 1.5, mt: 1, bgcolor: 'grey.50', maxHeight: 120, overflow: 'auto' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                📋 Resumen SDR
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line', fontSize: '0.8rem' }}>
                                {contacto.resumenSDR.substring(0, 500)}{contacto.resumenSDR.length > 500 ? '...' : ''}
                            </Typography>
                        </Paper>
                    )}

                    {/* Alerta sin registrar */}
                    {variant === 'sin_registrar' && (
                        <Alert severity={horasAntigua > 24 ? 'error' : 'warning'} sx={{ mt: 1, py: 0 }}>
                            {horasAntigua > 24
                                ? `⚠️ Hace más de ${Math.floor(horasAntigua / 24)} día(s) sin registrar`
                                : `Hace ${horasAntigua}h sin registrar`}
                        </Alert>
                    )}

                    {/* Próxima tarea del contacto */}
                    {variant === 'realizada' && (
                        contacto.proximaTarea?.tipo
                            ? <Chip label={`Próximo: ${contacto.proximaTarea.tipo.replace(/_/g, ' ')}`} size="small" color="primary" variant="outlined" sx={{ mt: 1 }} />
                            : <Chip label="⚠️ Sin próximo paso" size="small" color="warning" sx={{ mt: 1 }} />
                    )}

                    {/* Link de reunión */}
                    {reunion.link && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                            <Chip label="Link reunión" size="small" icon={<OpenInNewIcon />}
                                onClick={() => window.open(reunion.link, '_blank')}
                                clickable color="primary" variant="outlined"
                            />
                            <Tooltip title="Copiar link">
                                <IconButton size="small" onClick={() => handleCopyLink(reunion.link)}>
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    )}

                    {renderCuerpoComun()}
                </CardContent>

                <CardActions sx={{ pt: 0, px: 2, pb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                    {(variant === 'hoy' || variant === 'sin_registrar') && (
                        <>
                            <Button size="small" color="success" variant="contained" onClick={onRealizada}>
                                ✅ Realizada
                            </Button>
                            <Button size="small" color="error" variant="outlined" onClick={onNoShow}>
                                ❌ No show
                            </Button>
                        </>
                    )}
                    {variant === 'proxima' && (
                        <Button size="small" variant="outlined" onClick={onCancelada}>Cancelar</Button>
                    )}
                    {variant === 'no_show' && (
                        <Button size="small" variant="contained" onClick={onRealizada}>Reagendar</Button>
                    )}
                    <Button size="small" onClick={onVerContacto} endIcon={<OpenInNewIcon fontSize="small" />}>
                        Ver contacto
                    </Button>
                    {onDelete && (
                        <Tooltip title="Eliminar reunión">
                            <IconButton size="small" color="error" onClick={onDelete} sx={{ ml: 'auto' }}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </CardActions>
            </Card>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MODO DETALLE  ([id].js — sin onVerContacto)
    // Mismo estilo visual que modo lista pero sin nombre de contacto y con
    // menú de 3 puntos para las acciones secundarias (reagendar, cancelar,
    // editar notas, eliminar).
    // ══════════════════════════════════════════════════════════════════════════
    const menuAcciones = tieneAcciones && (
        <Box sx={{ ml: 'auto', flexShrink: 0 }}>
            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
                <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                {onEdit && (
                    <MenuItem onClick={() => { setMenuAnchor(null); onEdit(); }}>
                        <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>Reagendar</ListItemText>
                    </MenuItem>
                )}
                {onCancelada && (
                    <MenuItem onClick={() => { setMenuAnchor(null); onCancelada(); }}>
                        <ListItemIcon><BlockIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>Cancelar</ListItemText>
                    </MenuItem>
                )}
                {onEditarNotas && (
                    <MenuItem onClick={handleAbrirEditarNotas}>
                        <ListItemIcon><EditIcon fontSize="small" color="info" /></ListItemIcon>
                        <ListItemText>Editar notas previas</ListItemText>
                    </MenuItem>
                )}
                {onDelete && (
                    <MenuItem onClick={() => { setMenuAnchor(null); onDelete(); }}>
                        <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                        <ListItemText sx={{ color: 'error.main' }}>Eliminar</ListItemText>
                    </MenuItem>
                )}
            </Menu>
        </Box>
    );

    return (
        <Card
            variant="outlined"
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderLeft: `4px solid ${getBorderColor()}`,
            }}
        >
            <CardContent sx={{ pb: 1, flex: 1, '&:last-child': { pb: 1 } }}>
                {/* Hora + fecha chip + countdown + estado + calificación + meet# + menú */}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                        {fechaReunion
                            ? new Date(fechaReunion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                            : 'Sin hora'}
                    </Typography>
                    <Chip
                        icon={<EventIcon fontSize="small" />}
                        label={fechaReunion
                            ? new Date(fechaReunion).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
                            : 'Sin fecha'}
                        size="small" variant="outlined"
                    />
                    {countdown && (
                        <Chip label={countdown} size="small" variant="outlined"
                            color={countdown.startsWith('Hace') ? 'warning' : 'info'} />
                    )}
                    <Chip
                        label={`${estadoConf.icon || ''} ${estadoConf.label || reunion.estado}`}
                        size="small" color={estadoConf.color || 'default'} sx={{ fontWeight: 600 }}
                    />
                    {calChip && (
                        <Chip label={calChip.label} size="small" color={calChip.color} variant="outlined" />
                    )}
                    {reunion.origen === 'auto_calendar' && (
                        <Chip label="🤖 Bot" size="small" color="secondary" variant="outlined" />
                    )}
                    {reunion.numero && (
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Meet #{reunion.numero}
                        </Typography>
                    )}
                    {menuAcciones}
                </Stack>

                {/* Link de reunión */}
                {reunion.link && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                        <Chip label="Link reunión" size="small" icon={<OpenInNewIcon />}
                            onClick={() => window.open(reunion.link, '_blank')}
                            clickable color="primary" variant="outlined"
                        />
                        <Tooltip title="Copiar link">
                            <IconButton size="small" onClick={() => handleCopyLink(reunion.link)}>
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                )}

                {renderCuerpoComun()}
            </CardContent>

            {/* Botones de acción primaria inline (como en modo lista) */}
            {(onRealizada || onNoShow) && (
                <CardActions sx={{ pt: 0, px: 2, pb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                    {onRealizada && (
                        <Button size="small" color="success" variant="contained" onClick={onRealizada}>
                            ✅ Realizada
                        </Button>
                    )}
                    {onNoShow && (
                        <Button size="small" color="error" variant="outlined" onClick={onNoShow}>
                            ❌ No show
                        </Button>
                    )}
                </CardActions>
            )}
        </Card>
    );
};

export default ReunionCardSDR;
