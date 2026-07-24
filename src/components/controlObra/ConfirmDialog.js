import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Stack, Box,
} from '@mui/material';

// Diálogo de confirmación reutilizable (reemplaza window.confirm).
export default function ConfirmDialog({
  open,
  title,
  message,
  detail = null,
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
  confirmColor = 'primary',
  icon = null,
  loading = false,
  onConfirm,
  onClose,
}) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {icon && <Box sx={{ display: 'flex' }}>{icon}</Box>}
          <span>{title}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ whiteSpace: 'pre-line' }}>{message}</DialogContentText>
        {detail && (
          <DialogContentText variant="caption" sx={{ mt: 1.5, display: 'block', whiteSpace: 'pre-line' }}>
            {detail}
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">{cancelLabel}</Button>
        <Button onClick={onConfirm} disabled={loading} color={confirmColor} variant="contained" disableElevation>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
