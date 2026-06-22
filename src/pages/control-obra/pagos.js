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
import SinPermisoControlObra, { puedeVerControlObra } from 'src/components/controlObra/AccesoControlObra';
import { KpiCard, fmt } from 'src/components/controlObra/ui';

const COLOR = { borrador: 'default', aprobada: 'info' };

// "Jueves de pagos": cola de órdenes de pago a contratistas de TODAS las obras.
function PagosObraPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const qc = useQueryClient();
  const [empresaId, setEmpresaId] = useState(null);

  useEffect(() => {
    if (!user) return;
    getEmpresaDetailsFromUser(user).then((e) => setEmpresaId(e?.id || null)).catch(() => {});
  }, [user]);

  const q = useQuery({
    queryKey: ['control-obra', 'pagos-cartera', empresaId],
    queryFn: () => ControlObraService.pagosCartera(empresaId),
    enabled: !!empresaId,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['control-obra'] });
  const accion = useMutation({ mutationFn: ({ fn }) => fn(), onSuccess: refresh });

  const items = q.data || [];
  const aDesembolsar = items.filter((i) => i.estado === 'aprobada').reduce((a, i) => a + (i.monto_neto || 0), 0);
  const enBorrador = items.filter((i) => i.estado === 'borrador').reduce((a, i) => a + (i.monto_neto || 0), 0);

  if (user && !puedeVerControlObra(user)) return <SinPermisoControlObra />;

  return (
    <DashboardLayout title="Control de Obra — Pagos a obra">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h4" mb={1}>Control de Obra</Typography>
        <CarteraNav />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} useFlexGap flexWrap="wrap">
          <KpiCard label="A desembolsar" value={fmt(aDesembolsar)} color="warning.main" sub="órdenes aprobadas" />
          <KpiCard label="En borrador" value={fmt(enBorrador)} sub="por aprobar" />
          <KpiCard label="Órdenes" value={items.length} sub="pendientes en total" />
        </Stack>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>Órdenes a pagar</Typography>
            {q.isLoading && <LinearProgress sx={{ mb: 1 }} />}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Obra</TableCell>
                  <TableCell>#</TableCell>
                  <TableCell>Contratista</TableCell>
                  <TableCell align="right">Neto</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.orden_id} hover>
                    <TableCell>{i.obra_titulo || '(sin título)'}</TableCell>
                    <TableCell>{i.numero}</TableCell>
                    <TableCell>{i.contratista_nombre}</TableCell>
                    <TableCell align="right">{fmt(i.monto_neto)}</TableCell>
                    <TableCell><Chip size="small" label={i.estado} color={COLOR[i.estado] || 'default'} /></TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {i.estado === 'borrador' && (
                          <Button size="small" onClick={() => accion.mutate({ fn: () => ControlObraService.aprobarOrden(i.orden_id, empresaId) })}>Aprobar</Button>
                        )}
                        {i.estado === 'aprobada' && (
                          <Button size="small" variant="contained" onClick={() => accion.mutate({ fn: () => ControlObraService.pagarOrden(i.orden_id, empresaId) })}>Pagar</Button>
                        )}
                        <Button size="small" onClick={() => router.push(`/control-obra/${i.obra_id}`)}>Ver obra</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!q.isLoading && items.length === 0 && (
                  <TableRow><TableCell colSpan={6}><Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No hay órdenes de pago pendientes.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Container>
    </DashboardLayout>
  );
}

export default PagosObraPage;
