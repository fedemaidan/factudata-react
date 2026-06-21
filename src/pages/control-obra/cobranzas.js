import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button, Card, CardContent, Chip, Container, LinearProgress, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import ControlObraService from 'src/services/controlObra/controlObraService';
import CarteraNav from 'src/components/controlObra/CarteraNav';
import { KpiCard, fmt } from 'src/components/controlObra/ui';

const fecha = (d) => (d ? new Date(d).toLocaleDateString('es-AR') : '—');
const vencida = (d) => d && new Date(d) < new Date();

function CobranzasPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const qc = useQueryClient();
  const [empresaId, setEmpresaId] = useState(null);

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
  const accion = useMutation({ mutationFn: ({ fn }) => fn(), onSuccess: refresh });

  const items = q.data || [];
  const totalPendiente = items.reduce((a, i) => a + (i.pendiente || 0), 0);
  const vencidas = items.filter((i) => vencida(i.fecha_vencimiento));
  const totalVencido = vencidas.reduce((a, i) => a + (i.pendiente || 0), 0);

  return (
    <DashboardLayout title="Control de Obra — Cobranzas">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h4" mb={1}>Control de Obra</Typography>
        <CarteraNav />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} useFlexGap flexWrap="wrap">
          <KpiCard label="Pendiente de cobro" value={fmt(totalPendiente)} color="warning.main" sub="todas las obras" />
          <KpiCard label="Vencido" value={fmt(totalVencido)} color="error.main" sub={`${vencidas.length} cuota(s)`} />
          <KpiCard label="Cuotas" value={items.length} sub="por cobrar en total" />
        </Stack>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>Cuotas a cobrar</Typography>
            {q.isLoading && <LinearProgress sx={{ mb: 1 }} />}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Obra</TableCell>
                  <TableCell>Concepto</TableCell>
                  <TableCell>Vencimiento</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Pendiente</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.cuota_id} hover>
                    <TableCell>{i.obra_titulo || '(sin título)'}</TableCell>
                    <TableCell>{i.descripcion || '—'}</TableCell>
                    <TableCell sx={{ color: vencida(i.fecha_vencimiento) ? 'error.main' : undefined }}>{fecha(i.fecha_vencimiento)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={vencida(i.fecha_vencimiento) ? 'vencida' : i.estado} color={vencida(i.fecha_vencimiento) ? 'error' : (i.estado === 'cobrada_parcial' ? 'info' : 'warning')} />
                    </TableCell>
                    <TableCell align="right">{fmt(i.pendiente)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" variant="contained" onClick={() => accion.mutate({ fn: () => ControlObraService.cobrarCuota(i.obra_id, i.cuota_id, empresaId) })}>Cobrar</Button>
                        <Button size="small" onClick={() => router.push(`/control-obra/${i.obra_id}`)}>Ver obra</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!q.isLoading && items.length === 0 && (
                  <TableRow><TableCell colSpan={6}><Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No hay cuotas pendientes.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Container>
    </DashboardLayout>
  );
}

export default CobranzasPage;
