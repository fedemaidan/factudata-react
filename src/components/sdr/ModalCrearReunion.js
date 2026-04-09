import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Stack, FormControl, InputLabel, Select, MenuItem,
    CircularProgress, FormControlLabel, Switch, Alert, InputAdornment, IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SDRService from 'src/services/sdrService';
import { appendBrowserTimezoneOffset, formatForDateTimeLocalInput } from 'src/utils/sdrDateTime';

const TAMANOS_EMPRESA = ['1-10', '11-50', '51-200', '200+'];

/**
 * Modal reutilizable para registrar/agendar una reunión SDR.
 * Reemplaza las 3 copias inline en contactosSDR, gestionSDR y contacto/[id].
 * 
 * @param {boolean} open
 * @param {Function} onClose
 * @param {Object} contacto - Contacto SDR (para pre-llenar campos)
 * @param {Function} onSubmit - Recibe el form data { fechaHora, empresaNombre, tamanoEmpresa, contactoPrincipal, rolContacto, puntosDeDolor, modulosPotenciales, linkAgenda }
 * @param {boolean} loading
 */
const ModalCrearReunion = ({ open, onClose, contacto, onSubmit, loading }) => {
    const [form, setForm] = useState({
        fechaHora: '',
        empresaNombre: '',
        tamanoEmpresa: '',
        contactoPrincipal: '',
        rolContacto: '',
        puntosDeDolor: '',
        modulosPotenciales: '',
        linkAgenda: '',
        origen: 'manual'
    });
    const [buscando, setBuscando] = useState(false);
    const [linkMsg, setLinkMsg] = useState(null);

    useEffect(() => {
        if (contacto && open) {
            setForm({
                fechaHora: '',
                empresaNombre: contacto.empresa || '',
                tamanoEmpresa: contacto.tamanoEmpresa || '',
                contactoPrincipal: contacto.nombre || '',
                rolContacto: contacto.cargo || '',
                puntosDeDolor: '',
                modulosPotenciales: '',
                linkAgenda: '',
                origen: 'manual'
            });
            setLinkMsg(null);
        }
    }, [contacto, open]);

    const buscarDatosDelLink = async () => {
        const link = form.linkAgenda.trim();
        if (!link) return;
        setBuscando(true);
        setLinkMsg(null);
        try {
            const data = await SDRService.buscarCalendarPorLink(link);
            if (data && data.titulo) {
                const fecha = data.fechaInicio ? new Date(data.fechaInicio) : null;
                const fechaLocal = fecha
                    ? formatForDateTimeLocalInput(fecha)
                    : form.fechaHora;
                setForm(prev => ({
                    ...prev,
                    fechaHora: fechaLocal || prev.fechaHora,
                    contactoPrincipal: data.nombreInvitado || prev.contactoPrincipal,
                    linkAgenda: data.linkMeet || prev.linkAgenda,
                    origen: 'auto_calendar'
                }));
                setLinkMsg({ severity: 'success', text: `Datos extraídos: "${data.titulo}" - ${data.nombreInvitado || data.emailInvitado || ''}` });
            } else {
                setLinkMsg({ severity: 'info', text: 'No se encontró un evento con ese link. Sincronizá Calendar primero.' });
            }
        } catch {
            setLinkMsg({ severity: 'error', text: 'Error buscando datos del link' });
        } finally {
            setBuscando(false);
        }
    };

    const handleSubmit = () => {
        const fechaConZona = appendBrowserTimezoneOffset(form.fechaHora);
        onSubmit({ ...form, fechaHora: fechaConZona });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>📅 Registrar Reunión</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Fecha y hora *"
                        type="datetime-local"
                        value={form.fechaHora}
                        onChange={(e) => setForm({ ...form, fechaHora: e.target.value })}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        required
                    />
                    <TextField
                        label="Nombre de la empresa *"
                        value={form.empresaNombre}
                        onChange={(e) => setForm({ ...form, empresaNombre: e.target.value })}
                        fullWidth
                        required
                    />
                    <FormControl fullWidth required>
                        <InputLabel>Tamaño de empresa *</InputLabel>
                        <Select
                            value={form.tamanoEmpresa}
                            label="Tamaño de empresa *"
                            onChange={(e) => setForm({ ...form, tamanoEmpresa: e.target.value })}
                        >
                            {TAMANOS_EMPRESA.map(t => (
                                <MenuItem key={t} value={t}>{t} empleados</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Contacto principal *"
                        value={form.contactoPrincipal}
                        onChange={(e) => setForm({ ...form, contactoPrincipal: e.target.value })}
                        fullWidth
                        required
                    />
                    <TextField
                        label="Rol del contacto"
                        value={form.rolContacto}
                        onChange={(e) => setForm({ ...form, rolContacto: e.target.value })}
                        fullWidth
                        placeholder="Ej: Gerente, Dueño, etc."
                    />
                    <TextField
                        label="Puntos de dolor"
                        value={form.puntosDeDolor}
                        onChange={(e) => setForm({ ...form, puntosDeDolor: e.target.value })}
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="¿Qué problemas tiene la empresa?"
                    />
                    <TextField
                        label="Módulos potenciales"
                        value={form.modulosPotenciales}
                        onChange={(e) => setForm({ ...form, modulosPotenciales: e.target.value })}
                        fullWidth
                        placeholder="Ej: Facturación, Stock, etc."
                    />
                    <TextField
                        label="Link de la reunión"
                        value={form.linkAgenda}
                        onChange={(e) => setForm({ ...form, linkAgenda: e.target.value })}
                        fullWidth
                        placeholder="Pegá el link de Google Meet, Zoom, etc."
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={buscarDatosDelLink}
                                        disabled={!form.linkAgenda.trim() || buscando}
                                        size="small"
                                        title="Extraer datos del evento"
                                    >
                                        {buscando ? <CircularProgress size={20} /> : <SearchIcon />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                    {linkMsg && (
                        <Alert severity={linkMsg.severity} onClose={() => setLinkMsg(null)} sx={{ py: 0 }}>
                            {linkMsg.text}
                        </Alert>
                    )}
                    <FormControlLabel
                        control={
                            <Switch
                                checked={form.origen === 'auto_calendar'}
                                onChange={(e) => setForm({ ...form, origen: e.target.checked ? 'auto_calendar' : 'manual' })}
                                size="small"
                            />
                        }
                        label="🤖 Agendada por el bot"
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!form.fechaHora || !form.empresaNombre || !form.tamanoEmpresa || !form.contactoPrincipal || loading}
                >
                    {loading ? <CircularProgress size={20} /> : 'Registrar Reunión'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ModalCrearReunion;
