import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
    Box, Container, Stack, Typography, Button, TextField, Chip,
    CircularProgress, Paper, IconButton, Card, CardContent,
    Snackbar, Alert, Divider, Grid, Switch, FormControlLabel,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Accordion, AccordionSummary, AccordionDetails,
    Tooltip, Select, MenuItem, FormControl, InputLabel,
    useTheme, useMediaQuery
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    Phone as PhoneIcon,
    WhatsApp as WhatsAppIcon,
    Email as EmailIcon,
    HourglassEmpty as EsperaIcon,
    PlayArrow as PlayArrowIcon,
    Stop as StopIcon,
    ContentCopy as CopyIcon,
    DragIndicator as DragIcon,
    ArrowUpward as ArrowUpIcon,
    ArrowDownward as ArrowDownIcon,
    CheckCircle as CheckCircleIcon,
    Settings as SettingsIcon,
    Save as SaveIcon,
    Close as CloseIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import SDRService from 'src/services/sdrService';

// ==================== CONSTANTES ====================

const TIPOS_ACCION = [
    { value: 'llamada', label: 'Llamada', icon: <PhoneIcon fontSize="small" />, color: '#4caf50' },
    { value: 'whatsapp', label: 'WhatsApp', icon: <WhatsAppIcon fontSize="small" />, color: '#25D366' },
    { value: 'email', label: 'Email', icon: <EmailIcon fontSize="small" />, color: '#1976d2' },
    { value: 'espera', label: 'Espera', icon: <EsperaIcon fontSize="small" />, color: '#ff9800' },
];

const CONDICIONES = [
    { value: '', label: 'Siempre (sin condición)' },
    { value: 'si_atendio', label: '📞 Si atendió la llamada' },
    { value: 'si_no_atendio', label: '📞 Si NO atendió la llamada' },
    { value: 'si_respondio', label: '💬 Si respondió el WhatsApp' },
    { value: 'si_no_respondio', label: '💬 Si NO respondió el WhatsApp' },
];

const VARIABLES_TEMPLATE = ['{{nombre}}', '{{rubro_texto}}', '{{momento_bot}}', '{{sdr_nombre}}'];

const accionVacia = () => ({
    orden: 0,
    tipo: 'llamada',
    variantes: [{ rubro: 'general', templateTexto: '', templateNombre: '' }],
    condicion: '',
    descripcion: ''
});

const pasoVacio = () => ({
    orden: 0,
    nombre: '',
    delayDias: 0,
    delayUnidad: 'dias',
    acciones: [accionVacia()],
    objetivo: ''
});

const cadenciaVacia = () => ({
    nombre: '',
    descripcion: '',
    pasos: [pasoVacio()],
    detenerAlResponder: true,
    diasEsperaPostCadencia: 6,
    estadoAlCompletar: 'no_contacto',
    activa: true,
    esDefault: false,
    defaultInbound: false,
    defaultOutbound: false,
});

// ==================== COMPONENTE PRINCIPAL ====================

const CadenciasABMPage = () => {
    const { user } = useAuthContext();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Lista
    const [cadencias, setCadencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Formulario
    const [modoEdicion, setModoEdicion] = useState(false); // false = lista, true = formulario
    const [cadenciaEditando, setCadenciaEditando] = useState(null); // null = nueva
    const [form, setForm] = useState(cadenciaVacia());
    const [guardando, setGuardando] = useState(false);

    // Dialog eliminar
    const [dialogEliminar, setDialogEliminar] = useState({ open: false, cadencia: null });
    const [eliminando, setEliminando] = useState(false);

    const mostrarSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    // ==================== CARGAR DATOS ====================

    const cargarCadencias = useCallback(async () => {
        setLoading(true);
        try {
            const data = await SDRService.listarCadencias();
            setCadencias(data || []);
        } catch (err) {
            mostrarSnackbar('Error al cargar cadencias', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargarCadencias();
    }, [cargarCadencias]);

    // ==================== HANDLERS ====================

    const handleNueva = () => {
        setCadenciaEditando(null);
        setForm(cadenciaVacia());
        setModoEdicion(true);
    };

    const handleEditar = (cadencia) => {
        setCadenciaEditando(cadencia);
        setForm({
            nombre: cadencia.nombre || '',
            descripcion: cadencia.descripcion || '',
            pasos: (cadencia.pasos || []).map(p => ({
                ...p,
                acciones: (p.acciones || []).map(a => ({
                    ...a,
                    condicion: a.condicion || '',
                    descripcion: a.descripcion || '',
                    variantes: a.variantes?.length > 0 ? a.variantes : [{ rubro: 'general', templateTexto: '', templateNombre: '' }]
                }))
            })),
            detenerAlResponder: cadencia.detenerAlResponder ?? true,
            diasEsperaPostCadencia: cadencia.diasEsperaPostCadencia ?? 6,
            estadoAlCompletar: cadencia.estadoAlCompletar || 'no_contacto',
            activa: cadencia.activa ?? true,
            esDefault: cadencia.esDefault ?? false,
            defaultInbound: cadencia.defaultInbound ?? false,
            defaultOutbound: cadencia.defaultOutbound ?? false,
        });
        setModoEdicion(true);
    };

    const handleDuplicar = (cadencia) => {
        setCadenciaEditando(null);
        setForm({
            nombre: `${cadencia.nombre} (copia)`,
            descripcion: cadencia.descripcion || '',
            pasos: (cadencia.pasos || []).map(p => ({
                ...p,
                acciones: (p.acciones || []).map(a => ({
                    ...a,
                    condicion: a.condicion || '',
                    variantes: a.variantes?.length > 0 ? a.variantes : [{ rubro: 'general', templateTexto: '', templateNombre: '' }]
                }))
            })),
            detenerAlResponder: cadencia.detenerAlResponder ?? true,
            diasEsperaPostCadencia: cadencia.diasEsperaPostCadencia ?? 6,
            estadoAlCompletar: cadencia.estadoAlCompletar || 'no_contacto',
            activa: true,
            esDefault: false,
            defaultInbound: false,
            defaultOutbound: false,
        });
        setModoEdicion(true);
    };

    const handleCancelar = () => {
        setModoEdicion(false);
        setCadenciaEditando(null);
    };

    const handleGuardar = async () => {
        if (!form.nombre.trim()) {
            mostrarSnackbar('El nombre es obligatorio', 'error');
            return;
        }
        if (form.pasos.length === 0) {
            mostrarSnackbar('Agregá al menos un paso', 'error');
            return;
        }

        // Recalcular ordenes
        const formConOrdenes = {
            ...form,
            pasos: form.pasos.map((paso, pi) => ({
                ...paso,
                orden: pi,
                nombre: paso.nombre || `Paso ${pi + 1}`,
                acciones: paso.acciones.map((accion, ai) => ({
                    ...accion,
                    orden: ai,
                    condicion: accion.condicion || null,
                }))
            }))
        };

        setGuardando(true);
        try {
            if (cadenciaEditando) {
                await SDRService.actualizarCadencia(cadenciaEditando._id, formConOrdenes);
                mostrarSnackbar('Cadencia actualizada');
            } else {
                await SDRService.crearCadencia(formConOrdenes);
                mostrarSnackbar('Cadencia creada');
            }
            setModoEdicion(false);
            cargarCadencias();
        } catch (err) {
            mostrarSnackbar(err.response?.data?.error || 'Error al guardar', 'error');
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = async () => {
        if (!dialogEliminar.cadencia) return;
        setEliminando(true);
        try {
            await SDRService.eliminarCadencia(dialogEliminar.cadencia._id);
            mostrarSnackbar('Cadencia eliminada');
            setDialogEliminar({ open: false, cadencia: null });
            cargarCadencias();
        } catch (err) {
            mostrarSnackbar(err.response?.data?.error || 'Error al eliminar', 'error');
        } finally {
            setEliminando(false);
        }
    };

    // ==================== HELPERS FORM ====================

    const updatePaso = (pasoIdx, campo, valor) => {
        setForm(prev => ({
            ...prev,
            pasos: prev.pasos.map((p, i) => i === pasoIdx ? { ...p, [campo]: valor } : p)
        }));
    };

    const addPaso = () => {
        setForm(prev => ({
            ...prev,
            pasos: [...prev.pasos, { ...pasoVacio(), orden: prev.pasos.length }]
        }));
    };

    const removePaso = (pasoIdx) => {
        setForm(prev => ({
            ...prev,
            pasos: prev.pasos.filter((_, i) => i !== pasoIdx)
        }));
    };

    const moverPaso = (pasoIdx, dir) => {
        setForm(prev => {
            const pasos = [...prev.pasos];
            const newIdx = pasoIdx + dir;
            if (newIdx < 0 || newIdx >= pasos.length) return prev;
            [pasos[pasoIdx], pasos[newIdx]] = [pasos[newIdx], pasos[pasoIdx]];
            return { ...prev, pasos };
        });
    };

    const updateAccion = (pasoIdx, accionIdx, campo, valor) => {
        setForm(prev => ({
            ...prev,
            pasos: prev.pasos.map((p, pi) => pi === pasoIdx ? {
                ...p,
                acciones: p.acciones.map((a, ai) => ai === accionIdx ? { ...a, [campo]: valor } : a)
            } : p)
        }));
    };

    const addAccion = (pasoIdx) => {
        setForm(prev => ({
            ...prev,
            pasos: prev.pasos.map((p, pi) => pi === pasoIdx ? {
                ...p,
                acciones: [...p.acciones, { ...accionVacia(), orden: p.acciones.length }]
            } : p)
        }));
    };

    const removeAccion = (pasoIdx, accionIdx) => {
        setForm(prev => ({
            ...prev,
            pasos: prev.pasos.map((p, pi) => pi === pasoIdx ? {
                ...p,
                acciones: p.acciones.filter((_, ai) => ai !== accionIdx)
            } : p)
        }));
    };

    const moverAccion = (pasoIdx, accionIdx, dir) => {
        setForm(prev => ({
            ...prev,
            pasos: prev.pasos.map((p, pi) => {
                if (pi !== pasoIdx) return p;
                const acciones = [...p.acciones];
                const newIdx = accionIdx + dir;
                if (newIdx < 0 || newIdx >= acciones.length) return p;
                [acciones[accionIdx], acciones[newIdx]] = [acciones[newIdx], acciones[accionIdx]];
                return { ...p, acciones };
            })
        }));
    };

    const updateVariante = (pasoIdx, accionIdx, varianteIdx, campo, valor) => {
        setForm(prev => ({
            ...prev,
            pasos: prev.pasos.map((p, pi) => pi === pasoIdx ? {
                ...p,
                acciones: p.acciones.map((a, ai) => ai === accionIdx ? {
                    ...a,
                    variantes: a.variantes.map((v, vi) => vi === varianteIdx ? { ...v, [campo]: valor } : v)
                } : a)
            } : p)
        }));
    };

    const addVariante = (pasoIdx, accionIdx) => {
        setForm(prev => ({
            ...prev,
            pasos: prev.pasos.map((p, pi) => pi === pasoIdx ? {
                ...p,
                acciones: p.acciones.map((a, ai) => ai === accionIdx ? {
                    ...a,
                    variantes: [...a.variantes, { rubro: '', templateTexto: '', templateNombre: '' }]
                } : a)
            } : p)
        }));
    };

    const removeVariante = (pasoIdx, accionIdx, varianteIdx) => {
        setForm(prev => ({
            ...prev,
            pasos: prev.pasos.map((p, pi) => pi === pasoIdx ? {
                ...p,
                acciones: p.acciones.map((a, ai) => ai === accionIdx ? {
                    ...a,
                    variantes: a.variantes.filter((_, vi) => vi !== varianteIdx)
                } : a)
            } : p)
        }));
    };

    // ==================== RENDER: TIPO ACCIÓN ICON ====================

    const getTipoAccionConf = (tipo) => TIPOS_ACCION.find(t => t.value === tipo) || TIPOS_ACCION[0];

    /** Renderiza un mini árbol visual del flujo de acciones */
    const renderFlujoPaso = (acciones) => {
        if (!acciones?.length) return null;
        const items = [];
        let depth = 0;
        acciones.forEach((a, idx) => {
            const tc = getTipoAccionConf(a.tipo);
            const condLabel = a.condicion ? (CONDICIONES.find(c => c.value === a.condicion)?.label || a.condicion) : null;
            if (a.condicion) {
                items.push(
                    <Box key={idx} sx={{ ml: depth * 3, display: 'flex', alignItems: 'center', gap: 0.5, py: 0.2 }}>
                        <Typography variant="caption" color="text.secondary">└─</Typography>
                        <Typography variant="caption" color="info.main" fontWeight={600}>{condLabel}</Typography>
                        <Typography variant="caption" color="text.secondary">→</Typography>
                        <Box sx={{ color: tc.color, display: 'flex', fontSize: 14 }}>{tc.icon}</Box>
                        <Typography variant="caption">{tc.label}</Typography>
                        {a.descripcion && <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>— {a.descripcion}</Typography>}
                    </Box>
                );
                depth++;
            } else {
                depth = 1;
                items.push(
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.2 }}>
                        <Box sx={{ color: tc.color, display: 'flex', fontSize: 14 }}>{tc.icon}</Box>
                        <Typography variant="caption" fontWeight={600}>{tc.label}</Typography>
                        {a.descripcion && <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>— {a.descripcion}</Typography>}
                    </Box>
                );
            }
        });
        return items;
    };

    // ==================== RENDER ====================

    return (
        <DashboardLayout title="Cadencias" headerActions={
            <Stack direction="row" spacing={1}>
                {modoEdicion ? (
                    <>
                        <Button size="small" variant="outlined" onClick={handleCancelar} startIcon={<CloseIcon />}>
                            Cancelar
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            onClick={handleGuardar}
                            disabled={guardando}
                            startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                        >
                            {cadenciaEditando ? 'Actualizar' : 'Crear'}
                        </Button>
                    </>
                ) : (
                    <Button size="small" variant="contained" onClick={handleNueva} startIcon={<AddIcon />}>
                        Nueva cadencia
                    </Button>
                )}
            </Stack>
        }>
            <Head>
                <title>Cadencias | SDR</title>
            </Head>
            <Box sx={{ py: { xs: 1, md: 3 } }}>
                <Container maxWidth="lg">

                    {/* ==================== MODO LISTA ==================== */}
                    {!modoEdicion && (
                        <>
                            {loading ? (
                                <Box sx={{ textAlign: 'center', py: 8 }}>
                                    <CircularProgress />
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                        Cargando cadencias...
                                    </Typography>
                                </Box>
                            ) : cadencias.length === 0 ? (
                                <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
                                    <PlayArrowIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                                    <Typography variant="h6" color="text.secondary" gutterBottom>
                                        No hay cadencias configuradas
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                        Creá tu primera cadencia para automatizar el flujo de contacto con tus leads.
                                    </Typography>
                                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleNueva}>
                                        Crear cadencia
                                    </Button>
                                </Paper>
                            ) : (
                                <Stack spacing={2}>
                                    {cadencias.map((cad) => (
                                        <Card key={cad._id} variant="outlined">
                                            <CardContent>
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                                    <Box sx={{ flex: 1 }}>
                                                        <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                                            <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                                                                {cad.nombre}
                                                            </Typography>
                                                            {cad.defaultInbound && (
                                                                <Chip size="small" label="Default Inbound" color="primary" variant="filled" />
                                                            )}
                                                            {cad.defaultOutbound && (
                                                                <Chip size="small" label="Default Outbound" color="secondary" variant="filled" />
                                                            )}
                                                            {cad.esDefault && !cad.defaultInbound && !cad.defaultOutbound && (
                                                                <Chip size="small" label="Default" color="primary" variant="filled" />
                                                            )}
                                                            <Chip
                                                                size="small"
                                                                label={cad.activa ? 'Activa' : 'Inactiva'}
                                                                color={cad.activa ? 'success' : 'default'}
                                                                variant="outlined"
                                                            />
                                                        </Stack>
                                                        {cad.descripcion && (
                                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                                {cad.descripcion}
                                                            </Typography>
                                                        )}
                                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                            <Chip
                                                                size="small"
                                                                variant="outlined"
                                                                label={`${cad.pasos?.length || 0} pasos`}
                                                            />
                                                            <Chip
                                                                size="small"
                                                                variant="outlined"
                                                                label={`${(cad.pasos || []).reduce((sum, p) => sum + (p.acciones?.length || 0), 0)} acciones`}
                                                            />
                                                            {cad.detenerAlResponder && (
                                                                <Chip size="small" variant="outlined" label="Detiene al responder" color="info" />
                                                            )}
                                                            {cad.creadoPorNombre && (
                                                                <Chip size="small" variant="outlined" label={`por ${cad.creadoPorNombre}`} />
                                                            )}
                                                        </Stack>

                                                        {/* Mini-resumen de pasos */}
                                                        <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, flexWrap: 'wrap' }} useFlexGap>
                                                            {(cad.pasos || []).map((paso, idx) => (
                                                                <Tooltip key={idx} title={`${paso.nombre || `Paso ${idx+1}`}: ${paso.acciones?.map(a => a.tipo).join(', ') || 'vacío'}`}>
                                                                    <Chip
                                                                        size="small"
                                                                        label={
                                                                            <Stack direction="row" spacing={0.3} alignItems="center">
                                                                                <Typography variant="caption" fontWeight={600}>
                                                                                    {idx + 1}
                                                                                </Typography>
                                                                                {paso.delayDias > 0 && (
                                                                                    <Typography variant="caption" color="text.secondary">
                                                                                        +{paso.delayDias}{(paso.delayUnidad || 'dias') === 'horas' ? 'h' : 'd'}
                                                                                    </Typography>
                                                                                )}
                                                                                {(paso.acciones || []).map((a, ai) => {
                                                                                    const conf = getTipoAccionConf(a.tipo);
                                                                                    return (
                                                                                        <Box key={ai} sx={{ color: conf.color, display: 'flex', alignItems: 'center' }}>
                                                                                            {conf.icon}
                                                                                        </Box>
                                                                                    );
                                                                                })}
                                                                            </Stack>
                                                                        }
                                                                        variant="outlined"
                                                                        sx={{ height: 28 }}
                                                                    />
                                                                </Tooltip>
                                                            ))}
                                                        </Stack>
                                                    </Box>

                                                    <Stack direction="row" spacing={0.5}>
                                                        <Tooltip title="Editar">
                                                            <IconButton size="small" onClick={() => handleEditar(cad)} color="primary">
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Duplicar">
                                                            <IconButton size="small" onClick={() => handleDuplicar(cad)}>
                                                                <CopyIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Eliminar">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setDialogEliminar({ open: true, cadencia: cad })}
                                                                color="error"
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Stack>
                            )}
                        </>
                    )}

                    {/* ==================== MODO EDICIÓN / CREACIÓN ==================== */}
                    {modoEdicion && (
                        <Stack spacing={3}>
                            {/* Datos generales */}
                            <Paper variant="outlined" sx={{ p: 2.5 }}>
                                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                    {cadenciaEditando ? 'Editar cadencia' : 'Nueva cadencia'}
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Nombre"
                                            value={form.nombre}
                                            onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                                            placeholder="Ej: Ciclo de Vida de Lead"
                                            required
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Descripción"
                                            value={form.descripcion}
                                            onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))}
                                            placeholder="Breve descripción del objetivo"
                                        />
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 2 }} />

                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Configuración
                                </Typography>
                                <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems={isMobile ? 'stretch' : 'center'}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={form.activa}
                                                onChange={(e) => setForm(f => ({ ...f, activa: e.target.checked }))}
                                            />
                                        }
                                        label="Activa"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={form.defaultInbound}
                                                onChange={(e) => setForm(f => ({ ...f, defaultInbound: e.target.checked }))}
                                            />
                                        }
                                        label="Default Inbound (leads del bot)"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={form.defaultOutbound}
                                                onChange={(e) => setForm(f => ({ ...f, defaultOutbound: e.target.checked }))}
                                            />
                                        }
                                        label="Default Outbound (importados)"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={form.detenerAlResponder}
                                                onChange={(e) => setForm(f => ({ ...f, detenerAlResponder: e.target.checked }))}
                                            />
                                        }
                                        label="Detener al responder"
                                    />
                                    <TextField
                                        size="small"
                                        type="number"
                                        label="Días espera post-cadencia"
                                        value={form.diasEsperaPostCadencia}
                                        onChange={(e) => setForm(f => ({ ...f, diasEsperaPostCadencia: parseInt(e.target.value) || 0 }))}
                                        sx={{ width: 200 }}
                                        InputProps={{ inputProps: { min: 0 } }}
                                    />
                                </Stack>

                                {/* Variables disponibles */}
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                        Variables para templates:
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                        {VARIABLES_TEMPLATE.map(v => (
                                            <Chip
                                                key={v}
                                                size="small"
                                                label={v}
                                                variant="outlined"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(v);
                                                    mostrarSnackbar(`${v} copiado`);
                                                }}
                                                sx={{ cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.75rem' }}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            </Paper>

                            {/* Pasos */}
                            <Typography variant="subtitle1" fontWeight={600}>
                                Pasos ({form.pasos.length})
                            </Typography>

                            {form.pasos.map((paso, pasoIdx) => (
                                <Paper key={pasoIdx} variant="outlined" sx={{ p: 2, borderLeft: 4, borderColor: 'primary.main' }}>
                                    {/* Header del paso */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Chip
                                                label={`Paso ${pasoIdx + 1}`}
                                                size="small"
                                                color="primary"
                                            />
                                            {paso.delayDias > 0 && (
                                                <Chip
                                                    size="small"
                                                    variant="outlined"
                                                    label={`+${paso.delayDias} ${(paso.delayUnidad || 'dias') === 'horas' ? 'horas' : 'días'} de espera`}
                                                />
                                            )}
                                        </Stack>
                                        <Stack direction="row" spacing={0.5}>
                                            <IconButton
                                                size="small"
                                                onClick={() => moverPaso(pasoIdx, -1)}
                                                disabled={pasoIdx === 0}
                                            >
                                                <ArrowUpIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => moverPaso(pasoIdx, 1)}
                                                disabled={pasoIdx === form.pasos.length - 1}
                                            >
                                                <ArrowDownIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => removePaso(pasoIdx)}
                                                disabled={form.pasos.length <= 1}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </Stack>

                                    <Grid container spacing={2} sx={{ mb: 2 }}>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Nombre del paso"
                                                value={paso.nombre}
                                                onChange={(e) => updatePaso(pasoIdx, 'nombre', e.target.value)}
                                                placeholder={`Ej: Gancho, Seguimiento...`}
                                            />
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <Stack direction="row" spacing={0.5} alignItems="flex-end">
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    label={`Delay (${(paso.delayUnidad || 'dias') === 'horas' ? 'horas' : 'días'})`}
                                                    value={paso.delayDias}
                                                    onChange={(e) => updatePaso(pasoIdx, 'delayDias', parseInt(e.target.value) || 0)}
                                                    InputProps={{ inputProps: { min: 0 } }}
                                                    sx={{ flex: 1 }}
                                                />
                                                <Stack direction="row" sx={{ mb: '2px' }}>
                                                    <Button
                                                        size="small"
                                                        variant={(paso.delayUnidad || 'dias') === 'dias' ? 'contained' : 'outlined'}
                                                        onClick={() => updatePaso(pasoIdx, 'delayUnidad', 'dias')}
                                                        sx={{ minWidth: 28, px: 0.5, py: 0.5, fontSize: '0.65rem', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                                                    >
                                                        D
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant={(paso.delayUnidad || 'dias') === 'horas' ? 'contained' : 'outlined'}
                                                        onClick={() => updatePaso(pasoIdx, 'delayUnidad', 'horas')}
                                                        sx={{ minWidth: 28, px: 0.5, py: 0.5, fontSize: '0.65rem', borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                                                    >
                                                        H
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        </Grid>
                                        <Grid item xs={12} sm={5}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Objetivo del paso"
                                                value={paso.objetivo || ''}
                                                onChange={(e) => updatePaso(pasoIdx, 'objetivo', e.target.value)}
                                                placeholder="Ej: Generar primera interacción"
                                            />
                                        </Grid>
                                    </Grid>

                                    {/* Acciones del paso */}
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                        Acciones ({paso.acciones.length})
                                    </Typography>

                                    <Stack spacing={1.5}>
                                        {paso.acciones.map((accion, accionIdx) => {
                                            const tipoConf = getTipoAccionConf(accion.tipo);
                                            const condLabel = accion.condicion ? (CONDICIONES.find(c => c.value === accion.condicion)?.label || accion.condicion) : null;
                                            return (
                                                <Box key={accionIdx}>
                                                    {condLabel && (
                                                        <Typography variant="caption" color="info.main" fontWeight={600} sx={{ ml: 5, mb: 0.3, display: 'block' }}>
                                                            └─ {condLabel}
                                                        </Typography>
                                                    )}
                                                    <Box
                                                        sx={{
                                                            p: 1.5,
                                                            border: 1,
                                                            borderColor: accion.condicion ? 'info.light' : 'grey.300',
                                                            borderRadius: 1,
                                                            bgcolor: accion.condicion ? 'action.hover' : 'grey.50',
                                                            ml: accion.condicion ? 4 : 0,
                                                        }}
                                                    >
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Box sx={{ color: tipoConf.color, display: 'flex' }}>{tipoConf.icon}</Box>
                                                            <Typography variant="body2" fontWeight={600}>
                                                                Acción {accionIdx + 1}
                                                            </Typography>
                                                        </Stack>
                                                        <Stack direction="row" spacing={0.3}>
                                                            <IconButton size="small" onClick={() => moverAccion(pasoIdx, accionIdx, -1)} disabled={accionIdx === 0}>
                                                                <ArrowUpIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                            <IconButton size="small" onClick={() => moverAccion(pasoIdx, accionIdx, 1)} disabled={accionIdx === paso.acciones.length - 1}>
                                                                <ArrowDownIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                            <IconButton size="small" color="error" onClick={() => removeAccion(pasoIdx, accionIdx)} disabled={paso.acciones.length <= 1}>
                                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                        </Stack>
                                                    </Stack>

                                                    <Grid container spacing={1.5}>
                                                        <Grid item xs={6} sm={3}>
                                                            <FormControl fullWidth size="small">
                                                                <InputLabel>Tipo</InputLabel>
                                                                <Select
                                                                    value={accion.tipo}
                                                                    onChange={(e) => updateAccion(pasoIdx, accionIdx, 'tipo', e.target.value)}
                                                                    label="Tipo"
                                                                >
                                                                    {TIPOS_ACCION.map(t => (
                                                                        <MenuItem key={t.value} value={t.value}>
                                                                            <Stack direction="row" spacing={1} alignItems="center">
                                                                                <Box sx={{ color: t.color, display: 'flex' }}>{t.icon}</Box>
                                                                                <span>{t.label}</span>
                                                                            </Stack>
                                                                        </MenuItem>
                                                                    ))}
                                                                </Select>
                                                            </FormControl>
                                                        </Grid>
                                                        <Grid item xs={6} sm={3}>
                                                            <FormControl fullWidth size="small">
                                                                <InputLabel>Condición</InputLabel>
                                                                <Select
                                                                    value={accion.condicion || ''}
                                                                    onChange={(e) => updateAccion(pasoIdx, accionIdx, 'condicion', e.target.value)}
                                                                    label="Condición"
                                                                >
                                                                    {CONDICIONES.map(c => (
                                                                        <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                                                                    ))}
                                                                </Select>
                                                            </FormControl>
                                                        </Grid>
                                                        <Grid item xs={12} sm={6}>
                                                            <TextField
                                                                fullWidth
                                                                size="small"
                                                                label="Descripción (opcional)"
                                                                value={accion.descripcion || ''}
                                                                onChange={(e) => updateAccion(pasoIdx, accionIdx, 'descripcion', e.target.value)}
                                                                placeholder="Ej: Llamar para presentarse"
                                                            />
                                                        </Grid>
                                                    </Grid>

                                                    {/* Variantes de template (solo si no es espera) */}
                                                    {accion.tipo !== 'espera' && (
                                                        <Box sx={{ mt: 1.5 }}>
                                                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Variantes de template ({accion.variantes?.length || 0})
                                                                </Typography>
                                                                <Button
                                                                    size="small"
                                                                    onClick={() => addVariante(pasoIdx, accionIdx)}
                                                                    sx={{ fontSize: '0.7rem', textTransform: 'none' }}
                                                                >
                                                                    + Variante por rubro
                                                                </Button>
                                                            </Stack>

                                                            {(accion.variantes || []).map((variante, varIdx) => (
                                                                <Box
                                                                    key={varIdx}
                                                                    sx={{
                                                                        p: 1,
                                                                        mb: 1,
                                                                        bgcolor: 'background.paper',
                                                                        borderRadius: 1,
                                                                        border: 1,
                                                                        borderColor: 'grey.200'
                                                                    }}
                                                                >
                                                                    <Stack direction="row" spacing={1} alignItems="flex-start">
                                                                        <TextField
                                                                            size="small"
                                                                            label="Rubro"
                                                                            value={variante.rubro}
                                                                            onChange={(e) => updateVariante(pasoIdx, accionIdx, varIdx, 'rubro', e.target.value)}
                                                                            sx={{ width: 150 }}
                                                                            placeholder="general"
                                                                        />
                                                                        <TextField
                                                                            size="small"
                                                                            fullWidth
                                                                            label="Template"
                                                                            value={variante.templateTexto}
                                                                            onChange={(e) => updateVariante(pasoIdx, accionIdx, varIdx, 'templateTexto', e.target.value)}
                                                                            multiline
                                                                            minRows={2}
                                                                            placeholder="Hola {{nombre}}, te contacto desde Sorby..."
                                                                        />
                                                                        {accion.variantes.length > 1 && (
                                                                            <IconButton
                                                                                size="small"
                                                                                color="error"
                                                                                onClick={() => removeVariante(pasoIdx, accionIdx, varIdx)}
                                                                                sx={{ mt: 0.5 }}
                                                                            >
                                                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                                                            </IconButton>
                                                                        )}
                                                                    </Stack>
                                                                </Box>
                                                            ))}
                                                        </Box>
                                                    )}
                                                </Box>
                                                </Box>
                                            );
                                        })}
                                    </Stack>

                                    {/* Mini flujo visual tipo árbol */}
                                    {paso.acciones.length > 1 && (
                                        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: '1px dashed', borderColor: 'grey.300' }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                                                🌳 Flujo visual del paso:
                                            </Typography>
                                            {renderFlujoPaso(paso.acciones)}
                                        </Box>
                                    )}

                                    <Button
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={() => addAccion(pasoIdx)}
                                        sx={{ mt: 1.5, textTransform: 'none' }}
                                    >
                                        Agregar acción
                                    </Button>
                                </Paper>
                            ))}

                            <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={addPaso}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                Agregar paso
                            </Button>

                            {/* Botones finales */}
                            <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ pt: 2, pb: 4 }}>
                                <Button variant="outlined" onClick={handleCancelar}>
                                    Cancelar
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={handleGuardar}
                                    disabled={guardando}
                                    startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                                    sx={{ minWidth: 140 }}
                                >
                                    {cadenciaEditando ? 'Actualizar' : 'Crear cadencia'}
                                </Button>
                            </Stack>
                        </Stack>
                    )}

                </Container>
            </Box>

            {/* Dialog eliminar */}
            <Dialog open={dialogEliminar.open} onClose={() => setDialogEliminar({ open: false, cadencia: null })}>
                <DialogTitle>¿Eliminar cadencia?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Se eliminará permanentemente la cadencia <strong>{dialogEliminar.cadencia?.nombre}</strong>.
                        Si hay contactos con esta cadencia activa, no se podrá eliminar.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogEliminar({ open: false, cadencia: null })}>
                        Cancelar
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleEliminar}
                        disabled={eliminando}
                        startIcon={eliminando ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
                    >
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </DashboardLayout>
    );
};

export default CadenciasABMPage;
