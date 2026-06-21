import { useQuery } from '@tanstack/react-query';
import { Box, Divider, Paper, Stack, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ControlObraService from 'src/services/controlObra/controlObraService';
import { KpiCard, fmt, fmtM } from 'src/components/controlObra/ui';

// Tablero de la obra (cockpit): snapshot financiero + qué necesita atención + circuito de plata.
export default function ResumenTab({ obra, ejec, certs = [], empresaId }) {
  const carteraQ = useQuery({
    queryKey: ['control-obra', 'cartera', empresaId],
    queryFn: () => ControlObraService.resumenCartera(empresaId),
    enabled: !!empresaId,
  });
  const incQ = useQuery({
    queryKey: ['control-obra', 'inconvenientes', obra._id, empresaId],
    queryFn: () => ControlObraService.listarInconvenientes(obra._id, empresaId),
    enabled: !!empresaId,
  });
  const curvaQ = useQuery({
    queryKey: ['control-obra', 'curva-s', obra._id, empresaId],
    queryFn: () => ControlObraService.curvaS(obra._id, empresaId),
    enabled: !!empresaId,
  });
  const curva = curvaQ.data || { meses: [], certificado: [], cobrado: [], plan: [] };

  const row = (carteraQ.data || []).find((o) => o._id === obra._id) || {};
  const total = obra.total_contrato || 0;
  const avance = row.avance_pct ?? (total ? ((ejec?.totales?.valor_avance || 0) / total) * 100 : 0);
  const certAprob = (certs || []).filter((c) => c.estado === 'aprobado').reduce((s, c) => s + (c.monto_total || 0), 0);
  const cobrado = row.cobrado || 0;
  const pendiente = row.pendiente || 0;
  const gastado = ejec?.totales?.gastado || 0;
  const margen = ejec?.totales?.margen || 0;

  // Alertas (síntesis cross-pestaña — el diferenciador del tablero)
  const certsPend = (certs || []).filter((c) => c.estado === 'enviado');
  const montoCertPend = certsPend.reduce((s, c) => s + (c.monto_total || 0), 0);
  const incAbiertos = (incQ.data || []).filter((i) => i.estado === 'abierto').length;
  const subsNeg = (ejec?.rubros || []).flatMap((r) => r.subrubros || []).filter((s) => (s.gastado || 0) > 0 && s.margen < 0);

  const alertas = [];
  if (certsPend.length) alertas.push({ icon: <AccessTimeIcon color="warning" />, label: `${certsPend.length} certificado${certsPend.length > 1 ? 's' : ''} esperando aprobación`, sub: 'destraba la cobranza', value: fmt(montoCertPend), color: 'warning.main' });
  if (pendiente > 0) alertas.push({ icon: <HourglassEmptyIcon color="warning" />, label: 'Pendiente de cobro', sub: 'certificado aprobado, sin cobrar', value: fmt(pendiente), color: 'warning.main' });
  if (incAbiertos > 0) alertas.push({ icon: <ReportProblemIcon color="error" />, label: `${incAbiertos} inconveniente${incAbiertos > 1 ? 's' : ''} abierto${incAbiertos > 1 ? 's' : ''}`, sub: 'resolver antes del cierre', value: null, color: 'error.main' });
  if (subsNeg.length) alertas.push({ icon: <TrendingDownIcon color="error" />, label: `${subsNeg.length} sub-rubro${subsNeg.length > 1 ? 's' : ''} con margen negativo`, sub: 'gastás más de lo certificado', value: null, color: 'error.main' });

  return (
    <Box>
      <Stack direction="row" spacing={2} flexWrap="wrap" mb={3} useFlexGap>
        <KpiCard label="Contrato" value={fmtM(total)} sub="presupuesto total" />
        <KpiCard label="Avance físico" value={`${avance.toFixed(1)}%`} sub="ponderado por monto" />
        <KpiCard label="Certificado" value={fmtM(certAprob)} sub={`${total ? ((certAprob / total) * 100).toFixed(0) : 0}% · aprobado`} color="warning.main" />
        <KpiCard label="Cobrado" value={fmtM(cobrado)} sub={`${total ? ((cobrado / total) * 100).toFixed(0) : 0}% del contrato`} color="success.main" />
        <KpiCard label="Gastado real" value={fmtM(gastado)} sub="caja + mano de obra" />
        <KpiCard label="Margen" value={`${margen >= 0 ? '+' : ''}${fmtM(margen)}`} sub="certificado − gastado" color={margen >= 0 ? 'success.main' : 'error.main'} />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap>
        <Paper variant="outlined" sx={{ p: 2, flex: 1.2, minWidth: 300 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <DashboardIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" fontWeight={600}>Qué necesita atención</Typography>
          </Stack>
          {alertas.length === 0 ? (
            <Stack direction="row" alignItems="center" spacing={1} py={2}>
              <CheckCircleIcon color="success" /><Typography variant="body2" color="text.secondary">Todo en orden — sin pendientes.</Typography>
            </Stack>
          ) : (
            <Stack divider={<Divider flexItem />}>
              {alertas.map((a, i) => (
                <Stack key={i} direction="row" alignItems="center" spacing={1.5} py={1}>
                  {a.icon}
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={500}>{a.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{a.sub}</Typography>
                  </Box>
                  {a.value && <Typography variant="body2" fontWeight={700} color={a.color}>{a.value}</Typography>}
                </Stack>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 260 }}>
          <Typography variant="subtitle2" fontWeight={600} mb={1}>Circuito de plata ($M)</Typography>
          <BarChart
            series={[{ data: [certAprob / 1e6, cobrado / 1e6, gastado / 1e6].map((v) => Math.round(v * 10) / 10), label: '$M', color: '#90caf9' }]}
            xAxis={[{ data: ['Certificado', 'Cobrado', 'Gastado'], scaleType: 'band' }]}
            height={200}
            margin={{ top: 10, bottom: 30, left: 48, right: 10 }}
          />
        </Paper>
      </Stack>

      {curva.meses.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} mb={0.5}>Curva S — plan vs certificado vs cobrado ($M)</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Acumulado mensual. {curva.plan?.length ? 'Gris = plan (cronograma) · ' : ''}Naranja = certificado · Verde = cobrado.
          </Typography>
          <LineChart
            series={[
              ...(curva.plan?.length ? [{ data: curva.plan, label: 'Plan', color: '#9e9e9e' }] : []),
              { data: curva.certificado, label: 'Certificado', color: '#f57c00' },
              { data: curva.cobrado, label: 'Cobrado', color: '#388e3c' },
            ]}
            xAxis={[{ data: curva.meses, scaleType: 'band' }]}
            height={240}
            margin={{ top: 10, bottom: 30, left: 52, right: 10 }}
          />
        </Paper>
      )}
    </Box>
  );
}
