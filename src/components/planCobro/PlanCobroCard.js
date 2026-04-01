import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  CardActionArea,
  IconButton,
  Tooltip,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Stack,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatCurrency } from 'src/utils/formatters';

const ESTADO_COLOR = {
  borrador: 'default',
  activo: 'primary',
  completado: 'success',
};

const ESTADO_LABEL = {
  borrador: 'Borrador',
  activo: 'Activo',
  completado: 'Completado',
};

const diasDesde = (fecha) => {
  if (!fecha) return 0;
  const diff = Date.now() - new Date(fecha).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const PlanCobroCard = ({ plan, onClick, onDelete }) => {
  const resumen = plan.resumen || {};
  const total = resumen.total || plan.monto_total || 0;
  const cobrado = resumen.cobrado || 0;
  const pct = total > 0 ? Math.round((cobrado / total) * 100) : 0;
  const moneda = plan.moneda === 'CAC' ? 'ARS' : plan.moneda || 'ARS';
  const cuotasCount = plan.cuotas?.length || resumen.cuotas_count || 0;
  const cobradasCount = resumen.cobradas || 0;

  const proximaFecha = resumen.proxima_cuota?.fecha_vencimiento
    ? new Date(resumen.proxima_cuota.fecha_vencimiento).toLocaleDateString('es-AR')
    : null;

  // Detalle de vencida más urgente
  const vencidas = (plan.cuotas || []).filter((c) => (c.estado_ui || c.estado) === 'vencida');
  const vencidaTexto = vencidas.length > 0
    ? (() => {
        const primera = vencidas[0];
        const dias = diasDesde(primera.fecha_vencimiento);
        return `Cuota ${primera.numero} venció hace ${dias} día${dias !== 1 ? 's' : ''}`;
      })()
    : null;

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
        position: 'relative',
      }}
    >
      {onDelete && (
        <Tooltip title="Eliminar plan">
          <IconButton
            size="small"
            color="error"
            onClick={(e) => { e.stopPropagation(); onDelete(plan); }}
            sx={{ position: 'absolute', top: 6, right: 6, zIndex: 1, opacity: 0.6, '&:hover': { opacity: 1 } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <CardActionArea onClick={onClick} sx={{ height: '100%', p: 0 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ maxWidth: '70%' }}>
              {plan.nombre}
            </Typography>
            <Chip
              label={ESTADO_LABEL[plan.estado] || plan.estado}
              color={ESTADO_COLOR[plan.estado] || 'default'}
              size="small"
            />
          </Stack>

          <Stack spacing={0.25} mb={1}>
            {plan.codigo && (
              <Typography variant="caption" color="text.secondary">
                #{plan.codigo}
              </Typography>
            )}
            {plan.proyecto_nombre && (
              <Typography variant="caption" color="text.secondary">
                {plan.proyecto_nombre}
              </Typography>
            )}
            {plan.indexacion && (
              <Typography variant="caption" color="text.secondary">
                Indexación: {plan.indexacion}{plan.cac_tipo && plan.indexacion === 'CAC' ? ` (${plan.cac_tipo})` : ''}
              </Typography>
            )}
            {plan.createdAt && (
              <Typography variant="caption" color="text.secondary">
                Creado: {new Date(plan.createdAt).toLocaleDateString('es-AR')}
              </Typography>
            )}
          </Stack>

          <Box mt={1.5} mb={1}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" color="text.secondary">
                {cobradasCount}/{cuotasCount} cuotas · {pct}%
              </Typography>
              <Typography variant="body2">
                {formatCurrency(cobrado, moneda)} / {formatCurrency(total, moneda)}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={pct}
              color={plan.estado === 'completado' ? 'success' : resumen.hay_vencidas ? 'error' : 'primary'}
            />
          </Box>

          {vencidaTexto && (
            <Chip label={vencidaTexto} color="error" size="small" sx={{ mt: 1 }} />
          )}

          {!resumen.hay_vencidas && proximaFecha && (
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Próxima cuota: {proximaFecha}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default PlanCobroCard;

PlanCobroCard.propTypes = {
  plan: PropTypes.object.isRequired,
  onClick: PropTypes.func,
  onDelete: PropTypes.func,
};
