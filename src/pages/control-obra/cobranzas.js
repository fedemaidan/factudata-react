import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import {
  Button, Card, CardContent, Chip, Container, LinearProgress, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import ControlObraService from 'src/services/controlObra/controlObraService';
import CarteraNav from 'src/components/controlObra/CarteraNav';

const fmt = (n) => (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const fecha = (d) => (d ? new Date(d).toLocaleDateString('es-AR') : '—');

function CobranzasPage() {
  const { user } = useAuthContext();
  const router = useRouter();
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

  const items = q.data || [];
  const totalPendiente = items.reduce((a, i) => a + (i.pendiente || 0), 0);

  return (
    <DashboardLayout title="Control de Obra — Cobranzas">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h4" mb={1}>Control de Obra</Typography>
        <CarteraNav />

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">Pendiente de cobro (todas las obras)</Typography>
            <Typography variant="h6" color="warning.main">{fmt(totalPendiente)}</Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="overline">Cuotas a cobrar</Typography>
            {q.isLoading && <LinearProgress sx={{ mt: 1 }} />}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Obra</TableCell>
                  <TableCell>Concepto</TableCell>
                  <TableCell>Vencimiento</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Pendiente</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.cuota_id} hover>
                    <TableCell>{i.obra_titulo || '(sin título)'}</TableCell>
                    <TableCell>{i.descripcion || '—'}</TableCell>
                    <TableCell>{fecha(i.fecha_vencimiento)}</TableCell>
                    <TableCell><Chip size="small" label={i.estado} color={i.estado === 'cobrada_parcial' ? 'info' : 'warning'} /></TableCell>
                    <TableCell align="right">{fmt(i.pendiente)}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => router.push(`/control-obra/${i.obra_id}`)}>Ver obra</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!q.isLoading && items.length === 0 && (
                  <TableRow><TableCell colSpan={6}><Typography variant="body2" color="text.secondary">No hay cuotas pendientes.</Typography></TableCell></TableRow>
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
