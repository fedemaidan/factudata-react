import { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Stack, Typography, CircularProgress, Switch,
    TextField, IconButton, Tooltip, Alert, Chip, Divider, Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SDRService from '../../services/sdrService';

/**
 * Modal para configurar la distribución automática de leads inbound entre SDRs.
 * 
 * @param {boolean} open
 * @param {Function} onClose
 * @param {string} empresaId
 * @param {Array} sdrsDisponibles - Lista de SDRs de la empresa [{ id, nombre }]
 */
const ModalDistribucionSDR = ({ open, onClose, empresaId, sdrsDisponibles = [] }) => {
    const [activa, setActiva] = useState(false);
    const [sdrs, setSdrs] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const cargarDistribucion = useCallback(async () => {
        if (!empresaId) return;
        setCargando(true);
        setError('');
        try {
            const data = await SDRService.obtenerDistribucion(empresaId);
            setActiva(data.activa || false);
            setSdrs(data.sdrs || []);
        } catch (err) {
            console.error('Error cargando distribución:', err);
            setError('No se pudo cargar la configuración');
        } finally {
            setCargando(false);
        }
    }, [empresaId]);

    useEffect(() => {
        if (open) cargarDistribucion();
    }, [open, cargarDistribucion]);

    const handleAgregarSDR = (sdr) => {
        if (sdrs.some(s => s.sdrId === sdr.id)) return;
        setSdrs(prev => [...prev, { sdrId: sdr.id, sdrNombre: sdr.nombre, peso: 50, activo: true }]);
    };

    const handleEliminarSDR = (sdrId) => {
        setSdrs(prev => prev.filter(s => s.sdrId !== sdrId));
    };

    const handleCambiarPeso = (sdrId, peso) => {
        const valor = Math.max(1, Math.min(100, parseInt(peso) || 1));
        setSdrs(prev => prev.map(s => s.sdrId === sdrId ? { ...s, peso: valor } : s));
    };

    const handleToggleSDR = (sdrId) => {
        setSdrs(prev => prev.map(s => s.sdrId === sdrId ? { ...s, activo: !s.activo } : s));
    };

    const handleGuardar = async () => {
        setGuardando(true);
        setError('');
        try {
            await SDRService.actualizarDistribucion({ empresaId, activa, sdrs });
            onClose(true);
        } catch (err) {
            console.error('Error guardando distribución:', err);
            setError('No se pudo guardar la configuración');
        } finally {
            setGuardando(false);
        }
    };

    const pesoTotal = sdrs.filter(s => s.activo).reduce((sum, s) => sum + s.peso, 0);
    const sdrsNoAgregados = sdrsDisponibles.filter(sd => !sdrs.some(s => s.sdrId === sd.id));

    return (
        <Dialog open={open} onClose={guardando ? undefined : () => onClose(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Distribución automática de leads</Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                            {activa ? 'Activa' : 'Inactiva'}
                        </Typography>
                        <Switch checked={activa} onChange={(e) => setActiva(e.target.checked)} disabled={guardando} />
                    </Stack>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}

                    {cargando ? (
                        <Stack alignItems="center" py={4}><CircularProgress /></Stack>
                    ) : (
                        <>
                            <Alert severity="info" sx={{ py: 0.5 }}>
                                Los leads inbound se asignarán automáticamente a los SDRs según el peso configurado.
                                Un SDR con peso 70 recibirá ~70% de los leads respecto a uno con peso 30.
                            </Alert>

                            {sdrs.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                                    No hay SDRs configurados. Agregá al menos uno para activar la distribución.
                                </Typography>
                            ) : (
                                <Stack spacing={1.5}>
                                    {sdrs.map((sdr) => {
                                        const porcentaje = pesoTotal > 0 && sdr.activo
                                            ? Math.round((sdr.peso / pesoTotal) * 100)
                                            : 0;
                                        return (
                                            <Stack
                                                key={sdr.sdrId}
                                                direction="row"
                                                alignItems="center"
                                                spacing={1.5}
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: 1,
                                                    border: '1px solid',
                                                    borderColor: sdr.activo ? 'divider' : 'action.disabledBackground',
                                                    opacity: sdr.activo ? 1 : 0.5
                                                }}
                                            >
                                                <Switch
                                                    size="small"
                                                    checked={sdr.activo}
                                                    onChange={() => handleToggleSDR(sdr.sdrId)}
                                                    disabled={guardando}
                                                />
                                                <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                                                    {sdr.sdrNombre}
                                                </Typography>
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    value={sdr.peso}
                                                    onChange={(e) => handleCambiarPeso(sdr.sdrId, e.target.value)}
                                                    disabled={guardando || !sdr.activo}
                                                    InputProps={{ inputProps: { min: 1, max: 100 } }}
                                                    sx={{ width: 80 }}
                                                />
                                                <Chip
                                                    label={`${porcentaje}%`}
                                                    size="small"
                                                    color={sdr.activo ? 'primary' : 'default'}
                                                    variant="outlined"
                                                    sx={{ minWidth: 50 }}
                                                />
                                                <Tooltip title="Quitar">
                                                    <IconButton size="small" onClick={() => handleEliminarSDR(sdr.sdrId)} disabled={guardando}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        );
                                    })}
                                </Stack>
                            )}

                            {sdrsNoAgregados.length > 0 && (
                                <>
                                    <Divider />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                            Agregar SDR:
                                        </Typography>
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                            {sdrsNoAgregados.map((sdr) => (
                                                <Chip
                                                    key={sdr.id}
                                                    label={sdr.nombre}
                                                    size="small"
                                                    icon={<AddIcon />}
                                                    onClick={() => handleAgregarSDR(sdr)}
                                                    disabled={guardando}
                                                    variant="outlined"
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                </>
                            )}
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)} disabled={guardando}>Cancelar</Button>
                <Button
                    variant="contained"
                    onClick={handleGuardar}
                    disabled={guardando || cargando}
                >
                    {guardando ? <CircularProgress size={20} /> : 'Guardar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ModalDistribucionSDR;
