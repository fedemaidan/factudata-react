import { Box, Stack, Typography, LinearProgress, Tooltip, Chip } from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

const COLORS = [
  '#1976d2', // azul
  '#2e7d32', // verde
  '#ed6c02', // naranja
  '#9c27b0', // violeta
  '#d32f2f', // rojo
];

/**
 * FunnelBarChart — Gráfico de barras horizontales para el funnel.
 *
 * @param {{ pasos: Array<{ id, label, cantidad, porcentajeBase, porcentajePasoAnterior, nota?, baseEspecifica? }> }} props
 */
export default function FunnelBarChart({ pasos = [], titulo = '' }) {
  if (!pasos.length) return null;

  const maxCantidad = pasos[0]?.cantidad || 1;

  return (
    <Box>
      {titulo && (
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          {titulo}
        </Typography>
      )}

      <Stack spacing={1.5}>
        {pasos.map((paso, i) => {
          const barWidth = maxCantidad > 0 ? (paso.cantidad / maxCantidad) * 100 : 0;
          const color = COLORS[i % COLORS.length];

          return (
            <Box key={paso.id}>
              {/* Header del paso */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight={500}>
                    {i + 1}. {paso.label}
                  </Typography>
                  {paso.nota && (
                    <Chip label={paso.nota} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                  )}
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography variant="body2" fontWeight={600}>
                    {paso.cantidad}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ({paso.porcentajeBase}%)
                  </Typography>
                </Stack>
              </Stack>

              {/* Barra */}
              <Tooltip
                title={`${paso.porcentajeBase}% del total — ${paso.porcentajePasoAnterior}% del paso anterior`}
                arrow
              >
                <Box sx={{ position: 'relative', height: 28, bgcolor: 'grey.100', borderRadius: 1, overflow: 'hidden' }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: `${barWidth}%`,
                      bgcolor: color,
                      borderRadius: 1,
                      transition: 'width 0.5s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      pr: 1,
                    }}
                  >
                    {barWidth > 15 && (
                      <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>
                        {paso.porcentajeBase}%
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Tooltip>

              {/* Drop-off indicator */}
              {i > 0 && paso.porcentajePasoAnterior < 100 && (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.3 }}>
                  <ArrowDownwardIcon sx={{ fontSize: 12, color: 'error.main' }} />
                  <Typography variant="caption" color="error.main">
                    -{(100 - paso.porcentajePasoAnterior).toFixed(1)}% vs paso anterior
                  </Typography>
                  {paso.baseEspecifica && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      (base: {paso.baseEspecifica.label} = {paso.baseEspecifica.cantidad})
                    </Typography>
                  )}
                </Stack>
              )}

              {/* Distribución (ej: desglose de respuestas del menú) */}
              {paso.distribucion && paso.distribucion.length > 0 && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  {paso.distribucion.map(d => (
                    <Chip
                      key={d.id}
                      label={`${d.label}: ${d.cantidad}`}
                      size="small"
                      variant="outlined"
                      color="primary"
                      sx={{ fontSize: 11, height: 22 }}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
