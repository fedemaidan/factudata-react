import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  MenuItem
} from '@mui/material';

export const MensajeProgramadoDialog = ({ open, onClose, onSave, mensaje, currentUser }) => {
  const [formData, setFormData] = useState({
    createdFor: '',
    from: 'Sorby',
    to: '',
    mensaje: '',
    fechaEnvioProgramada: '',
    archivosAdjuntos: '',
    estado: 'PENDIENTE'
  });

  useEffect(() => {
    if (mensaje) {
      setFormData({
        createdFor: mensaje.createdFor || '',
        from: mensaje.from || 'Sorby',
        to: mensaje.to || '',
        mensaje: mensaje.mensaje || '',
        fechaEnvioProgramada: mensaje.fechaEnvioProgramada ? new Date(mensaje.fechaEnvioProgramada).toISOString().slice(0, 16) : '',
        archivosAdjuntos: mensaje.archivosAdjuntos ? mensaje.archivosAdjuntos.join(', ') : '',
        estado: mensaje.estado || 'PENDIENTE'
      });
    } else {
      setFormData({
        createdFor: currentUser?.email || '',
        from: 'Sorby',
        to: '',
        mensaje: '',
        fechaEnvioProgramada: '',
        archivosAdjuntos: '',
        estado: 'PENDIENTE'
      });
    }
  }, [mensaje, open, currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const payload = {
      ...formData,
      archivosAdjuntos: formData.archivosAdjuntos.split(',').map(s => s.trim()).filter(s => s)
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mensaje ? 'Editar Mensaje Programado' : 'Nuevo Mensaje Programado'}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <TextField
            label="Creado Por (ID Usuario)"
            name="createdFor"
            value={formData.createdFor}
            onChange={handleChange}
            fullWidth
            required
            disabled
          />
          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="De (Asistente)"
              name="from"
              value={formData.from}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value="Sorby">Sorby</MenuItem>
            </TextField>
            <TextField
              label="Para (Teléfono)"
              name="to"
              value={formData.to}
              onChange={handleChange}
              fullWidth
              required
            />
          </Stack>
          <TextField
            label="Mensaje"
            name="mensaje"
            value={formData.mensaje}
            onChange={handleChange}
            fullWidth
            multiline
            rows={4}
            required
          />
          <TextField
            label="Fecha Programada"
            name="fechaEnvioProgramada"
            type="datetime-local"
            value={formData.fechaEnvioProgramada}
            onChange={handleChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            label="Archivos Adjuntos (URLs separadas por coma)"
            name="archivosAdjuntos"
            value={formData.archivosAdjuntos}
            onChange={handleChange}
            fullWidth
            helperText="Ej: https://ejemplo.com/foto.jpg, https://ejemplo.com/doc.pdf"
          />
          <TextField
            select
            label="Estado"
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            fullWidth
          >
            <MenuItem value="PENDIENTE">Pendiente</MenuItem>
            <MenuItem value="ENVIADO">Enviado</MenuItem>
            <MenuItem value="CANCELADO">Cancelado</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained">Guardar</Button>
      </DialogActions>
    </Dialog>
  );
};
