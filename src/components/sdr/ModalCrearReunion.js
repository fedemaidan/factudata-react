import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Stack, FormControl, InputLabel, Select, MenuItem,
    CircularProgress
} from '@mui/material';

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
        linkAgenda: ''
    });

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
                linkAgenda: ''
            });
        }
    }, [contacto, open]);

    const handleSubmit = () => {
        onSubmit(form);
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
                        placeholder="Google Meet, Zoom, etc."
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
