import { useState } from 'react';
import { Button, TextField } from '@mui/material';
import FormDrawer from 'src/components/controlObra/FormDrawer';

// Drawer chico para capturar un motivo (rechazo / anulación) antes de confirmar.
export default function MotivoDialog({ open, onClose, title, subtitle, confirmLabel = 'Confirmar', color = 'error', pending = false, onConfirm }) {
  const [motivo, setMotivo] = useState('');
  return (
    <FormDrawer
      open={open} onClose={onClose} title={title} subtitle={subtitle}
      actions={(
        <>
          <Button onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button variant="contained" color={color} disabled={pending} onClick={() => onConfirm(motivo.trim() || null)}>
            {pending ? '…' : confirmLabel}
          </Button>
        </>
      )}
    >
      <TextField
        label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}
        fullWidth multiline minRows={3} size="small" autoFocus placeholder="Opcional, pero recomendado para el historial"
      />
    </FormDrawer>
  );
}
