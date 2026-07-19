import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Card, CardContent, Chip, LinearProgress, Paper,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FormDrawer from 'src/components/controlObra/FormDrawer';
import ControlObraService from 'src/services/controlObra/controlObraService';

const fmt = (n) => (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const money = (n, moneda) => (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: moneda === 'USD' ? 'USD' : 'ARS', maximumFractionDigits: 0 });
const COLOR = { borrador: 'default', aprobada: 'info', pagada: 'success', anulada: 'error' };
const MODALIDAD_LBL = { avance_fisico: 'avance físico', certificado: 'certificado' };

export default function ManoObraTab({ obra, empresaId }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);

  const ordenesQ = useQuery({
    queryKey: ['control-obra', 'ordenes', obra._id, empresaId],
    queryFn: () => ControlObraService.listarOrdenes(obra._id, empresaId),
    enabled: !!empresaId,
  });
  const sugeridasQ = useQuery({
    queryKey: ['control-obra', 'ordenes-sugeridas', obra._id, empresaId],
    queryFn: () => ControlObraService.ordenesSugeridas(obra._id, empresaId),
    enabled: !!empresaId,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['control-obra'] });
  const accion = useMutation({ mutationFn: ({ fn }) => fn(), onSuccess: refresh });
  const generar = useMutation({
    mutationFn: (key) => ControlObraService.generarOrdenSugerida(obra._id, empresaId, key),
    onSuccess: refresh,
  });

  const sugeridas = sugeridasQ.data || [];

  return (
    <Stack spacing={2}>
    {sugeridas.length > 0 && (
      <Card variant="outlined" sx={{ borderColor: 'primary.light', bgcolor: 'action.hover' }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600}>Sugeridas por avance</Typography>
          <Typography variant="caption" color="text.secondary">Devengado de los contratos asignados a tareas, menos lo ya ordenado. Generá la orden de un click.</Typography>
          <Stack spacing={1.5} mt={1.5}>
            {sugeridas.map((g) => (
              <Box key={g.key} sx={{ p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{g.proveedor_nombre}</Typography>
                    <Typography variant="caption" color="text.secondary">{g.lineas.length} tarea(s) · pendiente {fmt(g.total_pendiente)}</Typography>
                  </Box>
                  <Button size="small" variant="contained" disabled={generar.isPending} onClick={() => generar.mutate(g.key)}>Generar orden</Button>
                </Stack>
                <Stack spacing={0.25} mt={1}>
                  {g.lineas.map((l) => (
                    <Stack key={l.subrubro_uid} direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">{l.nombre} · {l.base_pct}% {MODALIDAD_LBL[l.modalidad]}</Typography>
                      <Typography variant="caption">{fmt(l.pendiente)}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    )}
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle1" fontWeight={600}>Mano de obra · órdenes de pago</Typography>
          <Button size="small" variant="outlined" onClick={() => setDialog(true)}>Nueva orden</Button>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Contratista</TableCell>
              <TableCell align="right">Neto</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(ordenesQ.data || []).map((o) => (
              <TableRow key={o._id}>
                <TableCell>{o.numero}</TableCell>
                <TableCell>{o.contratista_nombre}</TableCell>
                <TableCell align="right">{fmt(o.monto_neto)}</TableCell>
                <TableCell><Chip size="small" label={o.estado} color={COLOR[o.estado] || 'default'} /></TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {o.estado === 'borrador' && <Button size="small" onClick={() => accion.mutate({ fn: () => ControlObraService.aprobarOrden(o._id, empresaId) })}>Aprobar</Button>}
                    {o.estado === 'aprobada' && <Button size="small" variant="contained" onClick={() => accion.mutate({ fn: () => ControlObraService.pagarOrden(o._id, empresaId) })}>Pagar</Button>}
                    {o.estado === 'pagada' && <Button size="small" color="error" onClick={() => accion.mutate({ fn: () => ControlObraService.anularOrden(o._id, empresaId) })}>Anular</Button>}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {(ordenesQ.data || []).length === 0 && (
              <TableRow><TableCell colSpan={5}><Typography variant="body2" color="text.secondary">Sin órdenes de pago.</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <NuevaOrdenDialog open={dialog} onClose={() => setDialog(false)} obra={obra} empresaId={empresaId} onDone={() => { setDialog(false); refresh(); }} />
    </Card>

    <PlanesPagoSection obra={obra} empresaId={empresaId} />
    </Stack>
  );
}

// Sección "Planes de pago a proveedores" (T3): espejo outbound de CobrosObraTab.
// Lista 0..N planes de la obra con resumen/cuotas; permite crear uno nuevo y
// generar cuotas por avance devengado del proveedor.
function PlanesPagoSection({ obra, empresaId }) {
  const qc = useQueryClient();
  const router = useRouter();

  const planesQ = useQuery({
    queryKey: ['control-obra', 'planes-pago', obra._id, empresaId],
    queryFn: () => ControlObraService.listarPlanesPago(obra._id, empresaId),
    enabled: !!empresaId,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['control-obra', 'planes-pago', obra._id, empresaId] });

  // Abre el asistente de plan de pago con la obra precargada (espejo de "Nuevo plan" de cobros).
  const nuevoPlan = () => router.push({
    pathname: '/pagos-proveedores/nuevo',
    query: { obra: obra._id, ...(obra.proyecto_id ? { proyecto: obra.proyecto_id } : {}) },
  });

  const generarAvance = useMutation({
    mutationFn: (planId) => ControlObraService.generarCuotasPorAvance(planId, empresaId),
    onSuccess: refresh,
  });

  const planes = planesQ.data || [];

  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} mb={1}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>Planes de pago a proveedores</Typography>
            <Typography variant="caption" color="text.secondary">
              0..N planes por obra. Cada plan agrupa las cuotas a desembolsar a un proveedor (por avance devengado, fijas o por hito).
            </Typography>
          </Box>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={nuevoPlan}>Nuevo plan de pago</Button>
        </Stack>

        {planesQ.isLoading && <LinearProgress sx={{ mb: 2 }} />}

        {!planesQ.isLoading && planes.length === 0 && (
          <Typography variant="body2" color="text.secondary">La obra no tiene planes de pago.</Typography>
        )}

        {generarAvance.isError && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {generarAvance.error?.response?.data?.error?.message || 'No se pudieron generar cuotas por avance.'}
          </Alert>
        )}

        <Stack spacing={1.5}>
          {planes.map((plan) => {
            const r = plan.resumen || {};
            const pct = r.total ? Math.round((r.pagado || 0) / r.total * 100) : 0;
            return (
              <Paper
                key={plan._id}
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                onClick={() => router.push(`/pagos-proveedores/${plan._id}`)}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: 'center' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="subtitle2" fontWeight={700}>{plan.nombre}</Typography>
                      <Chip size="small" label={plan.estado} color={plan.estado === 'completado' ? 'success' : plan.estado === 'activo' ? 'primary' : 'default'} />
                      {plan.indexacion && <Chip size="small" variant="outlined" label={plan.indexacion} />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {r.cuotas_total || 0} cuota(s) · Proveedor: {plan.proveedor_nombre || 's/d'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={generarAvance.isPending}
                      onClick={(e) => { e.stopPropagation(); generarAvance.mutate(plan._id); }}
                    >
                      Generar por avance
                    </Button>
                    <Button size="small" onClick={(e) => { e.stopPropagation(); router.push(`/pagos-proveedores/${plan._id}`); }}>
                      Ver detalle
                    </Button>
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={3} mt={1.5} flexWrap="wrap">
                  <Metric label="Total" value={money(r.total, plan.moneda)} />
                  <Metric label="Pagado" value={money(r.pagado, plan.moneda)} color="success.main" />
                  <Metric label="Pendiente" value={money(r.pendiente, plan.moneda)} color="error.main" />
                  {r.vencido > 0 && <Metric label="Vencido" value={money(r.vencido, plan.moneda)} color="warning.main" />}
                </Stack>

                <Box mt={1}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">Avance de pago</Typography>
                    <Typography variant="caption" fontWeight={600}>{pct}%</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={pct} color={plan.estado === 'completado' ? 'success' : 'primary'} sx={{ height: 6, borderRadius: 3 }} />
                </Box>

                {(plan.cuotas || []).length > 0 && (
                  <Table size="small" sx={{ mt: 1.5 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Descripción</TableCell>
                        <TableCell>Vencimiento</TableCell>
                        <TableCell align="right">Monto</TableCell>
                        <TableCell>Estado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {plan.cuotas.map((c) => (
                        <TableRow key={c._id}>
                          <TableCell>{c.descripcion || c.tipo}</TableCell>
                          <TableCell>{c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString('es-AR') : '—'}</TableCell>
                          <TableCell align="right">{money(c.monto, plan.moneda)}</TableCell>
                          <TableCell><Chip size="small" label={c.estado_ui || c.estado} color={COLOR[c.estado] || 'default'} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Paper>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
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

function NuevaOrdenDialog({ open, onClose, obra, empresaId, onDone }) {
  const subrubros = useMemo(() => (obra.rubros || []).flatMap((r) => (r.subrubros || []).map((s) => ({ ...s, rubro: r.nombre }))), [obra]);
  const [nombre, setNombre] = useState('');
  const [montos, setMontos] = useState({});
  const [error, setError] = useState(null);

  const crear = useMutation({
    mutationFn: () => {
      const lineas = Object.entries(montos).filter(([, v]) => Number(v) > 0).map(([subrubro_uid, v]) => ({ subrubro_uid, monto: Number(v) }));
      if (!nombre) throw new Error('Indicá el contratista');
      if (lineas.length === 0) throw new Error('Cargá al menos un monto');
      return ControlObraService.crearOrden(obra._id, { empresa_id: empresaId, contratista_nombre: nombre, lineas });
    },
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });

  return (
    <FormDrawer
      open={open} onClose={onClose} title="Nueva orden de pago" width={480}
      actions={(
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" disabled={crear.isPending} onClick={() => { setError(null); crear.mutate(); }}>Crear</Button>
        </>
      )}
    >
      <TextField label="Contratista" fullWidth size="small" value={nombre} onChange={(e) => setNombre(e.target.value)} sx={{ mb: 2 }} />
      <Typography variant="caption" color="text.secondary">Monto por sub-rubro</Typography>
      <Stack spacing={1.5} mt={1}>
        {subrubros.map((s) => (
          <Stack key={s.uid} direction="row" spacing={2} alignItems="center">
            <Box flex={1}><Typography variant="body2">{s.nombre}</Typography><Typography variant="caption" color="text.secondary">{s.rubro}</Typography></Box>
            <TextField size="small" type="number" label="$" value={montos[s.uid] ?? ''} onChange={(e) => setMontos((m) => ({ ...m, [s.uid]: e.target.value }))} sx={{ width: 120 }} />
          </Stack>
        ))}
      </Stack>
      {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
    </FormDrawer>
  );
}
