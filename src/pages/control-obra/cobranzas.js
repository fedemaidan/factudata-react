import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Card, CardContent, Chip, Container, LinearProgress, Snackbar, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel, TextField, MenuItem, Typography,
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import ControlObraService from 'src/services/controlObra/controlObraService';
import planCobroService from 'src/services/planCobroService';
import CobroCuotaDialog from 'src/components/planCobro/CobroCuotaDialog';
import { mensajeCobroRegistrado } from 'src/utils/planCobro/cobroCuota';
import CarteraNav from 'src/components/controlObra/CarteraNav';
import SinPermisoControlObra, { puedeVerControlObra } from 'src/components/controlObra/AccesoControlObra';
import { KpiCard, fmt } from 'src/components/controlObra/ui';
import { aplicarFiltroOrden, obrasDeItems } from 'src/components/controlObra/carteraFiltros';

const fecha = (d) => (d ? new Date(d).toLocaleDateString('es-AR') : '—');
const vencida = (d) => d && new Date(d) < new Date();

const COLS = [
  { key: 'obra_titulo', label: 'Obra' },
  { key: 'descripcion', label: 'Concepto' },
  { key: 'fecha_vencimiento', label: 'Vencimiento' },
  { key: 'estado', label: 'Estado' },
  { key: 'pendiente', label: 'Pendiente', align: 'right' },
];

function CobranzasPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const qc = useQueryClient();
  const [empresaId, setEmpresaId] = useState(null);
  const [filtroObra, setFiltroObra] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [orderBy, setOrderBy] = useState('fecha_vencimiento');
  const [order, setOrder] = useState('asc');
  // Cobro de cuota de plan: { item, plan, cuota } con el plan ya cargado.
  const [cobroSel, setCobroSel] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (!user) return;
    getEmpresaDetailsFromUser(user).then((e) => setEmpresaId(e?.id || null)).catch(() => {});
  }, [user]);

  const q = useQuery({
    queryKey: ['control-obra', 'cobranzas', empresaId],
    queryFn: () => ControlObraService.cobranzas(empresaId),
    enabled: !!empresaId,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['control-obra'] });
  const accion = useMutation({
    mutationFn: ({ fn }) => fn(),
    onSuccess: (_data, vars) => {
      refresh();
      if (vars?.mensajeExito) setSnack({ open: true, message: vars.mensajeExito, severity: 'success' });
    },
    onError: (err) => setSnack({
      open: true,
      message: err?.response?.data?.error || err?.message || 'No se pudo registrar el cobro',
      severity: 'error',
    }),
  });

  // El cobro de cuotas abre el mismo diálogo que el detalle del plan, así que
  // necesita el plan (moneda e indexación definen el monto calculado del día).
  const abrirCobroCuota = async (item) => {
    try {
      const res = await planCobroService.getPlan(item.plan_id, empresaId);
      const plan = res?.data?.data;
      const cuota = (plan?.cuotas || []).find((c) => String(c._id) === String(item.cuota_id));
      setCobroSel({ item, plan, cuota: cuota || { _id: item.cuota_id, monto: item.monto, monto_cobrado: item.monto_cobrado, estado: item.estado, fecha_vencimiento: item.fecha_vencimiento } });
    } catch (err) {
      setSnack({ open: true, message: 'No se pudo cargar el plan de la cuota', severity: 'error' });
    }
  };

  const confirmarCobroCuota = async (payload) => {
    const { item } = cobroSel;
    setCobroSel(null);
    accion.mutate({
      fn: () => ControlObraService.cobrarCuota(item.obra_id, item.cuota_id, empresaId, payload),
      mensajeExito: mensajeCobroRegistrado(payload),
    });
  };

  const rows = q.data || [];
  const obras = useMemo(() => obrasDeItems(rows), [rows]);
  const items = useMemo(
    () => aplicarFiltroOrden(rows, { filtroObra, desde, hasta, campoFecha: 'fecha_vencimiento', orderBy, order }),
    [rows, filtroObra, desde, hasta, orderBy, order],
  );

  const totalPendiente = items.reduce((a, i) => a + (i.pendiente || 0), 0);
  const vencidas = items.filter((i) => vencida(i.fecha_vencimiento));
  const totalVencido = vencidas.reduce((a, i) => a + (i.pendiente || 0), 0);

  const sortHandler = (key) => {
    if (orderBy === key) setOrder(order === 'asc' ? 'desc' : 'asc');
    else { setOrderBy(key); setOrder('asc'); }
  };

  if (user && !puedeVerControlObra(user)) return <SinPermisoControlObra />;

  return (
    <DashboardLayout title="Control de Obra — Cobranzas">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h4" mb={1}>Control de Obra</Typography>
        <CarteraNav />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} useFlexGap flexWrap="wrap">
          <KpiCard label="Pendiente de cobro" value={fmt(totalPendiente)} color="warning.main" sub="filtrado" />
          <KpiCard label="Vencido" value={fmt(totalVencido)} color="error.main" sub={`${vencidas.length} ítem(s)`} />
          <KpiCard label="Ítems" value={items.length} sub="por cobrar (filtrado)" />
        </Stack>

        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} flexWrap="wrap" useFlexGap>
              <TextField select size="small" label="Obra" value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)} sx={{ minWidth: 200 }}>
                <MenuItem value="">Todas</MenuItem>
                {obras.map((o) => <MenuItem key={o.id} value={o.id}>{o.titulo}</MenuItem>)}
              </TextField>
              <TextField size="small" type="date" label="Vence desde" InputLabelProps={{ shrink: true }} value={desde} onChange={(e) => setDesde(e.target.value)} />
              <TextField size="small" type="date" label="Vence hasta" InputLabelProps={{ shrink: true }} value={hasta} onChange={(e) => setHasta(e.target.value)} />
              {(filtroObra || desde || hasta) && (
                <Button size="small" onClick={() => { setFiltroObra(''); setDesde(''); setHasta(''); }}>Limpiar</Button>
              )}
            </Stack>

            {q.isLoading && <LinearProgress sx={{ mb: 1 }} />}
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {COLS.map((c) => (
                      <TableCell key={c.key} align={c.align || 'left'} sortDirection={orderBy === c.key ? order : false}>
                        <TableSortLabel active={orderBy === c.key} direction={orderBy === c.key ? order : 'asc'} onClick={() => sortHandler(c.key)}>
                          {c.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((i) => (
                    <TableRow key={i.cuota_id || i.certificado_id} hover>
                      <TableCell>{i.obra_titulo || '(sin título)'}</TableCell>
                      <TableCell>{i.descripcion || '—'}{i.tipo === 'certificado' ? ' · certificado' : ''}</TableCell>
                      <TableCell sx={{ color: vencida(i.fecha_vencimiento) ? 'error.main' : undefined }}>{fecha(i.fecha_vencimiento)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={vencida(i.fecha_vencimiento) ? 'vencida' : i.estado} color={vencida(i.fecha_vencimiento) ? 'error' : (i.estado === 'cobrada_parcial' ? 'info' : 'warning')} />
                      </TableCell>
                      <TableCell align="right">{fmt(i.pendiente)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => (i.tipo === 'certificado'
                              ? accion.mutate({
                                fn: () => ControlObraService.cobrarCertificado(i.certificado_id, empresaId),
                                mensajeExito: 'Certificado cobrado.',
                              })
                              : abrirCobroCuota(i))}
                          >
                            Cobrar
                          </Button>
                          <Button size="small" onClick={() => router.push(`/control-obra/${i.obra_id}`)}>Ver obra</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!q.isLoading && items.length === 0 && (
                    <TableRow><TableCell colSpan={6}><Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No hay cobros pendientes.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>

        <CobroCuotaDialog
          open={!!cobroSel}
          cuota={cobroSel?.cuota}
          plan={cobroSel?.plan}
          empresaId={empresaId}
          onClose={() => setCobroSel(null)}
          onConfirm={confirmarCobroCuota}
        />

        <Snackbar
          open={snack.open}
          autoHideDuration={4000}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} variant="filled">
            {snack.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
}

export default CobranzasPage;
