import { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Stack, FormControl, InputLabel, Select, MenuItem,
    CircularProgress, Typography, Stepper, Step, StepLabel,
    Chip, Box, FormGroup, FormControlLabel, Checkbox, Alert,
    ToggleButton, ToggleButtonGroup
} from '@mui/material';
import {
    combineDateAndTimeToOffsetIso,
    formatForDateInput,
    formatForTimeInput
} from 'src/utils/sdrDateTime';

const MODULOS_DISPONIBLES = [
    'Stock', 'Acopios', 'Presupuestos', 'Movimientos',
    'Plan de obra', 'Reportes', 'Facturación', 'Otro'
];

const CALIFICACIONES = [
    { value: 'frio', label: '❄️ Frío', color: '#90caf9' },
    { value: 'tibio', label: '🌤️ Tibio', color: '#ffcc80' },
    { value: 'caliente', label: '🔥 Caliente', color: '#ef9a9a' },
    { value: 'listo_para_cerrar', label: '🎯 Listo para cerrar', color: '#a5d6a7' }
];

const TIPOS_PROXIMO_CONTACTO = [
    { value: 'llamar_despues', label: '📞 Llamar' },
    { value: 'mensaje_despues', label: '💬 WhatsApp' },
    { value: 'coordinar_reunion', label: '📅 2da reunión' },
    { value: 'enviar_propuesta', label: '📄 Propuesta' },
    { value: 'recordatorio', label: '⏰ Recordatorio' }
];

const PASOS = [
    'Estado',
    'Comentario',
    'Transcripción',
    'Detalles',
    'Próximo contacto'
];

/**
 * Modal multi-paso para registrar el resultado de una reunión.
 * 
 * Flujo: Estado → Comentario (obligatorio) → Transcripción (opcional) → 
 *        Módulos + Calificación (opcional) → Próximo contacto (obligatorio)
 * 
 * @param {boolean} open
 * @param {Function} onClose
 * @param {Object} reunion - La reunión a registrar resultado
 * @param {Function} onSubmit - Recibe { estado, comentario, transcripcion, modulosInteres, calificacionRapida, proximoContacto }
 * @param {boolean} loading
 */
const ModalResultadoReunion = ({ open, onClose, reunion, onSubmit, loading }) => {
    const [paso, setPaso] = useState(0);
    const [form, setForm] = useState({
        estado: 'realizada',
        comentario: '',
        transcripcion: '',
        modulosInteres: [],
        calificacionRapida: null,
        proximoContacto: {
            tipo: 'llamar_despues',
            fecha: '',
            hora: '',
            nota: ''
        }
    });

    useEffect(() => {
        if (!open) return;
        const fechaBase = reunion?.contactoId?.proximaTarea?.fecha || reunion?.contactoId?.proximoContacto || null;
        if (!fechaBase) return;

        setForm(prev => ({
            ...prev,
            proximoContacto: {
                ...prev.proximoContacto,
                fecha: prev.proximoContacto.fecha || formatForDateInput(fechaBase),
                hora: prev.proximoContacto.hora || formatForTimeInput(fechaBase)
            }
        }));
    }, [open, reunion]);

    const handleReset = () => {
        setPaso(0);
        setForm({
            estado: 'realizada',
            comentario: '',
            transcripcion: '',
            modulosInteres: [],
            calificacionRapida: null,
            proximoContacto: {
                tipo: 'llamar_despues',
                fecha: '',
                hora: '',
                nota: ''
            }
        });
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const handleToggleModulo = (modulo) => {
        setForm(prev => ({
            ...prev,
            modulosInteres: prev.modulosInteres.includes(modulo)
                ? prev.modulosInteres.filter(m => m !== modulo)
                : [...prev.modulosInteres, modulo]
        }));
    };

    const handleProximoContactoChange = (field, value) => {
        setForm(prev => ({
            ...prev,
            proximoContacto: {
                ...prev.proximoContacto,
                [field]: value
            }
        }));
    };

    const puedeAvanzar = () => {
        switch (paso) {
            case 0: return !!form.estado;
            case 1: return form.estado === 'realizada' ? form.comentario.trim().length > 0 : true;
            case 2: return true; // transcripción es opcional
            case 3: return true; // módulos y calificación son opcionales
            case 4: return form.proximoContacto.tipo && form.proximoContacto.fecha && form.proximoContacto.hora;
            default: return false;
        }
    };

    const handleNext = () => {
        if (paso < PASOS.length - 1) {
            // Si no_show o cancelada, saltar transcripción y detalles
            if ((form.estado === 'no_show' || form.estado === 'cancelada') && paso === 0) {
                setPaso(4); // Ir directo a próximo contacto
                return;
            }
            setPaso(paso + 1);
        }
    };

    const handleBack = () => {
        if (paso > 0) {
            // Si no_show o cancelada y estamos en paso 4, volver a paso 0
            if ((form.estado === 'no_show' || form.estado === 'cancelada') && paso === 4) {
                setPaso(0);
                return;
            }
            setPaso(paso - 1);
        }
    };

    const handleSubmit = () => {
        const fechaNormalizada = combineDateAndTimeToOffsetIso(
            form.proximoContacto.fecha,
            form.proximoContacto.hora
        );

        onSubmit({
            estado: form.estado,
            comentario: form.comentario || null,
            transcripcion: form.transcripcion || null,
            modulosInteres: form.modulosInteres.length > 0 ? form.modulosInteres : null,
            calificacionRapida: form.calificacionRapida || null,
            proximoContacto: {
                tipo: form.proximoContacto.tipo,
                fecha: fechaNormalizada,
                nota: form.proximoContacto.nota || ''
            }
        });
        handleReset();
    };

    const esUltimoPaso = paso === PASOS.length - 1;

    // Nombre del contacto para el título
    const nombreContacto = reunion?.contactoId?.nombre || reunion?.contactoPrincipal || 'Reunión';

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                📝 Resultado — {nombreContacto}
            </DialogTitle>
            <DialogContent>
                <Stepper activeStep={paso} alternativeLabel sx={{ mb: 3, mt: 1 }}>
                    {PASOS.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {/* Paso 0: Estado */}
                {paso === 0 && (
                    <Stack spacing={2}>
                        <Typography variant="subtitle2" color="text.secondary">
                            ¿Cómo fue la reunión?
                        </Typography>
                        <ToggleButtonGroup
                            value={form.estado}
                            exclusive
                            onChange={(_, val) => val && setForm({ ...form, estado: val })}
                            fullWidth
                        >
                            <ToggleButton value="realizada" color="success">
                                ✅ Realizada
                            </ToggleButton>
                            <ToggleButton value="no_show" color="error">
                                ❌ No show
                            </ToggleButton>
                            <ToggleButton value="cancelada" color="warning">
                                🚫 Cancelada
                            </ToggleButton>
                        </ToggleButtonGroup>
                        {form.estado === 'no_show' && (
                            <Alert severity="info" sx={{ mt: 1 }}>
                                Se irá directo al paso de próximo contacto.
                            </Alert>
                        )}
                        {form.estado === 'cancelada' && (
                            <TextField
                                label="Motivo de cancelación"
                                value={form.comentario}
                                onChange={(e) => setForm({ ...form, comentario: e.target.value })}
                                fullWidth
                                multiline
                                rows={2}
                                placeholder="¿Por qué se canceló?"
                            />
                        )}
                    </Stack>
                )}

                {/* Paso 1: Comentario */}
                {paso === 1 && (
                    <Stack spacing={2}>
                        <Typography variant="subtitle2" color="text.secondary">
                            ¿Qué se habló? Conclusiones de la reunión *
                        </Typography>
                        <TextField
                            label="Comentario *"
                            value={form.comentario}
                            onChange={(e) => setForm({ ...form, comentario: e.target.value })}
                            fullWidth
                            multiline
                            minRows={4}
                            maxRows={12}
                            placeholder="Resumen de lo conversado, puntos clave, acuerdos..."
                            required
                            helperText={form.comentario.length === 0 ? 'Obligatorio para reuniones realizadas' : ''}
                        />
                    </Stack>
                )}

                {/* Paso 2: Transcripción */}
                {paso === 2 && (
                    <Stack spacing={2}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Transcripción de la reunión (opcional)
                        </Typography>
                        <TextField
                            label="Transcripción"
                            value={form.transcripcion}
                            onChange={(e) => setForm({ ...form, transcripcion: e.target.value })}
                            fullWidth
                            multiline
                            rows={6}
                            placeholder="Pegá la transcripción de la reunión aquí..."
                        />
                        <Alert severity="info">
                            Si cargás una transcripción, se generará automáticamente un resumen con IA.
                        </Alert>
                    </Stack>
                )}

                {/* Paso 3: Módulos de interés + Calificación */}
                {paso === 3 && (
                    <Stack spacing={3}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                Módulos de interés
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {MODULOS_DISPONIBLES.map(modulo => (
                                    <Chip
                                        key={modulo}
                                        label={modulo}
                                        onClick={() => handleToggleModulo(modulo)}
                                        color={form.modulosInteres.includes(modulo) ? 'primary' : 'default'}
                                        variant={form.modulosInteres.includes(modulo) ? 'filled' : 'outlined'}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                ))}
                            </Box>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                Calificación rápida
                            </Typography>
                            <ToggleButtonGroup
                                value={form.calificacionRapida}
                                exclusive
                                onChange={(_, val) => setForm({ ...form, calificacionRapida: val })}
                                fullWidth
                                size="small"
                            >
                                {CALIFICACIONES.map(c => (
                                    <ToggleButton key={c.value} value={c.value} sx={{ fontSize: '0.85rem' }}>
                                        {c.label}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </Box>
                    </Stack>
                )}

                {/* Paso 4: Próximo contacto */}
                {paso === 4 && (
                    <Stack spacing={2}>
                        <Typography variant="subtitle2" color="text.secondary">
                            ¿Cuál es el próximo paso? *
                        </Typography>
                        <FormControl fullWidth required>
                            <InputLabel>Tipo de acción</InputLabel>
                            <Select
                                value={form.proximoContacto.tipo}
                                label="Tipo de acción"
                                onChange={(e) => handleProximoContactoChange('tipo', e.target.value)}
                            >
                                {TIPOS_PROXIMO_CONTACTO.map(t => (
                                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Fecha *"
                            type="date"
                            value={form.proximoContacto.fecha}
                            onChange={(e) => handleProximoContactoChange('fecha', e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            required
                        />
                        <TextField
                            label="Hora *"
                            type="time"
                            value={form.proximoContacto.hora}
                            onChange={(e) => handleProximoContactoChange('hora', e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            required
                        />
                        <TextField
                            label="Nota"
                            value={form.proximoContacto.nota}
                            onChange={(e) => handleProximoContactoChange('nota', e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="Detalles del próximo contacto..."
                        />
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    Cancelar
                </Button>
                {paso > 0 && (
                    <Button onClick={handleBack} disabled={loading}>
                        Atrás
                    </Button>
                )}
                {!esUltimoPaso ? (
                    <Button
                        variant="contained"
                        onClick={handleNext}
                        disabled={!puedeAvanzar()}
                    >
                        Siguiente
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleSubmit}
                        disabled={!puedeAvanzar() || loading}
                    >
                        {loading ? <CircularProgress size={20} /> : 'Guardar resultado'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default ModalResultadoReunion;
