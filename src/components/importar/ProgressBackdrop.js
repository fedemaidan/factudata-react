import React from 'react';
import { Backdrop, Box, LinearProgress, Typography } from '@mui/material';

export default function ProgressBackdrop({ open, progreso }) {
  return (
    <Backdrop
      open={open}
      sx={{ color: '#fff', zIndex: (t) => t.zIndex.modal + 1, flexDirection: 'column', gap: 2 }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>Procesando archivo…</Typography>
      <Box sx={{ width: '60%', maxWidth: 600 }}>
        <LinearProgress variant={Number.isFinite(progreso) ? 'determinate' : 'indeterminate'} value={progreso || 0} />
      </Box>
      <Typography variant="caption" sx={{ opacity: 0.85 }}>
        {Number.isFinite(progreso) ? `${Math.round(progreso)}%` : 'Preparando…'}
      </Typography>
    </Backdrop>
  );
}
