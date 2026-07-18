import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Chip, Divider, IconButton, InputAdornment, Paper, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import PaymentsIcon from '@mui/icons-material/Payments';
import SaveIcon from '@mui/icons-material/Save';
import ControlObraService from 'src/services/controlObra/controlObraService';
import { KpiCard, fmt, fmtM } from 'src/components/controlObra/ui';

// Fila de una columna del tablero (label izquierda, monto derecha).
function LadoRow({ label, value, color = 'text.primary', strong = false, sub = null }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" py={0.5}>
      <Box>
        <Typography variant="body2" fontWeight={strong ? 700 : 500}>{label}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
      <Typography variant="body2" fontWeight={strong ? 800 : 600} color={color}>{value}</Typography>
    </Stack>
  );
}

// Chip de cobertura de la composición del cobro (señal blanda).
function CoberturaChip({ cobertura }) {
  if (!cobertura) return <Chip size="small" variant="outlined" label="Sin declarar" />;
  const map = {
    falta_asignar: { label: 'Falta asignar', color: 'warning' },
    cubierto: { label: 'Cubierto', color: 'success' },
    sobre_asignado: { label: 'Sobre-asignado', color: 'error' },
  };
  const c = map[cobertura] || { label: cobertura, color: 'default' };
  return <Chip size="small" color={c.color} label={c.label} />;
}

// Tablero de la obra (cockpit): dos lados espejados (cobrar / gastar) + composición
// del cobro + qué necesita atención + curva financiera.
export default function ResumenTab({ obra, ejec, certs = [], empresaId }) {
  const queryClient = useQueryClient();
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

  // Pendiente de cobro — aditivo, desglosado por fuente (el label ya no miente).
  const pendiente = row.pendiente || 0;
  const pendienteCert = row.pendiente_certificados || 0;
  const pendientePlanes = row.pendiente_planes || 0;

  // Lado gastar (T2 en getEjecucion).
  const gastado = ejec?.totales?.gastado || 0;
  const costoRef = ejec?.totales?.costo_ref || 0; // contratado o estimado, por precedencia
  const margen = ejec?.totales?.margen || 0; // realizado (certificado − gastado)
  const margenEsperado = ejec?.totales?.margen_esperado || 0; // proyectado (contrato − costo_ref)

  // Composición del cobro: cuánto se espera por certificación + Σ planes.
  const esperadoCert = row.esperado_certificados; // null si sin declarar
  const esperadoPlanes = row.esperado_planes || 0;
  const cobertura = row.cobertura || null;

  // Editor de cobro_esperado_certificados (composición del cobro).
  const [certInput, setCertInput] = useState('');
  useEffect(() => {
    setCertInput(obra.cobro_esperado_certificados != null ? String(obra.cobro_esperado_certificados) : '');
  }, [obra._id, obra.cobro_esperado_certificados]);

  const guardarComposicion = useMutation({
    mutationFn: () => {
      const raw = certInput.trim();
      const val = raw === '' ? null : Number(raw);
      return ControlObraService.actualizarObra(obra._id, empresaId, { cobro_esperado_certificados: val });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-obra', 'obra', obra._id, empresaId] });
      queryClient.invalidateQueries({ queryKey: ['control-obra', 'obra', obra._id] });
      queryClient.invalidateQueries({ queryKey: ['control-obra', 'cartera', empresaId] });
    },
  });
  const inputVal = certInput.trim() === '' ? null : Number(certInput.trim());
  const inputInvalido = inputVal != null && (!Number.isFinite(inputVal) || inputVal < 0);
  const dirty = String(obra.cobro_esperado_certificados ?? '') !== certInput.trim();

  // Alertas (síntesis cross-pestaña — el diferenciador del tablero).
  const subs = (ejec?.rubros || []).flatMap((r) => r.subrubros || []);
  const certsPend = (certs || []).filter((c) => c.estado === 'enviado');
  const montoCertPend = certsPend.reduce((s, c) => s + (c.monto_total || 0), 0);
  const incAbiertos = (incQ.data || []).filter((i) => i.estado === 'abierto').length;
  // Margen realizado negativo: gastás más de lo certificado en ese sub-rubro.
  const subsNeg = subs.filter((s) => (s.gastado || 0) > 0 && s.margen < 0);
  // Margen ESPERADO negativo (T2): el contrato no cubre el costo de referencia.
  const subsMargEspNeg = subs.filter((s) => s.margen_esperado != null && s.margen_esperado < 0);
  // Sobrecosto: gastado > costo de referencia (T2).
  const subsSobrecosto = subs.filter((s) => s.sobrecosto);
  // Avance físico alto con poco gastado → posibles gastos sin imputar.
  const avanceAltoSinGasto = avance >= 40 && total > 0 && gastado < total * 0.1;

  const alertas = [];
  if (certsPend.length) alertas.push({ icon: <AccessTimeIcon color="warning" />, label: `${certsPend.length} certificado${certsPend.length > 1 ? 's' : ''} enviado${certsPend.length > 1 ? 's' : ''} sin aprobar`, sub: 'destraba la cobranza', value: fmt(montoCertPend), color: 'warning.main' });
  if (pendiente > 0) alertas.push({ icon: <HourglassEmptyIcon color="warning" />, label: 'Pendiente de cobro', sub: `por certificados ${fmt(pendienteCert)} + por planes ${fmt(pendientePlanes)}`, value: fmt(pendiente), color: 'warning.main' });
  if (avanceAltoSinGasto) alertas.push({ icon: <ReportProblemIcon color="warning" />, label: `Avance ${avance.toFixed(0)}% con poco gastado`, sub: 'posibles gastos sin imputar', value: fmt(gastado), color: 'warning.main' });
  if (subsSobrecosto.length) alertas.push({ icon: <TrendingDownIcon color="error" />, label: `${subsSobrecosto.length} sub-rubro${subsSobrecosto.length > 1 ? 's' : ''} con sobrecosto`, sub: 'gastado supera el costo de referencia', value: null, color: 'error.main' });
  if (subsMargEspNeg.length) alertas.push({ icon: <TrendingDownIcon color="error" />, label: `${subsMargEspNeg.length} sub-rubro${subsMargEspNeg.length > 1 ? 's' : ''} con margen esperado negativo`, sub: 'el contrato no cubre el costo', value: null, color: 'error.main' });
  if (subsNeg.length) alertas.push({ icon: <TrendingDownIcon color="error" />, label: `${subsNeg.length} sub-rubro${subsNeg.length > 1 ? 's' : ''} con margen negativo`, sub: 'gastás más de lo certificado', value: null, color: 'error.main' });
  if (incAbiertos > 0) alertas.push({ icon: <ReportProblemIcon color="error" />, label: `${incAbiertos} inconveniente${incAbiertos > 1 ? 's' : ''} abierto${incAbiertos > 1 ? 's' : ''}`, sub: 'resolver antes del cierre', value: null, color: 'error.main' });

  return (
    <Box>
      <Stack direction="row" spacing={2} flexWrap="wrap" mb={3} useFlexGap>
        <KpiCard label="Contrato" value={fmtM(total)} sub="presupuesto total" />
        <KpiCard label="Avance físico" value={`${avance.toFixed(1)}%`} sub="ponderado por monto" />
        <KpiCard label="Certificado" value={fmtM(certAprob)} sub={`${total ? ((certAprob / total) * 100).toFixed(0) : 0}% · aprobado`} color="warning.main" />
        <KpiCard label="Cobrado" value={fmtM(cobrado)} sub={`${total ? ((cobrado / total) * 100).toFixed(0) : 0}% del contrato`} color="success.main" />
        <KpiCard label="Gastado real" value={fmtM(gastado)} sub="caja + mano de obra" />
        <KpiCard label="Margen" value={`${margen >= 0 ? '+' : ''}${fmtM(margen)}`} sub={`realizado · esperado ${margenEsperado >= 0 ? '+' : ''}${fmtM(margenEsperado)}`} color={margen >= 0 ? 'success.main' : 'error.main'} tooltip="Realizado = certificado − gastado · Esperado = contrato − costo de referencia" />
      </Stack>

      {/* Tablero de DOS LADOS espejados: cobrar (cliente) vs gastar (proveedor). */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap mb={2}>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 280 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <PriceCheckIcon fontSize="small" color="success" />
            <Typography variant="subtitle2" fontWeight={700}>Cobrar (cliente)</Typography>
          </Stack>
          <LadoRow label="Contrato cliente" value={fmt(total)} sub="lo que se espera cobrar" />
          <LadoRow label="Certificado" value={fmt(certAprob)} color="warning.main" />
          <LadoRow label="Cobrado" value={fmt(cobrado)} color="success.main" />
          <Divider sx={{ my: 0.5 }} />
          <LadoRow label="Pendiente de cobro" value={fmt(pendiente)} color="warning.main" strong />
          {pendiente > 0 && (
            <Typography variant="caption" color="text.secondary" display="block" pl={0.5}>
              por certificados {fmt(pendienteCert)} + por planes {fmt(pendientePlanes)} = {fmt(pendiente)}
            </Typography>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 280 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <PaymentsIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" fontWeight={700}>Gastar (proveedor)</Typography>
          </Stack>
          <LadoRow label="Costo de referencia" value={costoRef ? fmt(costoRef) : '—'} sub="contratado o estimado" />
          <LadoRow label="Gastado real" value={fmt(gastado)} />
          <Divider sx={{ my: 0.5 }} />
          <LadoRow label="Margen esperado" value={`${margenEsperado >= 0 ? '+' : ''}${fmt(margenEsperado)}`} color={margenEsperado >= 0 ? 'success.main' : 'error.main'} strong sub="contrato − costo de referencia" />
          <LadoRow label="Margen realizado" value={`${margen >= 0 ? '+' : ''}${fmt(margen)}`} color={margen >= 0 ? 'success.main' : 'error.main'} sub="certificado − gastado" />
        </Paper>
      </Stack>

      {/* Composición del cobro: cómo se reparte el total entre certificación y planes. */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={1}>
          <Typography variant="subtitle2" fontWeight={700}>Composición del cobro</Typography>
          <CoberturaChip cobertura={cobertura} />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} useFlexGap flexWrap="wrap">
          <TextField
            size="small"
            label="Se cobra por certificación"
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            error={inputInvalido}
            helperText={inputInvalido ? 'Número ≥ 0 o vacío' : 'ej. inversores'}
            type="number"
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Guardar">
                    <span>
                      <IconButton size="small" color="primary" disabled={!dirty || inputInvalido || guardarComposicion.isLoading} onClick={() => guardarComposicion.mutate()}>
                        <SaveIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 260 }}
          />
          <Typography variant="body2" color="text.secondary">+</Typography>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Por planes (Σ planes)</Typography>
            <Typography variant="body1" fontWeight={700}>{fmt(esperadoPlanes)}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">=</Typography>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Total esperado</Typography>
            <Typography variant="body1" fontWeight={700}>{fmt((esperadoCert != null ? esperadoCert : 0) + esperadoPlanes)}</Typography>
            <Typography variant="caption" color="text.secondary">vs contrato {fmt(total)}</Typography>
          </Box>
        </Stack>
        {esperadoCert == null && (
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Declará cuánto se espera cobrar por certificación para validar la cobertura vs el contrato.
          </Typography>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
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

      {curva.meses.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} mb={0.5}>Curva financiera — plan vs certificado vs cobrado vs egresos ($M)</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Acumulado mensual. {curva.plan?.length ? 'Gris = plan (cronograma) · ' : ''}Naranja = certificado · Verde = cobrado{curva.ingresos_proyectados?.length ? ' · Verde claro = ingresos proyectados' : ''}{curva.egresos?.length ? ' · Rojo = egresos reales' : ''}.
          </Typography>
          <LineChart
            series={[
              ...(curva.plan?.length ? [{ data: curva.plan, label: 'Plan', color: '#9e9e9e' }] : []),
              { data: curva.certificado, label: 'Certificado', color: '#f57c00' },
              { data: curva.cobrado, label: 'Cobrado', color: '#388e3c' },
              ...(curva.ingresos_proyectados?.length ? [{ data: curva.ingresos_proyectados, label: 'Ingresos proyectados', color: '#81c784' }] : []),
              ...(curva.egresos?.length ? [{ data: curva.egresos, label: 'Egresos reales', color: '#d32f2f' }] : []),
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
