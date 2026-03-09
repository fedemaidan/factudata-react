import { Box, Typography, Chip, Stack, Tooltip } from '@mui/material';

/**
 * Muestra los estados terminales como chips con su conteo y porcentaje.
 */
export default function FunnelTerminalStates({ estadosTerminales = [], totalCohorte = 0 }) {
  if (!estadosTerminales.length) return null;

  const totalTerminales = estadosTerminales.reduce((acc, e) => acc + e.cantidad, 0);

  return (
    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        Estados terminales ({totalTerminales} contactos — {totalCohorte > 0 ? ((totalTerminales / totalCohorte) * 100).toFixed(1) : 0}% del total)
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {estadosTerminales
          .filter(e => e.cantidad > 0)
          .sort((a, b) => b.cantidad - a.cantidad)
          .map(e => (
            <Tooltip key={e.id} title={`${e.porcentaje}% del total de la cohorte`} arrow>
              <Chip
                label={`${e.label}: ${e.cantidad} (${e.porcentaje}%)`}
                size="small"
                color="default"
                variant="outlined"
                sx={{ fontSize: 12 }}
              />
            </Tooltip>
          ))}
        {estadosTerminales.every(e => e.cantidad === 0) && (
          <Typography variant="body2" color="text.secondary">
            No hay contactos en estados terminales en esta cohorte.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
