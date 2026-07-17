import { useQuery, useQueries } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { Box, Chip, LinearProgress, Paper, Stack, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import planCobroService from 'src/services/planCobroService';

const money = (n, moneda) => (n || 0).toLocaleString('es-AR', { style: 'currency', currency: moneda === 'USD' ? 'USD' : 'ARS', maximumFractionDigits: 0 });

// Pestaña "Cobros" de la obra: muestra el/los plan(es) de cobro asociados (0..N).
// "Nuevo plan" abre el asistente de creación con la obra ya asignada; al guardar,
// el plan queda asociado a la obra. Los certificados se cobran directo (otra pestaña).
export default function CobrosObraTab({ obra, empresaId }) {
  const router = useRouter();
  // Abre el asistente de plan de cobro con la obra (y su proyecto) precargados.
  const nuevoPlan = () => router.push({
    pathname: '/cobros/nuevo',
    query: { obra: obra._id, ...(obra.proyecto_id ? { proyecto: obra.proyecto_id } : {}) },
  });
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
        <Typography variant="subtitle2" fontWeight={700}>Planes de cobro de la obra</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
          Una obra puede tener 0..N planes de cobro (fijos). Los certificados se cobran directo (pestaña Certificados).
        </Typography>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={nuevoPlan}>
          Nuevo plan
        </Button>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {!loading && planes.length === 0 && (
        <Typography variant="body2" color="text.secondary">La obra no tiene planes de cobro asociados.</Typography>
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
