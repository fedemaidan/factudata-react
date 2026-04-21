/**
 * Modal para fusionar dos contactos duplicados
 * Flujo de 3 pasos:
 *   1. Buscar el contacto a fusionar (el "merge")
 *   2. Comparar campo a campo y resolver conflictos
 *   3. Confirmar y ejecutar la fusión
 */
import { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Button, TextField, Stack, Alert,
    CircularProgress, IconButton, Chip, Grid, Divider,
    Radio, RadioGroup, FormControlLabel, Paper, Stepper,
    Step, StepLabel, Tooltip
} from '@mui/material';
import {
    Close as CloseIcon,
    Search as SearchIcon,
    MergeType as MergeIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import SDRService from '../../services/sdrService';

const LABELS = {
    nombre: 'Nombre',
    telefono: 'Teléfono',
    email: 'Email',
    empresa: 'Empresa',
    cargo: 'Cargo',
    tamanoEmpresa: 'Tamaño empresa',
    estado: 'Estado',
    segmento: 'Segmento',
    notas: 'Notas',
    planEstimado: 'Plan estimado',
    intencionCompra: 'Intención de compra',
    sdrAsignado: 'SDR asignado (ID)',
    sdrAsignadoNombre: 'SDR asignado',
};

const STEPS = ['Buscar duplicado', 'Comparar datos', 'Confirmar fusión'];

// ─── Paso 1: buscador de contacto ───────────────────────────────────────────

const BuscadorContacto = ({ excludeId, onSeleccionar }) => {
    const [query, setQuery] = useState('');
    const [resultados, setResultados] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState(null);

    const buscar = useCallback(async () => {
        if (!query.trim()) return;
        setBuscando(true);
        setError(null);
        try {
            const data = await SDRService.listarContactos({ busqueda: query, limit: 20 });
            const lista = (data.contactos || data).filter(c => c._id !== excludeId);
            setResultados(lista);
        } catch {
            setError('Error al buscar contactos');
        } finally {
            setBuscando(false);
        }
    }, [query, excludeId]);

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Buscá el contacto que querés fusionar con el actual. El contacto buscado{' '}
                <strong>quedará eliminado</strong> y sus reuniones e historial pasarán al contacto base.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Nombre, teléfono o email..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && buscar()}
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.disabled' }} />
                    }}
                />
                <Button variant="contained" onClick={buscar} disabled={buscando || !query.trim()} sx={{ minWidth: 90 }}>
                    {buscando ? <CircularProgress size={18} color="inherit" /> : 'Buscar'}
                </Button>
            </Stack>
            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
            {resultados.length > 0 && (
                <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
                    {resultados.map(c => (
                        <Paper
                            key={c._id}
                            variant="outlined"
                            onClick={() => onSeleccionar(c)}
                            sx={{
                                p: 1.2, mb: 0.8, cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' }
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>{c.nombre}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {[c.telefono, c.email, c.empresa].filter(Boolean).join(' · ')}
                                    </Typography>
                                </Box>
                                <Chip label={c.estado || 'nuevo'} size="small" variant="outlined" />
                            </Stack>
                        </Paper>
                    ))}
                </Box>
            )}
            {resultados.length === 0 && query && !buscando && (
                <Typography variant="caption" color="text.secondary">No se encontraron contactos.</Typography>
            )}
        </Box>
    );
};

// ─── Paso 2: comparador de campos ──────────────────────────────────────────

const ComparadorCampos = ({ preview, elecciones, onChange }) => {
    const { base, merge, conflicts, soloEnBase, soloEnMerge, reunionesEnMerge, eventosEnMerge } = preview;

    const handleEleccion = (campo, valor) => {
        onChange({ ...elecciones, [campo]: valor });
    };

    return (
        <Box>
            {/* Encabezados */}
            <Grid container spacing={1} sx={{ mb: 1.5 }}>
                <Grid item xs={3} />
                <Grid item xs={4}>
                    <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: 'primary.50', borderColor: 'primary.main' }}>
                        <Typography variant="caption" fontWeight={700} color="primary.main">
                            CONTACTO BASE (se conserva)
                        </Typography>
                        <Typography variant="body2" fontWeight={600} noWrap>{base.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>{base.telefono}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={4}>
                    <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: 'error.50', borderColor: 'error.light' }}>
                        <Typography variant="caption" fontWeight={700} color="error.main">
                            CONTACTO A ELIMINAR
                        </Typography>
                        <Typography variant="body2" fontWeight={600} noWrap>{merge.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>{merge.telefono}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={1} />
            </Grid>

            {/* Reuniones/historial a migrar */}
            {(reunionesEnMerge > 0 || eventosEnMerge > 0) && (
                <Alert severity="info" icon={<MergeIcon />} sx={{ mb: 1.5 }}>
                    Se migrarán <strong>{reunionesEnMerge} reuniones</strong> y{' '}
                    <strong>{eventosEnMerge} eventos de historial</strong> del contacto a eliminar.
                </Alert>
            )}

            {/* Conflictos: el usuario elige */}
            {conflicts.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" color="warning.dark" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <WarningIcon fontSize="small" /> Campos con valores distintos — elegí cuál conservar:
                    </Typography>
                    {conflicts.map(({ campo, valorBase, valorMerge }) => (
                        <Paper key={campo} variant="outlined" sx={{ p: 1, mb: 0.8, borderColor: 'warning.light' }}>
                            <Grid container alignItems="center" spacing={1}>
                                <Grid item xs={3}>
                                    <Typography variant="caption" fontWeight={600}>{LABELS[campo] || campo}</Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <FormControlLabel
                                        control={
                                            <Radio
                                                size="small"
                                                checked={elecciones[campo] === valorBase}
                                                onChange={() => handleEleccion(campo, valorBase)}
                                                color="primary"
                                            />
                                        }
                                        label={
                                            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                                {String(valorBase)}
                                            </Typography>
                                        }
                                    />
                                </Grid>
                                <Grid item xs={4}>
                                    <FormControlLabel
                                        control={
                                            <Radio
                                                size="small"
                                                checked={elecciones[campo] === valorMerge}
                                                onChange={() => handleEleccion(campo, valorMerge)}
                                                color="error"
                                            />
                                        }
                                        label={
                                            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                                {String(valorMerge)}
                                            </Typography>
                                        }
                                    />
                                </Grid>
                                <Grid item xs={1} />
                            </Grid>
                        </Paper>
                    ))}
                </Box>
            )}

            {/* Solo en merge → van a pasar al base automáticamente */}
            {soloEnMerge.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" color="success.dark" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircleIcon fontSize="small" /> Campos que se copiarán del contacto a eliminar (el base no los tiene):
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.8}>
                        {soloEnMerge.map(({ campo, valor }) => (
                            <Tooltip key={campo} title={String(valor)}>
                                <Chip
                                    size="small"
                                    label={`${LABELS[campo] || campo}: ${String(valor).slice(0, 30)}`}
                                    color="success"
                                    variant="outlined"
                                />
                            </Tooltip>
                        ))}
                    </Stack>
                </Box>
            )}

            {/* Solo en base → se conservan sin cambio */}
            {soloEnBase.length > 0 && (
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Campos del contacto base que se conservan sin cambio:
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.8}>
                        {soloEnBase.map(({ campo, valor }) => (
                            <Chip
                                key={campo}
                                size="small"
                                label={`${LABELS[campo] || campo}: ${String(valor).slice(0, 30)}`}
                                variant="outlined"
                            />
                        ))}
                    </Stack>
                </Box>
            )}

            {conflicts.length === 0 && soloEnMerge.length === 0 && soloEnBase.length === 0 && (
                <Alert severity="success">Ambos contactos tienen los mismos datos — la fusión no pisará ningún campo.</Alert>
            )}
        </Box>
    );
};

// ─── Paso 3: confirmación ──────────────────────────────────────────────────

const ConfirmacionMerge = ({ base, merge, datosFinales, preview }) => (
    <Box>
        <Alert severity="warning" sx={{ mb: 2 }}>
            Esta acción es <strong>irreversible</strong>. El contacto{' '}
            <strong>"{merge.nombre}"</strong> quedará eliminado y toda su actividad
            se moverá a <strong>"{base.nombre}"</strong>.
        </Alert>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
            <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={700}>{merge.nombre}</Typography>
                <Typography variant="caption" color="text.secondary">{merge.telefono}</Typography>
                <br />
                <Chip label="Se elimina" size="small" color="error" sx={{ mt: 0.5 }} />
            </Box>
            <ArrowForwardIcon sx={{ color: 'text.disabled' }} />
            <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={700}>{datosFinales.nombre || base.nombre}</Typography>
                <Typography variant="caption" color="text.secondary">{datosFinales.telefono || base.telefono}</Typography>
                <br />
                <Chip label="Se conserva" size="small" color="primary" sx={{ mt: 0.5 }} />
            </Box>
        </Stack>
        {(preview.reunionesEnMerge > 0 || preview.eventosEnMerge > 0) && (
            <Typography variant="body2" color="text.secondary">
                También se migrarán {preview.reunionesEnMerge} reuniones y {preview.eventosEnMerge} eventos de historial.
            </Typography>
        )}
    </Box>
);

// ─── Modal principal ────────────────────────────────────────────────────────

const ModalMergeContacto = ({ open, onClose, contacto, empresaId, onSuccess, mostrarSnackbar }) => {
    const [paso, setPaso] = useState(0);
    const [contactoMerge, setContactoMerge] = useState(null);
    const [preview, setPreview] = useState(null);
    const [cargandoPreview, setCargandoPreview] = useState(false);
    const [elecciones, setElecciones] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    // Reset al abrir/cerrar
    useEffect(() => {
        if (!open) {
            setPaso(0);
            setContactoMerge(null);
            setPreview(null);
            setElecciones({});
            setError(null);
        }
    }, [open]);

    const handleSeleccionarMerge = useCallback(async (c) => {
        setContactoMerge(c);
        setCargandoPreview(true);
        setError(null);
        try {
            const data = await SDRService.mergePreview(contacto._id, c._id);
            setPreview(data);
            // Pre-seleccionar valor del base en cada conflicto
            const elect = {};
            (data.conflicts || []).forEach(({ campo, valorBase }) => {
                elect[campo] = valorBase;
            });
            // Completar con campos solo en merge
            (data.soloEnMerge || []).forEach(({ campo, valor }) => {
                elect[campo] = valor;
            });
            setElecciones(elect);
            setPaso(1);
        } catch (e) {
            setError(e?.response?.data?.error || 'Error al cargar la comparación');
        } finally {
            setCargandoPreview(false);
        }
    }, [contacto]);

    const handleConfirmar = async () => {
        setGuardando(true);
        setError(null);
        try {
            const contactoActualizado = await SDRService.mergeContactos(contacto._id, contactoMerge._id, elecciones);
            mostrarSnackbar?.(`"${contactoMerge.nombre}" fusionado exitosamente`, 'success');
            onSuccess?.(contactoActualizado);
        } catch (e) {
            setError(e?.response?.data?.error || 'Error al fusionar contactos');
        } finally {
            setGuardando(false);
        }
    };

    const canNext = paso === 0
        ? Boolean(contactoMerge)
        : paso === 1
            ? Boolean(preview)
            : true;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <MergeIcon color="primary" />
                        <Typography variant="h6">Fusionar contacto duplicado</Typography>
                    </Stack>
                    <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
                </Stack>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ pt: 2 }}>
                <Stepper activeStep={paso} sx={{ mb: 3 }}>
                    {STEPS.map(label => (
                        <Step key={label}><StepLabel>{label}</StepLabel></Step>
                    ))}
                </Stepper>

                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

                {/* Paso 0: buscador */}
                {paso === 0 && (
                    <BuscadorContacto
                        excludeId={contacto?._id}
                        onSeleccionar={handleSeleccionarMerge}
                    />
                )}

                {/* Cargando preview */}
                {cargandoPreview && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CircularProgress />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Cargando comparación...</Typography>
                    </Box>
                )}

                {/* Paso 1: comparador */}
                {paso === 1 && preview && (
                    <ComparadorCampos
                        preview={preview}
                        elecciones={elecciones}
                        onChange={setElecciones}
                    />
                )}

                {/* Paso 2: confirmación */}
                {paso === 2 && preview && (
                    <ConfirmacionMerge
                        base={contacto}
                        merge={contactoMerge}
                        datosFinales={elecciones}
                        preview={preview}
                    />
                )}
            </DialogContent>

            <Divider />

            <DialogActions sx={{ px: 3, py: 1.5 }}>
                {paso > 0 && (
                    <Button onClick={() => setPaso(p => p - 1)} disabled={guardando}>
                        Atrás
                    </Button>
                )}
                <Box sx={{ flex: 1 }} />
                <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
                {paso < 2 ? (
                    <Button
                        variant="contained"
                        onClick={() => setPaso(p => p + 1)}
                        disabled={!canNext || cargandoPreview}
                    >
                        Siguiente
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmar}
                        disabled={guardando}
                        startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : <MergeIcon />}
                    >
                        {guardando ? 'Fusionando...' : 'Confirmar fusión'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default ModalMergeContacto;
