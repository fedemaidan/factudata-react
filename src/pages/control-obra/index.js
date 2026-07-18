import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, CardContent, Chip, Container, LinearProgress, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
  IconButton, Menu, MenuItem, FormControlLabel, Switch,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ConfirmDialog from 'src/components/controlObra/ConfirmDialog';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import ControlObraService from 'src/services/controlObra/controlObraService';
import CarteraNav from 'src/components/controlObra/CarteraNav';
import NuevaObraDialog from 'src/components/controlObra/NuevaObraDialog';
import SinPermisoControlObra, { puedeVerControlObra } from 'src/components/controlObra/AccesoControlObra';
import { KpiCard, fmt } from 'src/components/controlObra/ui';

function MisObrasPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [empresaId, setEmpresaId] = useState(null);
  const [nuevaObra, setNuevaObra] = useState(false);
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [menu, setMenu] = useState({ anchor: null, obra: null }); // menú de acciones por obra
  const [confirmDel, setConfirmDel] = useState(null); // obra a eliminar (abre el diálogo)

  useEffect(() => {
    if (!user) return;
    getEmpresaDetailsFromUser(user).then((e) => setEmpresaId(e?.id || null)).catch(() => {});
  }, [user]);

  const carteraQ = useQuery({
    queryKey: ['control-obra', 'cartera', empresaId, verArchivadas],
    queryFn: () => ControlObraService.resumenCartera(empresaId, { incluir_archivadas: verArchivadas }),
    enabled: !!empresaId,
  });

  const refetchObras = () => queryClient.invalidateQueries({ queryKey: ['control-obra'] });
  const cerrarMenu = () => setMenu({ anchor: null, obra: null });
  const archivarMut = useMutation({ mutationFn: (o) => ControlObraService.archivarObra(o._id, empresaId), onSuccess: refetchObras });
  const desarchivarMut = useMutation({ mutationFn: (o) => ControlObraService.desarchivarObra(o._id, empresaId), onSuccess: refetchObras });
  const eliminarMut = useMutation({ mutationFn: (o) => ControlObraService.eliminarObra(o._id, empresaId), onSuccess: () => { refetchObras(); setConfirmDel(null); } });
  const onEliminar = (o) => { cerrarMenu(); setConfirmDel(o); };

  const obras = carteraQ.data || [];
  const totalContrato = obras.reduce((a, o) => a + (o.total_contrato || 0), 0);
  const totalCobrado = obras.reduce((a, o) => a + (o.cobrado || 0), 0);
  const totalPendiente = obras.reduce((a, o) => a + (o.pendiente || 0), 0);

  if (user && !puedeVerControlObra(user)) return <SinPermisoControlObra />;

  return (
    <DashboardLayout title="Control de Obra">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h4">Control de Obra</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControlLabel
              control={<Switch size="small" checked={verArchivadas} onChange={(e) => setVerArchivadas(e.target.checked)} />}
              label="Ver archivadas"
            />
            <Button variant="contained" onClick={() => setNuevaObra(true)} disabled={!empresaId}>Nueva obra</Button>
          </Stack>
        </Stack>
        <CarteraNav />

        {/* KPIs de cartera */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} useFlexGap flexWrap="wrap">
          <KpiCard label="Obras activas" value={obras.filter((o) => o.estado === 'activa').length} sub="en ejecución" />
          <KpiCard label="Contrato total" value={fmt(totalContrato)} sub="suma de obras" />
          <KpiCard label="Cobrado" value={fmt(totalCobrado)} color="success.main" sub="ingresado" />
          <KpiCard label="Pendiente de cobro" value={fmt(totalPendiente)} color="warning.main" sub="por cobrar" />
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
                  <TableCell align="right">Margen</TableCell>
                  <TableCell align="right" />
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
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: (o.margen ?? 0) >= 0 ? 'success.main' : 'error.main' }} />
                        <span style={{ color: (o.margen ?? 0) >= 0 ? undefined : '#d32f2f' }}>{fmt(o.margen)}</span>
                      </Stack>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={(e) => setMenu({ anchor: e.currentTarget, obra: o })}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!carteraQ.isLoading && obras.length === 0 && (
                  <TableRow><TableCell colSpan={8}><Typography variant="body2" color="text.secondary">Sin obras todavía. Creá la primera.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Container>

      <Menu anchorEl={menu.anchor} open={!!menu.anchor} onClose={cerrarMenu}>
        {menu.obra?.estado === 'archivada'
          ? <MenuItem onClick={() => { desarchivarMut.mutate(menu.obra); cerrarMenu(); }}>Desarchivar</MenuItem>
          : <MenuItem onClick={() => { archivarMut.mutate(menu.obra); cerrarMenu(); }}>Archivar</MenuItem>}
        <MenuItem onClick={() => onEliminar(menu.obra)} sx={{ color: 'error.main' }}>Eliminar</MenuItem>
      </Menu>

      <ConfirmDialog
        open={!!confirmDel}
        icon={<WarningAmberRoundedIcon color="error" />}
        title={`Eliminar "${confirmDel?.titulo || 'sin título'}"`}
        message="La obra se saca de la lista. Los gastos y cobros quedan en la caja (sin imputar a la obra) y los planes de cobro se desasocian."
        detail="No se toca la plata. Recuperable solo desde soporte."
        confirmLabel="Eliminar"
        confirmColor="error"
        loading={eliminarMut.isPending}
        onConfirm={() => eliminarMut.mutate(confirmDel)}
        onClose={() => setConfirmDel(null)}
      />

      <NuevaObraDialog
        open={nuevaObra}
        onClose={() => setNuevaObra(false)}
        empresaId={empresaId}
        onCreated={(id) => { setNuevaObra(false); router.push(`/control-obra/${id}`); }}
      />
    </DashboardLayout>
  );
}

export default MisObrasPage;
