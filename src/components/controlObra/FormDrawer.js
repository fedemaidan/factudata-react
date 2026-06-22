import { Box, Divider, Drawer, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Drawer de formulario reutilizable: header con título + cerrar, contenido
// scrolleable y footer con acciones. Reemplaza a los Dialog del módulo.
export default function FormDrawer({ open, onClose, title, subtitle, actions, width = 440, children }) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: width } } }}>
      <Stack sx={{ height: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, pb: subtitle ? 0.5 : 1.5 }}>
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Stack>
        {subtitle && <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 1.5 }}>{subtitle}</Typography>}
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>{children}</Box>
        {actions && (
          <>
            <Divider />
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ p: 2 }}>{actions}</Stack>
          </>
        )}
      </Stack>
    </Drawer>
  );
}
