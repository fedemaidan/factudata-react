import { useQuery, useQueries } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { Box, Chip, LinearProgress, Paper, Stack, Typography, Button } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import planCobroService from 'src/services/planCobroService';

const money = (n, moneda) => (n || 0).toLocaleString('es-AR', { style: 'currency', currency: moneda === 'USD' ? 'USD' : 'ARS', maximumFractionDigits: 0 });

// Pestaña "Cobros" de la obra: muestra el/los plan(es) de cobro asociados y cómo
// vienen. En modo 'plan' el cobro va por acá; en modo 'certificados' el plan se
// alimenta de los certificados aprobados.
export default function CobrosObraTab({ obra, empresaId }) {
  const router = useRouter();
  const planIds = (obra.plan_cobro_ids && obra.plan_cobro_ids.length)
    ? obra.plan_cobro_ids
    : (obra.plan_cobro_id ? [obra.plan_cobro_id] : []);

  const planesQ = useQueries({
    queries: planIds.map((pid) => ({
      queryKey: ['control-obra', 'plan-cobro', pid, empresaId],
      queryFn: async () => (await planCobroService.getPlan(pid, empresaId))?.data?.data,
      enabled: !!empresaId && !!pid,
    })),
  });
  const planes = planesQ.map((q) => q.data).filter(Boolean);
  const loading = planesQ.some((q) => q.isLoading);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} mb={2} flexWrap="wrap">
        <Typography variant="subtitle2" fontWeight={700}>Cobro de la obra:</Typography>
        <Chip
          size="small"
          color={obra.modo_cobro === 'plan' ? 'primary' : 'default'}
          label={obra.modo_cobro === 'plan' ? 'Por plan de cobro' : 'Por certificados'}
        />
        <Typography variant="caption" color="text.secondary">
          {obra.modo_cobro === 'plan'
            ? 'El cobro va por el cronograma del/los plan(es). Los certificados registran avance pero no generan cuotas.'
            : 'Cada certificado aprobado agrega una cuota al plan.'}
        </Typography>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {!loading && planes.length === 0 && (
        <Typography variant="body2" color="text.secondary">La obra no tiene plan de cobro asociado.</Typography>
      )}

      <Stack spacing={1.5}>
        {planes.map((plan) => {
          const r = plan.resumen || {};
          const pct = r.total ? Math.round((r.cobrado || 0) / r.total * 100) : 0;
          return (
            <Paper key={plan._id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: 'center' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle2" fontWeight={700}>{plan.nombre}</Typography>
                    <Chip size="small" label={plan.estado} color={plan.estado === 'completado' ? 'success' : plan.estado === 'activo' ? 'primary' : 'default'} />
                    {plan.indexacion && <Chip size="small" variant="outlined" label={plan.indexacion === 'manual' ? 'Ajuste manual' : plan.indexacion} />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {r.cuotas_cobradas || 0}/{r.cuotas_total || 0} cuotas · {plan.cliente_nombre ? `Cliente: ${plan.cliente_nombre}` : 'Sin cliente'}
                    {r.proxima_cuota?.fecha_vencimiento ? ` · Próxima: ${new Date(r.proxima_cuota.fecha_vencimiento).toLocaleDateString('es-AR')}` : ''}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<OpenInNewIcon fontSize="small" />}
                  onClick={() => router.push(`/cobros/${plan._id}`)}
                >
                  Ver plan
                </Button>
              </Stack>

              <Stack direction="row" spacing={3} mt={1.5} flexWrap="wrap">
                <Metric label="Total" value={money(r.total, plan.moneda)} />
                <Metric label="Cobrado" value={money(r.cobrado, plan.moneda)} color="success.main" />
                <Metric label="Pendiente" value={money(r.pendiente, plan.moneda)} color="error.main" />
              </Stack>

              <Box mt={1}>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">Avance de cobro</Typography>
                  <Typography variant="caption" fontWeight={600}>{pct}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={pct} color={plan.estado === 'completado' ? 'success' : 'primary'} sx={{ height: 6, borderRadius: 3 }} />
              </Box>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}

function Metric({ label, value, color }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2" fontWeight={700} color={color}>{value}</Typography>
    </Box>
  );
}
