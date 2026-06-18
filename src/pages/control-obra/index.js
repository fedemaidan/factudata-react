import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Card, CardContent, Chip, Container, LinearProgress, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import ControlObraService from 'src/services/controlObra/controlObraService';
import CarteraNav from 'src/components/controlObra/CarteraNav';
import NuevaObraDialog from 'src/components/controlObra/NuevaObraDialog';

const fmt = (n) => (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

function MisObrasPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState(null);
  const [nuevaObra, setNuevaObra] = useState(false);

  useEffect(() => {
    if (!user) return;
    getEmpresaDetailsFromUser(user).then((e) => setEmpresaId(e?.id || null)).catch(() => {});
  }, [user]);

  const carteraQ = useQuery({
    queryKey: ['control-obra', 'cartera', empresaId],
    queryFn: () => ControlObraService.resumenCartera(empresaId),
    enabled: !!empresaId,
  });

  const obras = carteraQ.data || [];
  const totalContrato = obras.reduce((a, o) => a + (o.total_contrato || 0), 0);
  const totalCobrado = obras.reduce((a, o) => a + (o.cobrado || 0), 0);
  const totalPendiente = obras.reduce((a, o) => a + (o.pendiente || 0), 0);

  return (
    <DashboardLayout title="Control de Obra">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h4">Control de Obra</Typography>
          <Button variant="contained" onClick={() => setNuevaObra(true)} disabled={!empresaId}>Nueva obra</Button>
        </Stack>
        <CarteraNav />

        {/* KPIs de cartera */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
          <Kpi label="Obras activas" value={obras.filter((o) => o.estado === 'activa').length} />
          <Kpi label="Contrato total" value={fmt(totalContrato)} />
          <Kpi label="Cobrado" value={fmt(totalCobrado)} color="success.main" />
          <Kpi label="Pendiente de cobro" value={fmt(totalPendiente)} color="warning.main" />
        </Stack>

        <Card>
          <CardContent>
            <Typography variant="overline">Obras</Typography>
            {carteraQ.isLoading && <LinearProgress sx={{ mt: 1 }} />}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Obra</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Contrato</TableCell>
                  <TableCell align="right">Avance</TableCell>
                  <TableCell align="right">Cobrado</TableCell>
                  <TableCell align="right">Pendiente</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {obras.map((o) => (
                  <TableRow
                    key={o._id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/control-obra/${o._id}`)}
                  >
                    <TableCell>{o.titulo || '(sin título)'}</TableCell>
                    <TableCell><Chip size="small" label={o.estado} color={o.estado === 'activa' ? 'info' : 'default'} /></TableCell>
                    <TableCell align="right">{fmt(o.total_contrato)}</TableCell>
                    <TableCell align="right" sx={{ minWidth: 120 }}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                        <Box sx={{ width: 60 }}><LinearProgress variant="determinate" value={Math.min(o.avance_pct, 100)} /></Box>
                        <span>{o.avance_pct}%</span>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{fmt(o.cobrado)}</TableCell>
                    <TableCell align="right">{fmt(o.pendiente)}</TableCell>
                  </TableRow>
                ))}
                {!carteraQ.isLoading && obras.length === 0 && (
                  <TableRow><TableCell colSpan={6}><Typography variant="body2" color="text.secondary">Sin obras todavía. Creá la primera.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Container>

      <NuevaObraDialog
        open={nuevaObra}
        onClose={() => setNuevaObra(false)}
        empresaId={empresaId}
        onCreated={(id) => { setNuevaObra(false); router.push(`/control-obra/${id}`); }}
      />
    </DashboardLayout>
  );
}

function Kpi({ label, value, color }) {
  return (
    <Card sx={{ flex: 1 }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h6" sx={{ color }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

export default MisObrasPage;
