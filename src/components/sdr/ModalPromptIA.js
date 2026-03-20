import { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Stack, Typography, CircularProgress,
    Checkbox, FormControlLabel, IconButton, Tooltip, Alert
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import SDRService from '../../services/sdrService';

/**
 * Modal reutilizable para editar el prompt IA antes de ejecutar un análisis.
 * Soporta 3 tipos: 'audio' (audio grabado), 'transcripcion' (transcripción reunión), 'resumen' (resumen contacto).
 * 
 * @param {boolean} open
 * @param {Function} onClose
 * @param {string} empresaId - Para cargar/guardar config
 * @param {'audio'|'transcripcion'|'resumen'} tipo - Tipo de prompt
 * @param {Function} onConfirm - (promptOverride, guardarComoDefault) => void
 * @param {boolean} loading - Si el análisis está en progreso
 */
const ModalPromptIA = ({ open, onClose, empresaId, tipo = 'audio', onConfirm, loading }) => {
    const [prompt, setPrompt] = useState('');
    const [promptDefault, setPromptDefault] = useState('');
    const [promptGuardado, setPromptGuardado] = useState('');
    const [guardarComoDefault, setGuardarComoDefault] = useState(false);
    const [cargando, setCargando] = useState(false);

    const cargarConfig = useCallback(async () => {
        if (!empresaId) return;
        setCargando(true);
        try {
            const config = await SDRService.obtenerConfig(empresaId);
            if (tipo === 'audio') {
                setPromptDefault(config.promptAudioDefault || '');
                setPromptGuardado(config.promptAudioResumen || '');
                setPrompt(config.promptAudioResumen || config.promptAudioDefault || '');
            } else if (tipo === 'transcripcion') {
                setPromptDefault(config.promptTranscripcionReunionDefault || '');
                setPromptGuardado(config.promptTranscripcionReunion || '');
                setPrompt(config.promptTranscripcionReunion || config.promptTranscripcionReunionDefault || '');
            } else {
                setPromptDefault(config.promptResumenContactoDefault || '');
                setPromptGuardado(config.promptResumenContacto || '');
                setPrompt(config.promptResumenContacto || config.promptResumenContactoDefault || '');
            }
        } catch (err) {
            console.error('Error cargando config prompt:', err);
        } finally {
            setCargando(false);
        }
    }, [empresaId, tipo]);

    useEffect(() => {
        if (open) {
            cargarConfig();
            setGuardarComoDefault(false);
        }
    }, [open, cargarConfig]);

    const handleRestaurarDefault = () => {
        setPrompt(promptDefault);
    };

    const handleConfirm = () => {
        // Si el prompt es igual al guardado (custom) o al default, no enviar override
        const esIgualAlActual = prompt === (promptGuardado || promptDefault);
        onConfirm(
            esIgualAlActual && !guardarComoDefault ? null : prompt,
            guardarComoDefault
        );
    };

    const titulo = tipo === 'audio'
        ? 'Prompt IA — Audio Grabado'
        : tipo === 'transcripcion'
            ? 'Prompt IA — Transcripción de Reunión'
            : 'Prompt IA — Resumen Contacto';

    const esCustom = promptGuardado && prompt !== promptDefault;

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>{titulo}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {cargando ? (
                        <Stack alignItems="center" py={4}><CircularProgress /></Stack>
                    ) : (
                        <>
                            {promptGuardado && (
                                <Alert severity="info" sx={{ py: 0.5 }}>
                                    Tenés un prompt personalizado guardado para esta empresa.
                                </Alert>
                            )}
                            <TextField
                                multiline
                                minRows={8}
                                maxRows={18}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                fullWidth
                                variant="outlined"
                                placeholder="Escribí las instrucciones para la IA..."
                                sx={{ '& .MuiInputBase-input': { fontSize: '0.82rem', fontFamily: 'monospace' } }}
                            />
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                <Tooltip title="Restaurar prompt por defecto del sistema">
                                    <IconButton size="small" onClick={handleRestaurarDefault} disabled={prompt === promptDefault}>
                                        <RestoreIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            size="small"
                                            checked={guardarComoDefault}
                                            onChange={(e) => setGuardarComoDefault(e.target.checked)}
                                        />
                                    }
                                    label={<Typography variant="caption">Guardar como default para esta empresa</Typography>}
                                />
                            </Stack>
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancelar</Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={loading || cargando || !prompt.trim()}
                >
                    {loading ? <CircularProgress size={20} /> : '🤖 Analizar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ModalPromptIA;
